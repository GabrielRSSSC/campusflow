import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/** Rótulo + controle + mensagem de erro ou dica. */
export function Field({ label, error, hint, required, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={15} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        hint && <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

type TextFieldProps = Omit<FieldProps, 'children'> & TextInputProps;

export function TextField({ label, error, hint, required, multiline, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <TextInput
        {...props}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textFaint}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.invalid,
          style,
        ]}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  required: { color: colors.danger },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  invalid: { borderColor: colors.danger, backgroundColor: '#FFFBFB' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: '500' },
  hint: { fontSize: 13, color: colors.textMuted },
});
