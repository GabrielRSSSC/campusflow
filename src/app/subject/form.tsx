import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { confirmDeleteSubject, showError } from '@/components/dialogs';
import { EmptyState, ErrorState, LoadingState } from '@/components/Feedback';
import { Field, TextField } from '@/components/FormField';
import { Screen } from '@/components/Layout';
import { toast } from '@/components/Toast';
import { SUBJECT_COLORS } from '@/constants/options';
import { colors, radius, spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/useQuery';
import { listActivityIdsBySubject } from '@/repositories/activities';
import { getSubject } from '@/repositories/subjects';
import { saveSubject } from '@/services/actions';
import type { SubjectInput } from '@/types';
import { type FieldErrors, hasErrors, LIMITS, validateSubject, ValidationError } from '@/utils/validation';

export default function SubjectFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const { data, error, reload } = useQuery(
    async (db) => {
      if (id === undefined) return { subject: null, total: 0 };
      const [subject, activityIds] = await Promise.all([getSubject(db, id), listActivityIdsBySubject(db, id)]);
      return { subject, total: activityIds.length };
    },
    [id],
  );

  let content;
  if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (!data) content = <LoadingState />;
  else if (id !== undefined && !data.subject) {
    content = <EmptyState icon="search-outline" title="Disciplina não encontrada" message="Ela pode ter sido excluída." />;
  } else {
    content = (
      <SubjectForm
        key={id ?? 'new'}
        id={id}
        initial={data.subject ?? { name: '', teacher: null, color: SUBJECT_COLORS[0].hex }}
        total={data.total}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: id === undefined ? 'Nova disciplina' : 'Editar disciplina' }} />
      <Screen edges={[]}>{content}</Screen>
    </>
  );
}

function SubjectForm({ id, initial, total }: { id?: number; initial: SubjectInput; total: number }) {
  const db = useSQLiteContext();
  const [values, setValues] = useState<SubjectInput>(() => ({
    name: initial.name,
    teacher: initial.teacher,
    color: initial.color,
  }));
  const [errors, setErrors] = useState<FieldErrors<SubjectInput>>({});
  const [saving, setSaving] = useState(false);
  const isNew = id === undefined;

  const set = <K extends keyof SubjectInput>(key: K, value: SubjectInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const input: SubjectInput = {
      name: values.name.trim(),
      teacher: values.teacher?.trim() || null,
      color: values.color,
    };
    const found = validateSubject(input);
    setErrors(found);
    if (hasErrors(found)) {
      toast('Revise os campos destacados', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSubject(db, input, id);
      toast(isNew ? 'Disciplina cadastrada' : 'Disciplina atualizada');
      router.back();
    } catch (saveError) {
      if (saveError instanceof ValidationError) setErrors(saveError.fields);
      else showError(saveError, 'Não foi possível salvar');
      setSaving(false);
    }
  };

  return (
    <>
      <TextField
        label="Nome da disciplina"
        required
        value={values.name}
        onChangeText={(text) => set('name', text)}
        placeholder="Ex.: Cálculo II"
        maxLength={LIMITS.subjectName}
        error={errors.name}
        autoCapitalize="words"
      />
      <TextField
        label="Professor(a)"
        value={values.teacher ?? ''}
        onChangeText={(text) => set('teacher', text)}
        placeholder="Opcional"
        maxLength={LIMITS.teacher}
        error={errors.teacher}
        autoCapitalize="words"
      />
      <Field label="Cor identificadora" required error={errors.color}>
        <View style={styles.palette} accessibilityRole="radiogroup">
          {SUBJECT_COLORS.map((color) => {
            const selected = values.color.toUpperCase() === color.hex;
            return (
              <Pressable
                key={color.hex}
                accessibilityRole="radio"
                accessibilityLabel={color.name}
                accessibilityState={{ checked: selected }}
                onPress={() => set('color', color.hex)}
                style={[styles.swatch, { backgroundColor: color.hex }, selected && styles.selected]}>
                {selected && <Ionicons name="checkmark" size={22} color={colors.white} />}
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Button
        title={isNew ? 'Cadastrar disciplina' : 'Salvar alterações'}
        icon="checkmark"
        loading={saving}
        onPress={submit}
      />
      {id !== undefined && (
        <Button
          title="Excluir disciplina"
          icon="trash-outline"
          variant="danger"
          onPress={() => confirmDeleteSubject(db, { id, name: initial.name, total }, () => router.back())}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderWidth: 3, borderColor: colors.text },
});
