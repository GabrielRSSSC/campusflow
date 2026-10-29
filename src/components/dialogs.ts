import type { SQLiteDatabase } from 'expo-sqlite';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { toast } from '@/components/Toast';
import { removeActivity, removeSubject, toggleActivityStatus } from '@/services/actions';
import type { Activity, Subject } from '@/types';

// Diálogos nativos reutilizados pelas telas: toda exclusão pede confirmação.

export function showError(error: unknown, title = 'Não foi possível concluir') {
  Alert.alert(title, error instanceof Error ? error.message : String(error));
}

export async function toggleWithFeedback(db: SQLiteDatabase, activity: Pick<Activity, 'id' | 'status'>) {
  try {
    const status = await toggleActivityStatus(db, activity);
    toast(status === 'done' ? 'Atividade concluída' : 'Atividade reaberta');
  } catch (error) {
    showError(error);
  }
}

export function confirmDeleteActivity(
  db: SQLiteDatabase,
  activity: Pick<Activity, 'id' | 'title'>,
  onConfirm?: () => void,
) {
  Alert.alert('Excluir atividade?', `"${activity.title}" será removida permanentemente.`, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Excluir',
      style: 'destructive',
      onPress: async () => {
        onConfirm?.();
        try {
          await removeActivity(db, activity.id);
          toast('Atividade excluída');
        } catch (error) {
          showError(error);
        }
      },
    },
  ]);
}

export function showActivityMenu(db: SQLiteDatabase, activity: Pick<Activity, 'id' | 'title'>) {
  Alert.alert(
    activity.title,
    undefined,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Editar',
        onPress: () => router.push({ pathname: '/activity/form', params: { id: String(activity.id) } }),
      },
      { text: 'Excluir', style: 'destructive', onPress: () => confirmDeleteActivity(db, activity) },
    ],
    { cancelable: true },
  );
}

/**
 * Exclusão com tratamento das atividades vinculadas: o usuário escolhe mantê-las
 * (ficam sem disciplina) ou excluí-las junto.
 */
export function confirmDeleteSubject(
  db: SQLiteDatabase,
  subject: Pick<Subject, 'id' | 'name'> & { total: number },
  onDeleted?: () => void,
) {
  const run = async (deleteActivities: boolean) => {
    try {
      await removeSubject(db, subject.id, deleteActivities);
      toast(deleteActivities ? 'Disciplina e atividades excluídas' : 'Disciplina excluída');
      onDeleted?.();
    } catch (error) {
      showError(error);
    }
  };

  if (subject.total === 0) {
    Alert.alert('Excluir disciplina?', `"${subject.name}" será removida.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => run(false) },
    ]);
    return;
  }

  const plural = subject.total === 1 ? 'atividade vinculada' : 'atividades vinculadas';
  Alert.alert(
    'Excluir disciplina?',
    `"${subject.name}" tem ${subject.total} ${plural}. O que deseja fazer com ${subject.total === 1 ? 'ela' : 'elas'}?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Manter sem disciplina', onPress: () => run(false) },
      { text: 'Excluir tudo', style: 'destructive', onPress: () => run(true) },
    ],
  );
}

export function showSubjectMenu(db: SQLiteDatabase, subject: Pick<Subject, 'id' | 'name'> & { total: number }) {
  Alert.alert(
    subject.name,
    undefined,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Editar',
        onPress: () => router.push({ pathname: '/subject/form', params: { id: String(subject.id) } }),
      },
      { text: 'Excluir', style: 'destructive', onPress: () => confirmDeleteSubject(db, subject) },
    ],
    { cancelable: true },
  );
}
