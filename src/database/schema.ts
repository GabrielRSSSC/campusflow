import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'campusflow.db';
const DATABASE_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 60),
  teacher TEXT CHECK (teacher IS NULL OR length(teacher) <= 80),
  color TEXT NOT NULL CHECK (color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  subject_id INTEGER REFERENCES subjects (id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('exam', 'assignment', 'exercise', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  due_at TEXT NOT NULL CHECK (due_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]'),
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_activities_due_at ON activities (due_at);
CREATE INDEX IF NOT EXISTS idx_activities_subject_id ON activities (subject_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export async function getSqliteVersion(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ version: string }>('SELECT sqlite_version() AS version');
  return row?.version ?? '?';
}

/** Executado pelo SQLiteProvider a cada abertura do banco. */
export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  // foreign_keys vale por conexão, por isso é ativado sempre.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(SCHEMA_V1);
    // Migrações futuras: `if (version < 2) { ... }`
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}
