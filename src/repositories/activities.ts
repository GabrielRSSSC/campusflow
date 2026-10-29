import type { SQLiteDatabase } from 'expo-sqlite';

import type { Activity, ActivityFilters, ActivityInput, Status } from '@/types';
import { toDbDateTime } from '@/utils/date';

const SELECT_ACTIVITY = `
  SELECT a.id, a.title, a.description, a.subject_id AS subjectId, a.category, a.priority,
         a.status, a.due_at AS dueAt, a.created_at AS createdAt, a.updated_at AS updatedAt,
         s.name AS subjectName, s.color AS subjectColor
  FROM activities a
  LEFT JOIN subjects s ON s.id = a.subject_id`;

export function listActivities(
  db: SQLiteDatabase,
  filters: ActivityFilters = {},
  now = new Date(),
): Promise<Activity[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status === 'overdue') {
    where.push(`a.status = 'pending' AND a.due_at < ?`);
    params.push(toDbDateTime(now));
  } else if (filters.status) {
    where.push('a.status = ?');
    params.push(filters.status);
  }
  if (filters.priority) {
    where.push('a.priority = ?');
    params.push(filters.priority);
  }
  if (filters.subjectId === null) {
    where.push('a.subject_id IS NULL');
  } else if (filters.subjectId !== undefined) {
    where.push('a.subject_id = ?');
    params.push(filters.subjectId);
  }
  if (filters.from) {
    where.push('a.due_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('a.due_at < ?');
    params.push(filters.to);
  }

  // A direção vem de uma lista fixa, nunca do usuário: é seguro interpolar.
  const order = filters.sort === 'desc' ? 'DESC' : 'ASC';
  let sql = `${SELECT_ACTIVITY}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
    ORDER BY a.due_at ${order}, a.id ${order}`;
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  return db.getAllAsync<Activity>(sql, params);
}

export function getActivity(db: SQLiteDatabase, id: number): Promise<Activity | null> {
  return db.getFirstAsync<Activity>(`${SELECT_ACTIVITY} WHERE a.id = ?`, id);
}

export async function createActivity(
  db: SQLiteDatabase,
  input: ActivityInput,
  isDemo = false,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO activities (title, description, subject_id, category, priority, status, due_at, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.description,
    input.subjectId,
    input.category,
    input.priority,
    input.status,
    input.dueAt,
    isDemo ? 1 : 0,
  );
  return result.lastInsertRowId;
}

/** Retorna `false` se a atividade não existe mais. */
export async function updateActivity(db: SQLiteDatabase, id: number, input: ActivityInput): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE activities
     SET title = ?, description = ?, subject_id = ?, category = ?, priority = ?, status = ?, due_at = ?,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    input.title,
    input.description,
    input.subjectId,
    input.category,
    input.priority,
    input.status,
    input.dueAt,
    id,
  );
  return result.changes > 0;
}

export async function setActivityStatus(db: SQLiteDatabase, id: number, status: Status): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE activities SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    status,
    id,
  );
  return result.changes > 0;
}

export async function deleteActivity(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM activities WHERE id = ?', id);
}

export async function listActivityIdsBySubject(db: SQLiteDatabase, subjectId: number): Promise<number[]> {
  const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM activities WHERE subject_id = ?', subjectId);
  return rows.map((row) => row.id);
}
