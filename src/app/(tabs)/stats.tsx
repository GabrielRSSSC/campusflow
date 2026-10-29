import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { ProgressBar, StatTile } from '@/components/Indicators';
import { Screen, ScreenHeader, Section } from '@/components/Layout';
import { CATEGORIES, NO_SUBJECT_COLOR } from '@/constants/options';
import { card, colors, radius, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { getCategoryStats, getSubjectStats, getSummary } from '@/repositories/stats';

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export default function StatsScreen() {
  const { data, error, reload, refresh, refreshing } = useQuery(async (db) => {
    const now = new Date();
    const [summary, bySubject, byCategory] = await Promise.all([
      getSummary(db, now),
      getSubjectStats(db, now),
      getCategoryStats(db),
    ]);
    return { summary, bySubject, byCategory };
  }, []);

  if (error) return <Screen><ErrorState message={error.message} onRetry={reload} /></Screen>;
  if (!data) return <Screen><LoadingState /></Screen>;

  const { summary, bySubject, byCategory } = data;
  const completion = percent(summary.done, summary.total);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader title="Estatísticas" subtitle="Calculadas em tempo real a partir dos dados salvos no aparelho" />

      {summary.total === 0 ? (
        <EmptyState
          icon="pie-chart-outline"
          title="Ainda não há dados"
          message="Cadastre atividades para acompanhar sua taxa de conclusão e o andamento de cada disciplina."
          actionLabel="Cadastrar atividade"
          onAction={() => router.push('/activity/form')}
        />
      ) : (
        <>
          <View style={styles.completion}>
            <View style={styles.completionRow}>
              <View>
                <Text style={styles.completionLabel}>Taxa de conclusão</Text>
                <Text style={styles.completionValue}>{completion}%</Text>
              </View>
              <Ionicons name="trophy-outline" size={34} color={colors.accent} />
            </View>
            <ProgressBar
              value={completion / 100}
              label="Taxa de conclusão"
              color={colors.accent}
              trackColor="rgba(255, 255, 255, 0.16)"
              height={10}
            />
            <Text style={styles.completionCaption}>
              {summary.done} de {summary.total} atividades concluídas · {summary.dueSoon} com prazo nos próximos 7 dias
            </Text>
          </View>

          <View style={styles.grid}>
            <StatTile label="Total" value={summary.total} icon="layers-outline" color={colors.primary} />
            <StatTile label="Concluídas" value={summary.done} icon="checkmark-circle-outline" color={colors.success} />
            <StatTile label="Pendentes" value={summary.pending} icon="time-outline" color={colors.warning} />
            <StatTile label="Atrasadas" value={summary.overdue} icon="alert-circle-outline" color={colors.danger} />
          </View>

          <Section title="Por disciplina">
            <View style={styles.panel}>
              {bySubject.map((row) => {
                const color = row.color ?? NO_SUBJECT_COLOR;
                const share = percent(row.done, row.total);
                return (
                  <View
                    key={row.subjectId ?? 'none'}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${row.name ?? 'Sem disciplina'}: ${row.done} de ${row.total} concluídas, ${share}%.${row.overdue ? ` ${row.overdue} atrasadas.` : ''}`}>
                    <View style={styles.rowHeader}>
                      <View style={[styles.dot, { backgroundColor: color }]} />
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {row.name ?? 'Sem disciplina'}
                      </Text>
                      <Text style={styles.rowValue}>
                        {row.done}/{row.total} · {share}%
                      </Text>
                    </View>
                    <ProgressBar value={share / 100} label={row.name ?? 'Sem disciplina'} color={color} />
                    {row.overdue > 0 && (
                      <Text style={styles.overdue}>
                        {row.overdue} {row.overdue === 1 ? 'atividade atrasada' : 'atividades atrasadas'}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Section>

          <Section title="Por categoria">
            <View style={styles.panel}>
              {byCategory.map((row) => {
                const category = CATEGORIES[row.category];
                return (
                  <View
                    key={row.category}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${category.label}: ${row.total} atividades, ${percent(row.total, summary.total)}% do total, ${row.done} concluídas.`}>
                    <View style={styles.rowHeader}>
                      <Ionicons name={category.icon} size={16} color={category.color} />
                      <Text style={styles.rowTitle}>{category.label}</Text>
                      <Text style={styles.rowValue}>
                        {row.total} · {percent(row.total, summary.total)}% do total
                      </Text>
                    </View>
                    <ProgressBar value={row.total / summary.total} label={category.label} color={category.color} />
                    <Text style={styles.caption}>
                      {row.done} {row.done === 1 ? 'concluída' : 'concluídas'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  completion: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    gap: spacing.md,
  },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionLabel: { color: 'rgba(255, 255, 255, 0.72)', fontSize: 14, fontWeight: '600' },
  completionValue: { color: colors.white, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  completionCaption: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  panel: { ...card, padding: spacing.lg, gap: spacing.lg },
  row: { gap: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  rowValue: { fontSize: 13, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  overdue: { fontSize: 12, fontWeight: '600', color: colors.danger },
  caption: { fontSize: 12, color: colors.textMuted },
});
