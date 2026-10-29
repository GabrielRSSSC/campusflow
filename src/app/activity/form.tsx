import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip, ChipGroup } from '@/components/Chip';
import { DateTimeField } from '@/components/DateTimeField';
import { showError } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { Field, TextField } from '@/components/FormField';
import { Screen } from '@/components/Layout';
import { toast } from '@/components/Toast';
import { CATEGORIES, PRIORITIES, REMINDER_LEADS } from '@/constants/options';
import { colors, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { getActivity } from '@/repositories/activities';
import { getPreferences } from '@/repositories/settings';
import { listSubjects } from '@/repositories/subjects';
import { saveActivity } from '@/services/actions';
import type { ActivityInput, Category, Preferences, Priority, SubjectWithCounts } from '@/types';
import {
  addDays,
  dayDiff,
  formatDateTime,
  isOverdue,
  isValidDbDateTime,
  parseDbDateTime,
  toDbDateTime,
  withTime,
} from '@/utils/date';
import { type FieldErrors, hasErrors, LIMITS, validateActivity } from '@/utils/validation';

const QUICK_DATES = [
  { label: 'Hoje', days: 0 },
  { label: 'Amanhã', days: 1 },
  { label: 'Em 1 semana', days: 7 },
];

/** Novo prazo padrão: dia escolhido no calendário ou amanhã, às 23:59. */
function defaultDueAt(dateKey?: string): string {
  if (dateKey && isValidDbDateTime(`${dateKey}T23:59`)) return `${dateKey}T23:59`;
  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(23, 59, 0, 0);
  return toDbDateTime(tomorrow);
}

export default function ActivityFormScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const { data, error, reload } = useQuery(
    async (db) => {
      const [activity, subjects, preferences] = await Promise.all([
        id === undefined ? null : getActivity(db, id),
        listSubjects(db),
        getPreferences(db),
      ]);
      return { activity, subjects, preferences };
    },
    [id],
  );

  const title = id === undefined ? 'Nova atividade' : 'Editar atividade';
  let content;
  if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (!data) content = <LoadingState />;
  else if (id !== undefined && !data.activity) {
    content = <EmptyState icon="search-outline" title="Atividade não encontrada" message="Ela pode ter sido excluída." />;
  } else {
    const initial: ActivityInput = data.activity ?? {
      title: '',
      description: '',
      subjectId: null,
      category: 'assignment',
      priority: 'medium',
      status: 'pending',
      dueAt: defaultDueAt(params.date),
    };
    content = (
      <ActivityForm
        key={id ?? 'new'}
        id={id}
        initial={initial}
        subjects={data.subjects}
        preferences={data.preferences}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen edges={[]}>{content}</Screen>
    </>
  );
}

interface FormProps {
  id?: number;
  initial: ActivityInput;
  subjects: SubjectWithCounts[];
  preferences: Preferences;
}

function ActivityForm({ id, initial, subjects, preferences }: FormProps) {
  const db = useSQLiteContext();
  const [values, setValues] = useState<ActivityInput>(() => ({
    title: initial.title,
    description: initial.description,
    subjectId: initial.subjectId,
    category: initial.category,
    priority: initial.priority,
    status: initial.status,
    dueAt: initial.dueAt,
  }));
  const [errors, setErrors] = useState<FieldErrors<ActivityInput>>({});
  const [saving, setSaving] = useState(false);
  const isNew = id === undefined;

  const set = <K extends keyof ActivityInput>(key: K, value: ActivityInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const due = parseDbDateTime(values.dueAt);
  const setDue = (date: Date) => set('dueAt', toDbDateTime(date));
  const today = new Date();
  const lead = REMINDER_LEADS.find((option) => option.minutes === preferences.reminderLeadMinutes);
  const dueHint = isOverdue(values)
    ? 'Este prazo já passou: a atividade aparecerá como atrasada.'
    : preferences.remindersEnabled
      ? `Lembrete: ${lead?.label.toLowerCase() ?? `${preferences.reminderLeadMinutes} min antes`}${lead?.minutes === 0 ? ' do prazo' : ''}.`
      : 'Lembretes desativados (ative em Configurações).';

  const submit = async () => {
    const input = { ...values, title: values.title.trim(), description: values.description.trim() };
    const found = validateActivity(input);
    setErrors(found);
    if (hasErrors(found)) {
      toast('Revise os campos destacados', 'error');
      return;
    }
    setSaving(true);
    try {
      const { reminderAt } = await saveActivity(db, input, id);
      const reminder = reminderAt ? ` · lembrete em ${formatDateTime(reminderAt)}` : '';
      toast(`${isNew ? 'Atividade criada' : 'Alterações salvas'}${reminder}`);
      router.back();
    } catch (saveError) {
      showError(saveError, 'Não foi possível salvar');
      setSaving(false);
    }
  };

  return (
    <>
      <TextField
        label="Título"
        required
        value={values.title}
        onChangeText={(text) => set('title', text)}
        placeholder="Ex.: Prova 2 de Cálculo"
        maxLength={LIMITS.title}
        error={errors.title}
        returnKeyType="done"
        autoCapitalize="sentences"
      />
      <TextField
        label="Descrição"
        value={values.description}
        onChangeText={(text) => set('description', text)}
        placeholder="Conteúdo, instruções, links…"
        multiline
        maxLength={LIMITS.description}
        error={errors.description}
        hint={`${values.description.length}/${LIMITS.description} caracteres`}
      />

      <Field
        label="Disciplina"
        hint={subjects.length === 0 ? 'Cadastre uma disciplina para vincular a atividade.' : undefined}>
        <ChipGroup>
          <Chip label="Nenhuma" selected={values.subjectId === null} onPress={() => set('subjectId', null)} />
          {subjects.map((subject) => (
            <Chip
              key={subject.id}
              label={subject.name}
              dot={subject.color}
              selected={values.subjectId === subject.id}
              onPress={() => set('subjectId', subject.id)}
            />
          ))}
          <Chip label="Nova disciplina" icon="add" onPress={() => router.push('/subject/form')} />
        </ChipGroup>
      </Field>

      <Field label="Categoria" required error={errors.category}>
        <ChipGroup wrap>
          {(Object.keys(CATEGORIES) as Category[]).map((category) => (
            <Chip
              key={category}
              label={CATEGORIES[category].label}
              icon={CATEGORIES[category].icon}
              color={CATEGORIES[category].color}
              selected={values.category === category}
              onPress={() => set('category', category)}
            />
          ))}
        </ChipGroup>
      </Field>

      <View style={styles.due}>
        <DateTimeField label="Prazo" value={due} onChange={setDue} error={errors.dueAt} hint={dueHint} />
        <ChipGroup>
          {QUICK_DATES.map((option) => {
            const day = addDays(today, option.days);
            return (
              <Chip
                key={option.label}
                label={option.label}
                icon="flash-outline"
                selected={!Number.isNaN(due.getTime()) && dayDiff(day, due) === 0}
                onPress={() => setDue(withTime(day, Number.isNaN(due.getTime()) ? new Date(0, 0, 1, 23, 59) : due))}
              />
            );
          })}
        </ChipGroup>
      </View>

      <Field label="Prioridade" required error={errors.priority}>
        <ChipGroup wrap>
          {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
            <Chip
              key={priority}
              label={PRIORITIES[priority].label}
              icon="flag"
              color={PRIORITIES[priority].color}
              selected={values.priority === priority}
              onPress={() => set('priority', priority)}
            />
          ))}
        </ChipGroup>
      </Field>

      <Field label="Status" required error={errors.status}>
        <ChipGroup wrap>
          <Chip
            label="Pendente"
            icon="ellipse-outline"
            selected={values.status === 'pending'}
            onPress={() => set('status', 'pending')}
          />
          <Chip
            label="Concluída"
            icon="checkmark-circle"
            color={colors.success}
            selected={values.status === 'done'}
            onPress={() => set('status', 'done')}
          />
        </ChipGroup>
      </Field>

      <Button
        title={isNew ? 'Criar atividade' : 'Salvar alterações'}
        icon="checkmark"
        loading={saving}
        onPress={submit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  due: { gap: spacing.md },
});
