import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/FormField';
import type { IconName } from '@/constants/options';
import { colors, radius, spacing } from '@/constants/theme';
import { formatNumericDate, formatTime, withTime } from '@/utils/date';

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  hint?: string;
}

/** Data e hora com o seletor nativo: compacto no iOS, diálogos no Android. */
export function DateTimeField({ label, value, onChange, error, hint }: Props) {
  const current = Number.isNaN(value.getTime()) ? new Date() : value;

  if (Platform.OS === 'ios') {
    return (
      <Field label={label} error={error} hint={hint} required>
        <View style={styles.iosRow}>
          <DateTimePicker
            value={current}
            mode="datetime"
            display="compact"
            locale="pt-BR"
            themeVariant="light"
            accentColor={colors.primary}
            onValueChange={(_, date) => onChange(date)}
          />
        </View>
      </Field>
    );
  }

  const open = (mode: 'date' | 'time') =>
    DateTimePickerAndroid.open({
      value: current,
      mode,
      is24Hour: true,
      onValueChange: (_, date) => onChange(mode === 'date' ? withTime(date, current) : withTime(current, date)),
    });

  return (
    <Field label={label} error={error} hint={hint} required>
      <View style={styles.row}>
        <PickerButton
          icon="calendar-outline"
          text={formatNumericDate(current)}
          a11yLabel={`Data do prazo: ${formatNumericDate(current)}. Toque para alterar.`}
          onPress={() => open('date')}
          invalid={!!error}
        />
        <PickerButton
          icon="time-outline"
          text={formatTime(current)}
          a11yLabel={`Horário do prazo: ${formatTime(current)}. Toque para alterar.`}
          onPress={() => open('time')}
          invalid={!!error}
        />
      </View>
    </Field>
  );
}

interface PickerButtonProps {
  icon: IconName;
  text: string;
  a11yLabel: string;
  onPress: () => void;
  invalid: boolean;
}

function PickerButton({ icon, text, a11yLabel, onPress, invalid }: PickerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, invalid && styles.invalid, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iosRow: { flexDirection: 'row' },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invalid: { borderColor: colors.danger },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { fontSize: 16, fontWeight: '600', color: colors.text },
});
