import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/ActivityCard';
import { Button, Fab, PillButton } from '@/components/Button';
import { Chip, ChipGroup } from '@/components/Chip';
import { showActivityMenu, toggleWithFeedback } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { ScreenHeader, screenContent } from '@/components/Layout';
import { NO_SUBJECT_COLOR, PRIORITIES, STATUS_FILTERS } from '@/constants/options';
import { colors, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { listActivities } from '@/repositories/activities';
import { listSubjects } from '@/repositories/subjects';
import type { ActivityFilters, Priority } from '@/types';

type Params = { status?: string; priority?: string; subject?: string; sort?: string };

/** Os filtros ficam nos parâmetros da rota: outras telas abrem a lista já filtrada. */
function parseFilters(params: Params): ActivityFilters {
  const subjectId = Number(params.subject);
  return {
    status: STATUS_FILTERS.find((option) => option.value === params.status)?.value,
    priority: params.priority && Object.hasOwn(PRIORITIES, params.priority) ? (params.priority as Priority) : undefined,
    subjectId: params.subject === 'none' ? null : Number.isInteger(subjectId) && subjectId > 0 ? subjectId : undefined,
    sort: params.sort === 'desc' ? 'desc' : 'asc',
  };
}

export default function ActivitiesScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<Params>();
  const filters = parseFilters(params);
  const { data, error, reload, refresh, refreshing } = useQuery(
    async (db) => {
      const [activities, subjects] = await Promise.all([listActivities(db, filters), listSubjects(db)]);
      return { activities, subjects, now: new Date() };
    },
    [filters.status, filters.priority, filters.subjectId, filters.sort],
  );

  const setFilter = (changes: Params) => router.setParams(changes);
  const hasFilters = filters.status !== undefined || filters.priority !== undefined || filters.subjectId !== undefined;
  const clearFilters = () => setFilter({ status: undefined, priority: undefined, subject: undefined });
  const descending = filters.sort === 'desc';

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState message={error.message} onRetry={reload} />
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const count = data.activities.length;
  // O chip selecionado pode estar fora da área visível da rolagem: o subtítulo nomeia os filtros ativos.
  const activeFilters = [
    STATUS_FILTERS.find((option) => option.value && option.value === filters.status)?.label,
    filters.priority && `Prioridade ${PRIORITIES[filters.priority].label.toLowerCase()}`,
    filters.subjectId === null
      ? 'Sem disciplina'
      : data.subjects.find((subject) => subject.id === filters.subjectId)?.name,
  ].filter(Boolean);
  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title="Atividades"
        subtitle={[`${count} ${count === 1 ? 'atividade' : 'atividades'}`, ...activeFilters].join(' · ')}
        right={
          <PillButton
            label="Prazo"
            icon={descending ? 'arrow-down' : 'arrow-up'}
            a11yLabel={`Ordenado por prazo, ${descending ? 'mais distantes primeiro' : 'mais próximos primeiro'}. Toque para inverter.`}
            onPress={() => setFilter({ sort: descending ? undefined : 'desc' })}
          />
        }
      />
      <ChipGroup label="Status">
        {STATUS_FILTERS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={filters.status === option.value}
            color={option.value === 'overdue' ? colors.danger : colors.primary}
            onPress={() => setFilter({ status: option.value })}
          />
        ))}
      </ChipGroup>
      <ChipGroup label="Prioridade">
        <Chip label="Todas" selected={!filters.priority} onPress={() => setFilter({ priority: undefined })} />
        {(Object.keys(PRIORITIES) as Priority[]).map((priority) => (
          <Chip
            key={priority}
            label={PRIORITIES[priority].label}
            icon="flag"
            color={PRIORITIES[priority].color}
            selected={filters.priority === priority}
            onPress={() => setFilter({ priority })}
          />
        ))}
      </ChipGroup>
      <ChipGroup label="Disciplina">
        <Chip label="Todas" selected={filters.subjectId === undefined} onPress={() => setFilter({ subject: undefined })} />
        {data.subjects.map((subject) => (
          <Chip
            key={subject.id}
            label={subject.name}
            dot={subject.color}
            selected={filters.subjectId === subject.id}
            onPress={() => setFilter({ subject: String(subject.id) })}
          />
        ))}
        <Chip
          label="Sem disciplina"
          dot={NO_SUBJECT_COLOR}
          selected={filters.subjectId === null}
          onPress={() => setFilter({ subject: 'none' })}
        />
      </ChipGroup>
      {hasFilters && (
        <Button title="Limpar filtros" icon="close-circle" variant="ghost" onPress={clearFilters} style={styles.clear} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={data.activities}
        keyExtractor={(activity) => String(activity.id)}
        contentContainerStyle={[screenContent, styles.list]}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            now={data.now}
            onPress={() => router.push(`/activity/${item.id}`)}
            onToggle={() => toggleWithFeedback(db, item)}
            onMore={() => showActivityMenu(db, item)}
          />
        )}
        ListEmptyComponent={
          hasFilters ? (
            <EmptyState
              icon="funnel-outline"
              title="Nenhuma atividade encontrada"
              message="Nenhuma atividade corresponde aos filtros selecionados."
              secondaryLabel="Limpar filtros"
              onSecondary={clearFilters}
            />
          ) : (
            <EmptyState
              icon="list-outline"
              title="Nenhuma atividade cadastrada"
              message="Registre sua primeira prova, trabalho ou exercício para começar."
              actionLabel="Criar primeira atividade"
              onAction={() => router.push('/activity/form')}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
      <Fab label="Nova atividade" onPress={() => router.push('/activity/form')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { gap: spacing.md },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  clear: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: spacing.sm },
});
