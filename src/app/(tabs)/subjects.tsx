import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fab, IconButton } from '@/components/Button';
import { showSubjectMenu } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { Screen, ScreenHeader } from '@/components/Layout';
import { card, colors, radius, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { listSubjects } from '@/repositories/subjects';
import type { SubjectWithCounts } from '@/types';

const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']);

/** 'Banco de Dados' → 'BD', 'Cálculo II' → 'CI' */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !CONNECTORS.has(word.toLowerCase()));
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`;

export default function SubjectsScreen() {
  const db = useSQLiteContext();
  const { data, error, reload, refresh, refreshing } = useQuery((db) => listSubjects(db), []);

  if (error) return <Screen><ErrorState message={error.message} onRetry={reload} /></Screen>;
  if (!data) return <Screen><LoadingState /></Screen>;

  const openActivities = (subject: SubjectWithCounts) =>
    router.navigate({ pathname: '/activities', params: { subject: String(subject.id) } });

  return (
    <View style={styles.flex}>
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <ScreenHeader title="Disciplinas" subtitle={plural(data.length, 'disciplina cadastrada', 'disciplinas cadastradas')} />
        {data.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title="Nenhuma disciplina cadastrada"
            message="Cadastre suas disciplinas para agrupar as atividades por matéria e identificá-las por cor."
            actionLabel="Cadastrar disciplina"
            onAction={() => router.push('/subject/form')}
          />
        ) : (
          <View style={styles.list}>
            {data.map((subject) => (
              <Pressable
                key={subject.id}
                accessibilityRole="button"
                accessibilityLabel={`${subject.name}. ${plural(subject.total, 'atividade', 'atividades')}, ${plural(subject.pending, 'pendente', 'pendentes')}.`}
                accessibilityHint="Mostra as atividades desta disciplina"
                accessibilityActions={[{ name: 'more', label: 'Editar ou excluir' }]}
                onAccessibilityAction={() => showSubjectMenu(db, subject)}
                onPress={() => openActivities(subject)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={[styles.avatar, { backgroundColor: subject.color }]}>
                  <Text style={styles.avatarText}>{initials(subject.name)}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={2}>
                    {subject.name}
                  </Text>
                  {subject.teacher && (
                    <View style={styles.row}>
                      <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.meta} numberOfLines={1}>
                        {subject.teacher}
                      </Text>
                    </View>
                  )}
                  <View style={styles.row}>
                    <Text style={styles.count}>{plural(subject.total, 'atividade', 'atividades')}</Text>
                    {subject.pending > 0 && (
                      <Text style={styles.pending}>{plural(subject.pending, 'pendente', 'pendentes')}</Text>
                    )}
                  </View>
                </View>
                <IconButton
                  icon="ellipsis-vertical"
                  label={`Ações de ${subject.name}`}
                  size={18}
                  color={colors.textMuted}
                  onPress={() => showSubjectMenu(db, subject)}
                />
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
      <Fab label="Nova disciplina" onPress={() => router.push('/subject/form')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  card: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  pressed: { opacity: 0.9 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  body: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, fontSize: 13, color: colors.textMuted },
  count: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  pending: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
