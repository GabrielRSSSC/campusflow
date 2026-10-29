import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';

import { CATEGORIES } from '@/constants/options';
import type { Activity } from '@/types';
import { formatDateTime, parseDbDateTime } from '@/utils/date';

// O Expo Go avisa que não suporta push remoto; o app usa só notificações locais,
// que continuam disponíveis (limitação documentada no README).
LogBox.ignoreLogs([
  'functionality is not fully supported in Expo Go',
  'Push notifications (remote notifications) are unavailable in Expo Go',
]);

const CHANNEL_ID = 'deadlines';
/** O iOS mantém no máximo 64 notificações locais agendadas por app. */
export const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** Pede permissão apenas quando o usuário ativa os lembretes. */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // No Android 13+ o pedido de permissão só aparece depois que existe um canal.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Prazos acadêmicos',
      // eslint-disable-next-line import/namespace -- enum reexportado via `export *`; o TypeScript valida
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const reminderId = (activityId: number) => `activity-${activityId}`;

export async function cancelReminder(activityId: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderId(activityId));
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Agenda (ou reagenda) o lembrete de uma atividade. Retorna o horário agendado ou `null`
 * quando não há o que lembrar: atividade concluída ou horário do lembrete já passou.
 */
export async function scheduleReminder(
  activity: Activity,
  leadMinutes: number,
  now = new Date(),
): Promise<Date | null> {
  await cancelReminder(activity.id);
  if (activity.status !== 'pending') return null;
  const due = parseDbDateTime(activity.dueAt);
  const at = new Date(due.getTime() - leadMinutes * 60_000);
  if (Number.isNaN(at.getTime()) || at <= now) return null;

  const subject = activity.subjectName ? ` · ${activity.subjectName}` : '';
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(activity.id),
    content: {
      title: `${CATEGORIES[activity.category].label}: ${activity.title}`,
      body: `Prazo: ${formatDateTime(due, now)}${subject}`,
      data: { activityId: activity.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
  });
  return at;
}

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CampusFlow',
      body: 'Os lembretes estão funcionando neste aparelho.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

/** Ao tocar em um lembrete, abre a atividade correspondente. */
export function useReminderNavigation(): void {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.activityId;
      if (typeof id === 'number') router.push(`/activity/${id}`);
    };
    try {
      const launchResponse = Notifications.getLastNotificationResponse();
      if (launchResponse) {
        Notifications.clearLastNotificationResponse();
        open(launchResponse);
      }
    } catch (error) {
      // Plataforma sem suporte: o app segue funcionando, só sem abrir pelo lembrete.
      console.warn('[lembretes]', error);
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
