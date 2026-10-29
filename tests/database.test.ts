import assert from 'node:assert/strict';
import { test } from 'node:test';

import { migrateDb } from '@/database/schema';
import { DEMO_COUNTS, hasDemoData, seedDemoData } from '@/database/seed';
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  setActivityStatus,
  updateActivity,
} from '@/repositories/activities';
import { DEFAULT_PREFERENCES, getPreferences, savePreferences } from '@/repositories/settings';
import { getCategoryStats, getSubjectStats, getSummary } from '@/repositories/stats';
import {
  countRecords,
  createSubject,
  deleteAllAcademicData,
  deleteSubject,
  findSubjectByName,
  getSubject,
  listSubjects,
} from '@/repositories/subjects';
import type { ActivityFilters, ActivityInput, Category } from '@/types';
import { toDbDateTime } from '@/utils/date';

import { openTestDb } from './node-sqlite';

const NOW = new Date(2026, 9, 29, 12, 0); // quinta-feira, 29/10/2026 12:00

const base: ActivityInput = {
  title: 'Lista de exercícios',
  description: '',
  subjectId: null,
  category: 'exercise',
  priority: 'medium',
  status: 'pending',
  dueAt: '2026-11-05T18:00',
};

async function freshDb() {
  const db = openTestDb();
  await migrateDb(db);
  return db;
}

const subject = (name: string) => ({ name, teacher: null, color: '#2563EB' });

/** Cenário usado nos testes de filtros e estatísticas. */
async function seedScenario() {
  const db = await freshDb();
  const calc = await createSubject(db, subject('Cálculo'));
  const bd = await createSubject(db, subject('Banco de Dados'));
  await createActivity(db, { ...base, title: 'Atrasada', dueAt: '2026-10-28T10:00', subjectId: calc, priority: 'high', category: 'exam' });
  await createActivity(db, { ...base, title: 'Amanhã', dueAt: '2026-10-30T10:00', subjectId: bd, priority: 'low', category: 'assignment' });
  await createActivity(db, { ...base, title: 'Feita', dueAt: '2026-10-20T10:00', subjectId: calc, status: 'done' });
  await createActivity(db, { ...base, title: 'Sem disciplina', dueAt: '2026-11-15T09:00' });
  return { db, calc, bd };
}

test('migração cria o esquema, é idempotente e ativa as chaves estrangeiras', async () => {
  const db = openTestDb();
  await migrateDb(db);
  await createSubject(db, subject('Física'));
  await migrateDb(db); // reabrir o app não recria nem apaga dados

  assert.deepEqual(await db.getFirstAsync('PRAGMA user_version'), { user_version: 1 });
  assert.deepEqual(await db.getFirstAsync('PRAGMA foreign_keys'), { foreign_keys: 1 });
  assert.equal((await listSubjects(db)).length, 1);
  await assert.rejects(createActivity(db, { ...base, subjectId: 999 }), /FOREIGN KEY/);
});

test('CRUD de atividades: criar, ler, editar sem trocar o id, concluir, reabrir e excluir', async () => {
  const db = await freshDb();
  const subjectId = await createSubject(db, subject('Cálculo II'));
  const id = await createActivity(db, { ...base, subjectId });

  const created = await getActivity(db, id);
  assert.equal(created?.title, base.title);
  assert.equal(created?.subjectName, 'Cálculo II');
  assert.equal(created?.status, 'pending');

  assert.equal(await updateActivity(db, id, { ...base, subjectId, title: 'Lista 5', priority: 'high' }), true);
  const edited = await getActivity(db, id);
  assert.equal(edited?.id, id);
  assert.equal(edited?.title, 'Lista 5');
  assert.equal(edited?.priority, 'high');

  await setActivityStatus(db, id, 'done');
  assert.equal((await getActivity(db, id))?.status, 'done');
  await setActivityStatus(db, id, 'pending');
  assert.equal((await getActivity(db, id))?.status, 'pending');

  await deleteActivity(db, id);
  assert.equal(await getActivity(db, id), null);
  assert.equal(await updateActivity(db, id, base), false);
});

test('filtros por status, prioridade, disciplina e período, com ordenação por prazo', async () => {
  const { db, calc } = await seedScenario();
  const titles = async (filters: ActivityFilters) =>
    (await listActivities(db, filters, NOW)).map((activity) => activity.title);

  assert.deepEqual(await titles({}), ['Feita', 'Atrasada', 'Amanhã', 'Sem disciplina']);
  assert.deepEqual(await titles({ sort: 'desc' }), ['Sem disciplina', 'Amanhã', 'Atrasada', 'Feita']);
  assert.deepEqual(await titles({ status: 'pending' }), ['Atrasada', 'Amanhã', 'Sem disciplina']);
  assert.deepEqual(await titles({ status: 'overdue' }), ['Atrasada']);
  assert.deepEqual(await titles({ status: 'done' }), ['Feita']);
  assert.deepEqual(await titles({ priority: 'high' }), ['Atrasada']);
  assert.deepEqual(await titles({ subjectId: calc }), ['Feita', 'Atrasada']);
  assert.deepEqual(await titles({ subjectId: null }), ['Sem disciplina']);
  assert.deepEqual(await titles({ status: 'pending', subjectId: calc, priority: 'high' }), ['Atrasada']);
  assert.deepEqual(await titles({ from: '2026-10-01T00:00', to: '2026-11-01T00:00' }), ['Feita', 'Atrasada', 'Amanhã']);
  assert.deepEqual(await titles({ status: 'pending', from: toDbDateTime(NOW), limit: 1 }), ['Amanhã']);
});

