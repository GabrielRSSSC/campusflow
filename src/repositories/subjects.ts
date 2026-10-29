import type { SQLiteDatabase } from 'expo-sqlite';

import type { Subject, SubjectInput, SubjectWithCounts } from '@/types';

export function listSubjects(db: SQLiteDatabase): Promise<SubjectWithCounts[]> {
  return db.getAllAsync<SubjectWithCounts>(
    `SELECT s.id, s.name, s.teacher, s.color,
            COUNT(a.id) AS total,
            COALESCE(SUM(a.status = 'pending'), 0) AS pending
     FROM subjects s
     LEFT JOIN activities a ON a.subject_id = s.id
     GROUP BY s.id
     ORDER BY s.name`,
  );
}

export function getSubject(db: SQLiteDatabase, id: number): Promise<Subject | null> {
  return db.getFirstAsync<Subject>('SELECT id, name, teacher, color FROM subjects WHERE id = ?', id);
}

/** Busca sem diferenciar maiúsculas/minúsculas (a coluna usa COLLATE NOCASE). */
export function findSubjectByName(db: SQLiteDatabase, name: string): Promise<Subject | null> {
  return db.getFirstAsync<Subject>('SELECT id, name, teacher, color FROM subjects WHERE name = ?', name.trim());
}

export async function createSubject(db: SQLiteDatabase, input: SubjectInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO subjects (name, teacher, color) VALUES (?, ?, ?)',
    input.name,
    input.teacher,
    input.color,
  );
  return result.lastInsertRowId;
}

export async function updateSubject(db: SQLiteDatabase, id: number, input: SubjectInput): Promise<boolean> {
  const result = await db.runAsync(
    'UPDATE subjects SET name = ?, teacher = ?, color = ? WHERE id = ?',
    input.name,
    input.teacher,
    input.color,
    id,
  );
  return result.changes > 0;
}

/**
 * Exclui a disciplina. Com `deleteActivities`, as atividades vinculadas também são
 * excluídas; sem ele, a chave estrangeira (ON DELETE SET NULL) as deixa sem disciplina.
 */
export async function deleteSubject(db: SQLiteDatabase, id: number, deleteActivities: boolean): Promise<void> {
  await db.withTransactionAsync(async () => {
    if (deleteActivities) await db.runAsync('DELETE FROM activities WHERE subject_id = ?', id);
    await db.runAsync('DELETE FROM subjects WHERE id = ?', id);
  });
}

export async function countRecords(db: SQLiteDatabase): Promise<{ subjects: number; activities: number }> {
  const row = await db.getFirstAsync<{ subjects: number; activities: number }>(
    'SELECT (SELECT COUNT(*) FROM subjects) AS subjects, (SELECT COUNT(*) FROM activities) AS activities',
  );
  return row ?? { subjects: 0, activities: 0 };
}

/** Apaga disciplinas e atividades; as preferências são mantidas. */
export async function deleteAllAcademicData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM activities');
    await db.runAsync('DELETE FROM subjects');
  });
}
