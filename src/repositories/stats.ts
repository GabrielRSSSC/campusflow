import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryStat, SubjectStat, Summary } from '@/types';
import { addDays, toDbDateTime } from '@/utils/date';

export async function getSummary(db: SQLiteDatabase, now = new Date()): Promise<Summary> {
  const current = toDbDateTime(now);
  const row = await db.getFirstAsync<Summary>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'done'), 0) AS done,
            COALESCE(SUM(status = 'pending'), 0) AS pending,
            COALESCE(SUM(status = 'pending' AND due_at < ?), 0) AS overdue,
            COALESCE(SUM(status = 'pending' AND due_at >= ? AND due_at < ?), 0) AS dueSoon
     FROM activities`,
    current,
    current,
    toDbDateTime(addDays(now, 7)),
  );
  return row ?? { total: 0, done: 0, pending: 0, overdue: 0, dueSoon: 0 };
}

/** Um grupo por disciplina com atividades; `subjectId` nulo agrupa as atividades sem disciplina. */
export function getSubjectStats(db: SQLiteDatabase, now = new Date()): Promise<SubjectStat[]> {
  return db.getAllAsync<SubjectStat>(
    `SELECT a.subject_id AS subjectId, s.name, s.color,
            COUNT(*) AS total,
            SUM(a.status = 'done') AS done,
            SUM(a.status = 'pending' AND a.due_at < ?) AS overdue
     FROM activities a
     LEFT JOIN subjects s ON s.id = a.subject_id
     GROUP BY a.subject_id
     ORDER BY total DESC, s.name`,
    toDbDateTime(now),
  );
}

export function getCategoryStats(db: SQLiteDatabase): Promise<CategoryStat[]> {
  return db.getAllAsync<CategoryStat>(
    `SELECT category, COUNT(*) AS total, SUM(status = 'done') AS done
     FROM activities
     GROUP BY category
     ORDER BY total DESC, category`,
  );
}
