import type { SQLiteDatabase } from 'expo-sqlite';

import { createActivity } from '@/repositories/activities';
import type { Category, Priority, Status, SubjectInput } from '@/types';
import { addDays, toDbDateTime } from '@/utils/date';

const DEMO_SUBJECTS: SubjectInput[] = [
  { name: 'Cálculo II', teacher: 'Marina Lopes', color: '#2563EB' },
  { name: 'Estruturas de Dados', teacher: 'Ricardo Alves', color: '#7C3AED' },
  { name: 'Engenharia de Software', teacher: 'Juliana Costa', color: '#0D9488' },
  { name: 'Banco de Dados', teacher: 'André Souza', color: '#EA580C' },
  { name: 'Física Experimental', teacher: null, color: '#DB2777' },
];

interface DemoActivity {
  /** Índice em DEMO_SUBJECTS ou `null` para atividade sem disciplina. */
  subject: number | null;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  /** Dias a partir de hoje e horário do prazo. */
  days: number;
  time: string;
}

const DEMO_ACTIVITIES: DemoActivity[] = [
  { subject: 0, title: 'Lista 4 — Integrais duplas', description: 'Exercícios 1 a 15 do capítulo 15.', category: 'exercise', priority: 'medium', status: 'pending', days: -2, time: '23:59' },
  { subject: 3, title: 'Modelo ER da biblioteca', description: 'Diagrama entidade-relacionamento com cardinalidades e dicionário de dados.', category: 'assignment', priority: 'high', status: 'pending', days: -1, time: '18:00' },
  { subject: 1, title: 'Revisar árvores AVL', description: 'Rotações simples e duplas; refazer os exemplos da aula.', category: 'other', priority: 'medium', status: 'pending', days: 0, time: '23:30' },
  { subject: 2, title: 'Entrega do protótipo navegável', description: 'Protótipo das telas principais e link para o repositório.', category: 'assignment', priority: 'high', status: 'pending', days: 2, time: '23:59' },
  { subject: 1, title: 'Exercícios de complexidade (Big-O)', description: '', category: 'exercise', priority: 'low', status: 'pending', days: 3, time: '20:00' },
  { subject: 0, title: 'Prova 2 — Séries e integrais', description: 'Conteúdo: capítulos 11 a 15. Levar calculadora científica.', category: 'exam', priority: 'high', status: 'pending', days: 5, time: '08:00' },
  { subject: 4, title: 'Relatório: pêndulo simples', description: 'Tabela de medidas, gráfico T² × L e análise de incertezas.', category: 'assignment', priority: 'medium', status: 'pending', days: 7, time: '12:00' },
  { subject: 2, title: 'Leitura: Guia do Scrum', description: 'Ler e trazer dúvidas para a aula.', category: 'other', priority: 'low', status: 'pending', days: 9, time: '18:00' },
  { subject: 3, title: 'Prova 1 — SQL e normalização', description: 'Consultas com JOIN, agregações e formas normais.', category: 'exam', priority: 'high', status: 'pending', days: 12, time: '10:00' },
  { subject: null, title: 'Renovar matrícula do semestre', description: 'Conferir as disciplinas no portal do aluno.', category: 'other', priority: 'medium', status: 'pending', days: 15, time: '17:00' },
  { subject: 1, title: 'Prova 1 — Listas e pilhas', description: '', category: 'exam', priority: 'high', status: 'done', days: -14, time: '19:00' },
  { subject: 0, title: 'Lista 3 — Derivadas parciais', description: '', category: 'exercise', priority: 'medium', status: 'done', days: -9, time: '23:59' },
  { subject: 2, title: 'Documento de requisitos', description: 'Requisitos funcionais, não funcionais e casos de uso.', category: 'assignment', priority: 'high', status: 'done', days: -6, time: '23:59' },
  { subject: 4, title: 'Pré-relatório: queda livre', description: '', category: 'assignment', priority: 'low', status: 'done', days: -4, time: '14:00' },
  { subject: 3, title: 'Exercícios de álgebra relacional', description: '', category: 'exercise', priority: 'medium', status: 'done', days: -3, time: '22:00' },
];

export const DEMO_COUNTS = { subjects: DEMO_SUBJECTS.length, activities: DEMO_ACTIVITIES.length };

export async function hasDemoData(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM activities WHERE is_demo = 1');
  return (row?.count ?? 0) > 0;
}

/**
 * Insere os dados de demonstração sem tocar nos registros do usuário: disciplinas com o
 * mesmo nome são reaproveitadas e só as atividades marcadas como demonstração são recriadas.
 */
export async function seedDemoData(
  db: SQLiteDatabase,
  now = new Date(),
): Promise<{ subjectsCreated: number; activitiesCreated: number }> {
  let subjectsCreated = 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM activities WHERE is_demo = 1');

    const subjectIds: number[] = [];
    for (const subject of DEMO_SUBJECTS) {
      const inserted = await db.runAsync(
        'INSERT INTO subjects (name, teacher, color) VALUES (?, ?, ?) ON CONFLICT (name) DO NOTHING',
        subject.name,
        subject.teacher,
        subject.color,
      );
      subjectsCreated += inserted.changes;
      const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM subjects WHERE name = ?', subject.name);
      if (!row) throw new Error(`Disciplina de demonstração ausente: ${subject.name}`);
      subjectIds.push(row.id);
    }

    for (const activity of DEMO_ACTIVITIES) {
      const [hours, minutes] = activity.time.split(':').map(Number);
      const day = addDays(now, activity.days);
      day.setHours(hours, minutes, 0, 0);
      await createActivity(
        db,
        {
          title: activity.title,
          description: activity.description,
          subjectId: activity.subject === null ? null : subjectIds[activity.subject],
          category: activity.category,
          priority: activity.priority,
          status: activity.status,
          dueAt: toDbDateTime(day),
        },
        true,
      );
    }
  });
  return { subjectsCreated, activitiesCreated: DEMO_ACTIVITIES.length };
}
