import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DUE_TONES } from '@/components/ActivityCard';
import { Button } from '@/components/Button';
import { confirmDeleteActivity, toggleWithFeedback } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { Badge } from '@/components/Indicators';
import { Screen } from '@/components/Layout';
import { CATEGORIES, type IconName, NO_SUBJECT_COLOR, PRIORITIES } from '@/constants/options';
import { card, colors, spacing, type } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { getActivity } from '@/repositories/activities';
import {
  capitalize,
  dayDiff,
  describeDue,
  formatLongDate,
  formatNumericDate,
  formatTime,
  parseDbDateTime,
} from '@/utils/date';

export default function ActivityDetailsScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityId = Number(id);
  const { data: activity, error, reload } = useQuery((db) => getActivity(db, activityId), [activityId]);

  if (error) return <Screen edges={[]}><ErrorState message={error.message} onRetry={reload} /></Screen>;
  if (activity === undefined) return <Screen edges={[]}><LoadingState /></Screen>;
  if (activity === null) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="search-outline"
          title="Atividade não encontrada"
          message="Ela pode ter sido excluída."
          secondaryLabel="Voltar"
          onSecondary={() => router.back()}
        />
      </Screen>
    );
  }

  const done = activity.status === 'done';
  const due = parseDbDateTime(activity.dueAt);
  const dueInfo = describeDue(activity.dueAt, activity.status);
  // A data completa já aparece acima; o selo traz só a informação relativa.
  const relativeDue =
    dueInfo.tone === 'normal' ? `Em ${dayDiff(new Date(), due)} dias` : dueInfo.label.split(',')[0];
  const category = CATEGORIES[activity.category];
  const priority = PRIORITIES[activity.priority];
  const tone = DUE_TONES[dueInfo.tone];

  return (
    <Screen edges={[]}>
      <View style={styles.card}>
        <View style={styles.badges}>
          <Badge icon={category.icon} label={category.label} color={category.color} background={`${category.color}1A`} />
          <Badge
            icon={done ? 'checkmark-circle' : 'ellipse-outline'}
            label={done ? 'Concluída' : 'Pendente'}
            color={done ? colors.success : colors.primary}
            background={done ? colors.successSoft : colors.primarySoft}
          />
        </View>
        <Text style={[type.title, styles.title]} accessibilityRole="header">
          {activity.title}
        </Text>

        <InfoRow icon="calendar-outline" label="Prazo">
          <Text style={styles.value}>
            {capitalize(formatLongDate(due))} às {formatTime(due)}
          </Text>
          {!done && <Badge label={relativeDue} color={tone.color} background={tone.background} />}
        </InfoRow>
        <InfoRow icon="library-outline" label="Disciplina">
          <View style={styles.subject}>
            <View style={[styles.dot, { backgroundColor: activity.subjectColor ?? NO_SUBJECT_COLOR }]} />
            <Text style={styles.value}>{activity.subjectName ?? 'Sem disciplina'}</Text>
          </View>
        </InfoRow>
        <InfoRow icon="flag-outline" label="Prioridade">
          <Text style={[styles.value, { color: priority.color }]}>{priority.label}</Text>
        </InfoRow>
        <InfoRow icon="reader-outline" label="Descrição">
          <Text style={[styles.value, !activity.description && styles.muted]}>
            {activity.description || 'Sem descrição.'}
          </Text>
        </InfoRow>
        <Text style={styles.timestamps}>
          Criada em {formatStamp(activity.createdAt)} · atualizada em {formatStamp(activity.updatedAt)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={done ? 'Reabrir atividade' : 'Marcar como concluída'}
          icon={done ? 'arrow-undo-outline' : 'checkmark-done-outline'}
          onPress={() => toggleWithFeedback(db, activity)}
        />
        <Button
          title="Editar"
          icon="pencil"
          variant="secondary"
          onPress={() => router.push({ pathname: '/activity/form', params: { id: String(activity.id) } })}
        />
        <Button
          title="Excluir"
          icon="trash-outline"
          variant="danger"
          onPress={() => confirmDeleteActivity(db, activity, () => router.back())}
        />
      </View>
    </Screen>
  );
}

/** Data/hora gravada pelo SQLite ('AAAA-MM-DD HH:MM:SS') → '29/10/2026 às 17:45'. */
function formatStamp(value: string) {
  const date = parseDbDateTime(value.slice(0, 16).replace(' ', 'T'));
  return `${formatNumericDate(date)} às ${formatTime(date)}`;
}

function InfoRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.infoIcon} />
      <View style={styles.infoBody}>
        <Text style={type.overline}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...card, padding: spacing.xl - 4, gap: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  title: { fontSize: 24, lineHeight: 30 },
  infoRow: { flexDirection: 'row', gap: spacing.md },
  infoIcon: { marginTop: 2 },
  infoBody: { flex: 1, gap: 6, alignItems: 'flex-start' },
  value: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { color: colors.textMuted, fontStyle: 'italic' },
  subject: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  timestamps: { fontSize: 12, color: colors.textFaint },
  actions: { gap: spacing.md },
});
