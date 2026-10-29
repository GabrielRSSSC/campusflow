import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityCard } from '@/components/ActivityCard';
import { IconButton, PillButton } from '@/components/Button';
import { showActivityMenu, toggleWithFeedback } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { Screen, ScreenHeader, Section } from '@/components/Layout';
import { CATEGORIES } from '@/constants/options';
import { card, colors, radius, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { listActivities } from '@/repositories/activities';
import type { Activity, Category } from '@/types';
import {
  addMonths,
  capitalize,
  formatLongDate,
  getMonthGrid,
  isOverdue,
  MONTH_NAMES,
  parseDbDateTime,
  startOfMonth,
  toDateKey,
  toDbDateTime,
  WEEKDAY_INITIALS,
} from '@/utils/date';

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));

  const { data, error, reload, refresh, refreshing } = useQuery(
    async (db) => ({
      activities: await listActivities(db, { from: toDbDateTime(month), to: toDbDateTime(addMonths(month, 1)) }),
      now: new Date(),
    }),
    [month.getTime()],
  );

  if (error) return <Screen><ErrorState message={error.message} onRetry={reload} /></Screen>;
  if (!data) return <Screen><LoadingState /></Screen>;

  const byDay = new Map<string, Activity[]>();
  for (const activity of data.activities) {
    const key = activity.dueAt.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), activity]);
  }
  const todayKey = toDateKey(data.now);
  const selected = byDay.get(selectedKey) ?? [];
  const selectedDate = parseDbDateTime(`${selectedKey}T00:00`);
  const countBy = (category: Category, singular: string, plural: string) => {
    const count = data.activities.filter((activity) => activity.category === category).length;
    return `${count} ${count === 1 ? singular : plural}`;
  };

  const changeMonth = (offset: number) => {
    const next = addMonths(month, offset);
    setMonth(next);
    setSelectedKey(toDateKey(next));
  };
  const goToToday = () => {
    setMonth(startOfMonth(data.now));
    setSelectedKey(todayKey);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader
        title="Calendário"
        subtitle={`${data.activities.length} ${data.activities.length === 1 ? 'atividade' : 'atividades'} em ${MONTH_NAMES[month.getMonth()]} · ${countBy('exam', 'prova', 'provas')} · ${countBy('assignment', 'trabalho', 'trabalhos')}`}
        right={
          selectedKey !== todayKey && (
            <PillButton label="Hoje" icon="today-outline" a11yLabel="Voltar para hoje" onPress={goToToday} />
          )
        }
      />

      <View style={styles.calendar}>
        <View style={styles.monthBar}>
          <IconButton icon="chevron-back" label="Mês anterior" color={colors.primary} onPress={() => changeMonth(-1)} />
          <Text style={styles.monthTitle} accessibilityRole="header">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </Text>
          <IconButton icon="chevron-forward" label="Próximo mês" color={colors.primary} onPress={() => changeMonth(1)} />
        </View>

        <View style={styles.week}>
          {WEEKDAY_INITIALS.map((initial, index) => (
            <Text key={index} style={styles.weekday} importantForAccessibility="no">
              {initial}
            </Text>
          ))}
        </View>

        {getMonthGrid(month).map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => {
              if (!day) return <View key={dayIndex} style={styles.day} />;
              const key = toDateKey(day);
              const items = byDay.get(key) ?? [];
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const hasOverdue = items.some((activity) => isOverdue(activity, data.now));
              const categories = [...new Set(items.map((activity) => activity.category))].slice(0, 3);
              return (
                <Pressable
                  key={dayIndex}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatLongDate(day)}${isToday ? ', hoje' : ''}: ${items.length === 0 ? 'sem atividades' : `${items.length} ${items.length === 1 ? 'atividade' : 'atividades'}`}`}
                  onPress={() => setSelectedKey(key)}
                  style={styles.day}>
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && styles.today,
                      items.length > 0 && styles.busy,
                      isSelected && styles.selected,
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        items.length > 0 && styles.dayNumberBusy,
                        isSelected && styles.dayNumberSelected,
                      ]}>
                      {day.getDate()}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {categories.map((category) => (
                      <View key={category} style={[styles.dot, { backgroundColor: CATEGORIES[category].color }]} />
                    ))}
                    {hasOverdue && <View style={[styles.dot, styles.overdueDot]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {(Object.keys(CATEGORIES) as Category[]).map((category) => (
            <View key={category} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: CATEGORIES[category].color }]} />
              <Text style={styles.legendText}>{CATEGORIES[category].label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.overdueDot]} />
            <Text style={styles.legendText}>Atrasada</Text>
          </View>
        </View>
      </View>

      <Section title={capitalize(formatLongDate(selectedDate))}>
        {selected.length > 0 ? (
          selected.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              now={data.now}
              onPress={() => router.push(`/activity/${activity.id}`)}
              onToggle={() => toggleWithFeedback(db, activity)}
              onMore={() => showActivityMenu(db, activity)}
            />
          ))
        ) : (
          <EmptyState
            compact
            icon="calendar-clear-outline"
            title="Nenhuma atividade neste dia"
            actionLabel="Adicionar neste dia"
            onAction={() => router.push({ pathname: '/activity/form', params: { date: selectedKey } })}
          />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  calendar: { ...card, padding: spacing.md, gap: spacing.xs },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  monthTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textFaint,
    paddingVertical: spacing.xs,
  },
  day: { flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 52 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 2, borderColor: colors.primary },
  busy: { backgroundColor: colors.primarySoft },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayNumber: { fontSize: 15, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  dayNumberBusy: { fontWeight: '800', color: colors.primary },
  dayNumberSelected: { color: colors.white },
  dots: { flexDirection: 'row', gap: 3, height: 8, alignItems: 'center', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  overdueDot: { backgroundColor: colors.danger },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
});
