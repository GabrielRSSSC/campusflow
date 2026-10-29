import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyDataChanged } from '@/database/changes';
import { seedDemoData } from '@/database/seed';
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  listActivityIdsBySubject,
  setActivityStatus,
  updateActivity,
} from '@/repositories/activities';
import { getPreferences, savePreferences } from '@/repositories/settings';
import {
  createSubject,
  deleteAllAcademicData,
  deleteSubject,
  findSubjectByName,
  updateSubject,
} from '@/repositories/subjects';
import {
  cancelAllReminders,
  cancelReminder,
  MAX_SCHEDULED,
  requestPermission,
  scheduleReminder,
} from '@/services/notifications';
import type { Activity, ActivityInput, Preferences, Status, SubjectInput } from '@/types';
import { toDbDateTime } from '@/utils/date';
import { ValidationError } from '@/utils/validation';

// Toda gravação passa por aqui: grava no SQLite, ajusta os lembretes e avisa as telas.
// Falhas de notificação não desfazem a gravação; ficam só registradas no console.

async function tryReminder<T>(task: () => Promise<T>): Promise<T | null> {
  try {
    return await task();
  } catch (error) {
    console.warn('[lembretes]', error);
    return null;
  }
}

async function refreshReminder(db: SQLiteDatabase, activityId: number): Promise<Date | null> {
  const [preferences, activity] = await Promise.all([getPreferences(db), getActivity(db, activityId)]);
  if (!preferences.remindersEnabled || !activity) {
    await cancelReminder(activityId);
    return null;
  }
  return scheduleReminder(activity, preferences.reminderLeadMinutes);
}

/** Recria todos os lembretes a partir do banco (usado em operações em lote). */
async function syncAllReminders(db: SQLiteDatabase): Promise<void> {
  await cancelAllReminders();
  const preferences = await getPreferences(db);
  if (!preferences.remindersEnabled) return;
  const upcoming = await listActivities(db, {
    status: 'pending',
    from: toDbDateTime(new Date()),
    limit: MAX_SCHEDULED,
  });
  for (const activity of upcoming) await scheduleReminder(activity, preferences.reminderLeadMinutes);
}

export async function saveActivity(
  db: SQLiteDatabase,
  input: ActivityInput,
  id?: number,
): Promise<{ id: number; reminderAt: Date | null }> {
  let activityId: number;
  if (id === undefined) {
    activityId = await createActivity(db, input);
  } else {
    if (!(await updateActivity(db, id, input))) throw new Error('Esta atividade não existe mais.');
    activityId = id;
  }
  const reminderAt = await tryReminder(() => refreshReminder(db, activityId));
  notifyDataChanged();
  return { id: activityId, reminderAt };
}

export async function toggleActivityStatus(db: SQLiteDatabase, activity: Pick<Activity, 'id' | 'status'>): Promise<Status> {
  const status: Status = activity.status === 'done' ? 'pending' : 'done';
  await setActivityStatus(db, activity.id, status);
  await tryReminder(() => refreshReminder(db, activity.id));
  notifyDataChanged();
  return status;
}

export async function removeActivity(db: SQLiteDatabase, id: number): Promise<void> {
  await deleteActivity(db, id);
  await tryReminder(() => cancelReminder(id));
  notifyDataChanged();
}

export async function saveSubject(db: SQLiteDatabase, input: SubjectInput, id?: number): Promise<number> {
  const duplicate = await findSubjectByName(db, input.name);
  if (duplicate && duplicate.id !== id) {
    throw new ValidationError<SubjectInput>({ name: 'Já existe uma disciplina com esse nome.' });
  }
  let subjectId: number;
  if (id === undefined) {
    subjectId = await createSubject(db, input);
  } else {
    if (!(await updateSubject(db, id, input))) throw new Error('Esta disciplina não existe mais.');
    subjectId = id;
  }
  notifyDataChanged();
  return subjectId;
}

export async function removeSubject(db: SQLiteDatabase, id: number, deleteActivities: boolean): Promise<void> {
  const affected = deleteActivities ? await listActivityIdsBySubject(db, id) : [];
  await deleteSubject(db, id, deleteActivities);
  await tryReminder(() => Promise.all(affected.map(cancelReminder)));
  notifyDataChanged();
}

export async function loadDemoData(db: SQLiteDatabase) {
  const result = await seedDemoData(db);
  await tryReminder(() => syncAllReminders(db));
  notifyDataChanged();
  return result;
}

export async function clearAllData(db: SQLiteDatabase): Promise<void> {
  await deleteAllAcademicData(db);
  await tryReminder(cancelAllReminders);
  notifyDataChanged();
}

export async function updatePreferences(db: SQLiteDatabase, changes: Partial<Preferences>): Promise<void> {
  await savePreferences(db, changes);
  if ('remindersEnabled' in changes || 'reminderLeadMinutes' in changes) {
    await tryReminder(() => syncAllReminders(db));
  }
  notifyDataChanged();
}

/** Ativa os lembretes pedindo permissão; retorna `false` se o usuário negar. */
export async function enableReminders(db: SQLiteDatabase): Promise<boolean> {
  if (!(await requestPermission())) return false;
  await updatePreferences(db, { remindersEnabled: true });
  return true;
}