test('indicadores e resumos são calculados a partir do banco', async () => {
  const empty = await freshDb();
  assert.deepEqual(await getSummary(empty, NOW), { total: 0, done: 0, pending: 0, overdue: 0, dueSoon: 0 });

  const { db, calc, bd } = await seedScenario();
  assert.deepEqual(await getSummary(db, NOW), { total: 4, done: 1, pending: 3, overdue: 1, dueSoon: 1 });
  assert.deepEqual(await getSubjectStats(db, NOW), [
    { subjectId: calc, name: 'Cálculo', color: '#2563EB', total: 2, done: 1, overdue: 1 },
    { subjectId: null, name: null, color: null, total: 1, done: 0, overdue: 0 },
    { subjectId: bd, name: 'Banco de Dados', color: '#2563EB', total: 1, done: 0, overdue: 0 },
  ]);
  assert.deepEqual(await getCategoryStats(db), [
    { category: 'exercise', total: 2, done: 1 },
    { category: 'assignment', total: 1, done: 0 },
    { category: 'exam', total: 1, done: 0 },
  ]);
  assert.deepEqual(
    (await listSubjects(db)).map(({ name, total, pending }) => ({ name, total, pending })),
    [
      { name: 'Banco de Dados', total: 1, pending: 1 },
      { name: 'Cálculo', total: 2, pending: 1 },
    ],
  );
});

test('excluir disciplina: manter as atividades sem disciplina ou excluí-las juntas', async () => {
  const db = await freshDb();
  const keep = await createSubject(db, subject('Manter'));
  const drop = await createSubject(db, subject('Excluir'));
  const kept = await createActivity(db, { ...base, subjectId: keep });
  const dropped = await createActivity(db, { ...base, subjectId: drop });

  await deleteSubject(db, keep, false);
  assert.equal((await getActivity(db, kept))?.subjectId, null);

  await deleteSubject(db, drop, true);
  assert.equal(await getActivity(db, dropped), null);
  assert.deepEqual(await countRecords(db), { subjects: 0, activities: 1 });
});

test('restrições do banco rejeitam dados inválidos', async () => {
  const db = await freshDb();
  await createSubject(db, subject('Cálculo II'));
  await assert.rejects(createSubject(db, subject('cálculo ii')), /UNIQUE/);
  assert.equal((await findSubjectByName(db, '  cálculo ii '))?.name, 'Cálculo II');
  await assert.rejects(createSubject(db, { name: 'Química', teacher: null, color: 'azul' }), /CHECK/);
  await assert.rejects(createActivity(db, { ...base, title: '   ' }), /CHECK/);
  await assert.rejects(createActivity(db, { ...base, category: 'quiz' as Category }), /CHECK/);
  await assert.rejects(createActivity(db, { ...base, dueAt: '05/11/2026 18:00' }), /CHECK/);
});

test('dados de demonstração não duplicam e preservam os dados do usuário', async () => {
  const db = await freshDb();
  const mine = await createSubject(db, { name: 'Cálculo II', teacher: 'Minha turma', color: '#000000' });
  const myActivity = await createActivity(db, { ...base, title: 'Minha atividade', subjectId: mine });
  assert.equal(await hasDemoData(db), false);

  const first = await seedDemoData(db, NOW);
  assert.equal(first.subjectsCreated, DEMO_COUNTS.subjects - 1); // reaproveita "Cálculo II"
  const second = await seedDemoData(db, NOW);
  assert.equal(second.subjectsCreated, 0);

  assert.equal(await hasDemoData(db), true);
  assert.deepEqual(await countRecords(db), {
    subjects: DEMO_COUNTS.subjects,
    activities: DEMO_COUNTS.activities + 1,
  });
  assert.equal((await getActivity(db, myActivity))?.title, 'Minha atividade');
  assert.equal((await getSubject(db, mine))?.teacher, 'Minha turma');

  const summary = await getSummary(db, NOW);
  assert.equal(summary.total, DEMO_COUNTS.activities + 1);
  assert.equal(summary.done, 5);
  assert.equal(summary.overdue, 2);
});

test('preferências têm valores padrão e apagar dados preserva as preferências', async () => {
  const db = await freshDb();
  assert.deepEqual(await getPreferences(db), DEFAULT_PREFERENCES);

  await savePreferences(db, { userName: 'Ana', remindersEnabled: true, reminderLeadMinutes: 60 });
  await savePreferences(db, { remindersEnabled: false });
  assert.deepEqual(await getPreferences(db), { userName: 'Ana', remindersEnabled: false, reminderLeadMinutes: 60 });

  await seedDemoData(db, NOW);
  await deleteAllAcademicData(db);
  assert.deepEqual(await countRecords(db), { subjects: 0, activities: 0 });
  assert.equal((await getPreferences(db)).userName, 'Ana');
});
