import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityCard } from '@/components/ActivityCard';
import { Fab, IconButton } from '@/components/Button';
import { showActivityMenu, showError, toggleWithFeedback } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { ProgressBar } from '@/components/Indicators';
import { Screen, ScreenHeader, Section } from '@/components/Layout';
import { toast } from '@/components/Toast';
import type { IconName } from '@/constants/options';
import { card, colors, radius, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { listActivities } from '@/repositories/activities';
import { getPreferences } from '@/repositories/settings';
import { getSummary } from '@/repositories/stats';
import { loadDemoData } from '@/services/actions';
import type { Activity, StatusFilter } from '@/types';
import { formatLongDate, greeting, toDbDateTime } from '@/utils/date';

const SHORTCUTS: { label: string; description: string; icon: IconName; href: Href }[] = [
  { label: 'Calendário', description: 'Prazos por dia', icon: 'calendar-outline', href: '/calendar' },
  { label: 'Disciplinas', description: 'Matérias e cores', icon: 'library-outline', href: '/subjects' },
  { label: 'Estatísticas', description: 'Seu desempenho', icon: 'stats-chart-outline', href: '/stats' },
  { label: 'Configurações', description: 'Lembretes e dados', icon: 'settings-outline', href: '/settings' },
];

const openActivities = (status: StatusFilter) => router.navigate({ pathname: '/activities', params: { status } });

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const [seeding, setSeeding] = useState(false);
  const { data, error, reload, refresh, refreshing } = useQuery(async (db) => {
    const now = new Date();
    const [preferences, summary, overdue, upcoming] = await Promise.all([
      getPreferences(db),
      getSummary(db, now),
      listActivities(db, { status: 'overdue', limit: 5 }, now),
      listActivities(db, { status: 'pending', from: toDbDateTime(now), limit: 5 }, now),
    ]);
    return { preferences, summary, overdue, upcoming, now };
  }, []);

  if (error) return <Screen><ErrorState message={error.message} onRetry={reload} /></Screen>;
  if (!data) return <Screen><LoadingState /></Screen>;

  const { preferences, summary, overdue, upcoming, now } = data;
  const progress = summary.total ? summary.done / summary.total : 0;
  const firstName = preferences.userName.trim().split(/\s+/)[0];

  const seed = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await loadDemoData(db);
      toast(`${result.activitiesCreated} atividades de exemplo carregadas`);
    } catch (seedError) {
      showError(seedError);
    } finally {
      setSeeding(false);
    }
  };

  const renderCard = (activity: Activity) => (
    <ActivityCard
      key={activity.id}
      activity={activity}
      now={now}
      onPress={() => router.push(`/activity/${activity.id}`)}
      onToggle={() => toggleWithFeedback(db, activity)}
      onMore={() => showActivityMenu(db, activity)}
    />
  );

  return (
    <View style={styles.flex}>
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <ScreenHeader
          overline={formatLongDate(now)}
          title={`${greeting(now)}${firstName ? `, ${firstName}` : ''}`}
          right={<IconButton icon="settings-outline" label="Configurações" onPress={() => router.push('/settings')} />}
        />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <Text style={styles.heroLabel}>Progresso geral</Text>
              <Text style={styles.heroValue}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="hourglass-outline" size={14} color={colors.accent} />
              <Text style={styles.heroPillText}>
                {summary.dueSoon} {summary.dueSoon === 1 ? 'prazo' : 'prazos'} em 7 dias
              </Text>
            </View>
          </View>
          <ProgressBar
            value={progress}
            label="Progresso das atividades"
            color={colors.accent}
            trackColor="rgba(255, 255, 255, 0.16)"
            height={10}
          />
          <Text style={styles.heroCaption}>
            {summary.done} de {summary.total} {summary.total === 1 ? 'atividade concluída' : 'atividades concluídas'}
          </Text>
          <View style={styles.heroStats}>
            <HeroStat label="Pendentes" value={summary.pending} onPress={() => openActivities('pending')} />
            <HeroStat label="Concluídas" value={summary.done} onPress={() => openActivities('done')} />
            <HeroStat
              label="Atrasadas"
              value={summary.overdue}
              alert={summary.overdue > 0}
              onPress={() => openActivities('overdue')}
            />
          </View>
        </View>

        {summary.total === 0 ? (
          <EmptyState
            icon="sparkles-outline"
            title="Comece a organizar seu semestre"
            message="Cadastre provas, trabalhos e exercícios para acompanhar todos os prazos em um só lugar."
            actionLabel="Cadastrar atividade"
            onAction={() => router.push('/activity/form')}
            secondaryLabel={seeding ? 'Carregando…' : 'Explorar com dados de exemplo'}
            onSecondary={seed}
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <Section
                title={`Atrasadas (${summary.overdue})`}
                tone="danger"
                actionLabel="Ver todas"
                onAction={() => openActivities('overdue')}>
                {overdue.map(renderCard)}
              </Section>
            )}
            <Section title="Próximos prazos" actionLabel="Ver todas" onAction={() => openActivities('pending')}>
              {upcoming.length > 0 ? (
                upcoming.map(renderCard)
              ) : (
                <EmptyState
                  compact
                  icon="checkmark-done-outline"
                  title="Nenhum prazo pela frente"
                  message="Todas as atividades com prazo futuro estão concluídas."
                />
              )}
            </Section>
          </>
        )}

        <Section title="Atalhos">
          <View style={styles.shortcuts}>
            {SHORTCUTS.map((shortcut) => (
              <Pressable
                key={shortcut.label}
                accessibilityRole="button"
                accessibilityLabel={`${shortcut.label}: ${shortcut.description}`}
                onPress={() => router.navigate(shortcut.href)}
                style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name={shortcut.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
                <Text style={styles.shortcutDescription}>{shortcut.description}</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      </Screen>
      <Fab label="Nova atividade" onPress={() => router.push('/activity/form')} />
    </View>
  );
}

interface HeroStatProps {
  label: string;
  value: number;
  onPress: () => void;
  alert?: boolean;
}

function HeroStat({ label, value, onPress, alert }: HeroStatProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Ver lista.`}
      onPress={onPress}
      style={({ pressed }) => [styles.heroStat, alert && styles.heroStatAlert, pressed && styles.pressed]}>
      <Text style={[styles.heroStatValue, alert && styles.heroStatValueAlert]}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    gap: spacing.md,
    boxShadow: '0px 12px 28px rgba(19, 42, 102, 0.28)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroLabel: { color: 'rgba(255, 255, 255, 0.72)', fontSize: 14, fontWeight: '600' },
  heroValue: { color: colors.white, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  heroPillText: { color: colors.white, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  heroCaption: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 },
  heroStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  heroStatAlert: { backgroundColor: 'rgba(255, 107, 107, 0.2)' },
  heroStatValue: { color: colors.white, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroStatValueAlert: { color: '#FFB4B4' },
  heroStatLabel: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 12, fontWeight: '600' },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  shortcut: { ...card, flexGrow: 1, flexBasis: 140, padding: spacing.lg, gap: 4 },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  shortcutLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  shortcutDescription: { fontSize: 13, color: colors.textMuted },
});
