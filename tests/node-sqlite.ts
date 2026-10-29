import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

/**
 * Banco SQLite real (node:sqlite, em memória) com o subconjunto da API do expo-sqlite
 * usado pelos repositórios. Permite testar o SQL do app sem celular.
 */
export function openTestDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  // expo-sqlite aceita (sql, [valores]) ou (sql, ...valores)
  const bind = (args: unknown[]) => (args.length === 1 && Array.isArray(args[0]) ? args[0] : args) as SQLInputValue[];
  const plain = <T>(row: T) => (row ? { ...row } : null);

  const db = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...args: unknown[]) => {
      const result = raw.prepare(sql).run(...bind(args));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getFirstAsync: async (sql: string, ...args: unknown[]) => plain(raw.prepare(sql).get(...bind(args))),
    getAllAsync: async (sql: string, ...args: unknown[]) => raw.prepare(sql).all(...bind(args)).map(plain),
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}
