import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/Button';
import { Badge } from '@/components/Indicators';
import { CATEGORIES, NO_SUBJECT_COLOR, PRIORITIES } from '@/constants/options';
import { card, colors, radius, spacing } from '@/constants/theme';
import type { Activity } from '@/types';
import { describeDue, type DueTone } from '@/utils/date';

export const DUE_TONES: Record<DueTone, { color: string; background: string }> = {
  overdue: { color: colors.danger, background: colors.dangerSoft },
  soon: { color: colors.warning, background: colors.warningSoft },
  normal: { color: colors.textMuted, background: colors.surfaceMuted },
  done: { color: colors.success, background: colors.successSoft },
};

interface Props {
  activity: Activity;
  onPress: () => void;
  onToggle: () => void;
  onMore?: () => void;
  now?: Date;
}

export function ActivityCard({ activity, onPress, onToggle, onMore, now = new Date() }: Props) {
  const done = activity.status === 'done';
  const due = describeDue(activity.dueAt, activity.status, now);
  const overdue = due.tone === 'overdue';
  const category = CATEGORIES[activity.category];
  const priority = PRIORITIES[activity.priority];
  const tone = DUE_TONES[due.tone];
  const meta = activity.subjectName ? `${category.label} · ${activity.subjectName}` : category.label;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}. ${meta}. ${due.label}. Prioridade ${priority.label.toLowerCase()}.${done ? ' Concluída.' : ''}`}
      accessibilityHint="Abre os detalhes da atividade"
      accessibilityActions={[
        { name: 'toggle', label: done ? 'Marcar como pendente' : 'Marcar como concluída' },
        ...(onMore ? [{ name: 'more', label: 'Mais ações' }] : []),
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'toggle') onToggle();
        if (nativeEvent.actionName === 'more') onMore?.();
      }}
      style={({ pressed }) => [styles.card, overdue && styles.overdue, pressed && styles.pressed]}>
      <View style={[styles.stripe, { backgroundColor: activity.subjectColor ?? NO_SUBJECT_COLOR }]} />
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Marcar como pendente' : 'Marcar como concluída'}
        style={[styles.check, done && styles.checkDone, overdue && styles.checkOverdue]}>
        {done && <Ionicons name="checkmark" size={16} color={colors.white} />}
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {activity.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name={category.icon} size={14} color={category.color} />
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <View style={styles.badges}>
          <Badge
            icon={overdue ? 'alert-circle' : done ? 'checkmark-done-outline' : 'time-outline'}
            label={due.label}
            color={tone.color}
            background={tone.background}
          />
          {!done && <Badge icon="flag" label={priority.label} color={priority.color} background={priority.soft} />}
        </View>
      </View>
      {onMore && (
        <IconButton icon="ellipsis-vertical" label="Mais ações" size={18} color={colors.textMuted} onPress={onMore} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingLeft: spacing.lg + 2,
    paddingRight: spacing.xs,
    overflow: 'hidden',
  },
  overdue: { backgroundColor: '#FFF8F8', borderColor: '#F5C9C9' },
  pressed: { opacity: 0.9 },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#B7C0D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkOverdue: { borderColor: colors.danger },
  body: { flex: 1, gap: 6, paddingRight: spacing.xs },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 21 },
  titleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, fontSize: 13, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
