import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ActivityInput } from '@/types';
import {
  describeDue,
  getMonthGrid,
  greeting,
  isOverdue,
  isValidDbDateTime,
  parseDbDateTime,
  toDbDateTime,
} from '@/utils/date';
import { hasErrors, validateActivity, validateSubject } from '@/utils/validation';

const NOW = new Date(2026, 9, 29, 14, 0); // quinta-feira, 29/10/2026 14:00

test('prazos em horário local: conversão de ida e volta e datas inválidas', () => {
  const date = new Date(2026, 1, 3, 9, 5);
  assert.equal(toDbDateTime(date), '2026-02-03T09:05');
  assert.equal(parseDbDateTime('2026-02-03T09:05').getTime(), date.getTime());
  assert.equal(isValidDbDateTime('2026-02-03T09:05'), true);
  assert.equal(isValidDbDateTime('2026-02-30T10:00'), false);
  assert.equal(isValidDbDateTime('2026-02-03T24:00'), false);
  assert.equal(isValidDbDateTime('03/02/2026 09:05'), false);
});

test('atraso considera status, data e horário', () => {
  assert.equal(isOverdue({ status: 'pending', dueAt: '2026-10-29T13:59' }, NOW), true);
  assert.equal(isOverdue({ status: 'pending', dueAt: '2026-10-29T14:00' }, NOW), false);
  assert.equal(isOverdue({ status: 'done', dueAt: '2026-10-01T10:00' }, NOW), false);
});

test('descrição relativa do prazo', () => {
  const due = (dueAt: string, status: 'pending' | 'done' = 'pending') => describeDue(dueAt, status, NOW);
  assert.deepEqual(due('2026-10-29T18:30'), { label: 'Hoje, 18:30', tone: 'soon' });
  assert.deepEqual(due('2026-10-30T08:00'), { label: 'Amanhã, 08:00', tone: 'soon' });
  assert.deepEqual(due('2026-11-02T10:00'), { label: 'Seg, 10:00', tone: 'normal' });
  assert.deepEqual(due('2026-11-20T10:00'), { label: '20 nov, 10:00', tone: 'normal' });
  assert.deepEqual(due('2027-01-05T10:00'), { label: '5 jan 2027, 10:00', tone: 'normal' });
  assert.deepEqual(due('2026-10-29T13:20'), { label: 'Atrasada há 40 min', tone: 'overdue' });
  assert.deepEqual(due('2026-10-29T09:00'), { label: 'Atrasada há 5 h', tone: 'overdue' });
  assert.deepEqual(due('2026-10-27T10:00'), { label: 'Atrasada há 2 dias', tone: 'overdue' });
  assert.deepEqual(due('2026-10-27T10:00', 'done'), { label: '27 out, 10:00', tone: 'done' });
});

test('grade do calendário tem 6 semanas começando no domingo', () => {
  const october = getMonthGrid(new Date(2026, 9, 15));
  assert.equal(october.length, 6);
  assert.ok(october.every((week) => week.length === 7));
  assert.equal(october[0][3], null);
  assert.equal(october[0][4]?.getDate(), 1); // 01/10/2026 é quinta-feira
  assert.equal(october.flat().filter(Boolean).length, 31);

  const february = getMonthGrid(new Date(2026, 1, 1));
  assert.equal(february[0][0]?.getDate(), 1); // 01/02/2026 é domingo
  assert.equal(february.flat().filter(Boolean).length, 28);
});

test('saudação conforme o horário', () => {
  assert.equal(greeting(new Date(2026, 9, 29, 8)), 'Bom dia');
  assert.equal(greeting(new Date(2026, 9, 29, 14)), 'Boa tarde');
  assert.equal(greeting(new Date(2026, 9, 29, 21)), 'Boa noite');
  assert.equal(greeting(new Date(2026, 9, 29, 2)), 'Boa noite');
});

test('validação do formulário de atividade', () => {
  const valid: ActivityInput = {
    title: 'Prova 2',
    description: '',
    subjectId: null,
    category: 'exam',
    priority: 'high',
    status: 'pending',
    dueAt: '2026-11-05T19:00',
  };
  assert.equal(hasErrors(validateActivity(valid)), false);

  const errors = validateActivity({ ...valid, title: '  ', dueAt: '2026-11-31T19:00' });
  assert.equal(errors.title, 'Informe um título para a atividade.');
  assert.equal(errors.dueAt, 'Escolha uma data e um horário válidos.');
  assert.match(validateActivity({ ...valid, title: 'ab' }).title ?? '', /pelo menos 3/);
  assert.match(validateActivity({ ...valid, title: 'x'.repeat(101) }).title ?? '', /máximo 100/);
  assert.match(validateActivity({ ...valid, description: 'x'.repeat(1001) }).description ?? '', /1000/);
});

test('validação do formulário de disciplina', () => {
  assert.equal(hasErrors(validateSubject({ name: 'Cálculo II', teacher: null, color: '#2563EB' })), false);
  const errors = validateSubject({ name: ' ', teacher: 'x'.repeat(81), color: 'azul' });
  assert.equal(errors.name, 'Informe o nome da disciplina.');
  assert.match(errors.teacher ?? '', /80/);
  assert.equal(errors.color, 'Escolha uma cor.');
});
