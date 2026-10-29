import type { SQLiteDatabase } from 'expo-sqlite';

import type { Preferences } from '@/types';

export const DEFAULT_PREFERENCES: Preferences = {
  userName: '',
  remindersEnabled: false,
  reminderLeadMinutes: 1440,
};

export async function getPreferences(db: SQLiteDatabase): Promise<Preferences> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const lead = Number(stored.get('reminderLeadMinutes'));
  return {
    userName: stored.get('userName') ?? DEFAULT_PREFERENCES.userName,
    remindersEnabled: stored.has('remindersEnabled')
      ? stored.get('remindersEnabled') === '1'
      : DEFAULT_PREFERENCES.remindersEnabled,
    reminderLeadMinutes: Number.isFinite(lead) ? lead : DEFAULT_PREFERENCES.reminderLeadMinutes,
  };
}

export async function savePreferences(db: SQLiteDatabase, changes: Partial<Preferences>): Promise<void> {
  const entries = Object.entries(changes).map(([key, value]) => [
    key,
    typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
  ]);
  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
        key,
        value,
      );
    }
  });
}
