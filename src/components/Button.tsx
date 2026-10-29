import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import type { IconName } from '@/constants/options';
import { colors, radius, spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, { background: string; foreground: string }> = {
  primary: { background: colors.primary, foreground: colors.white },
  secondary: { background: colors.primarySoft, foreground: colors.primary },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  ghost: { background: 'transparent', foreground: colors.primary },
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: ButtonProps) {
  const { background, foreground } = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        icon && <Ionicons name={icon} size={18} color={foreground} />
      )}
      <Text style={[styles.title, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, onPress, color = colors.text, size = 22, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed, style]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

interface PillButtonProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  a11yLabel?: string;
}

/** Ação secundária compacta, usada no canto do cabeçalho. */
export function PillButton({ label, icon, onPress, a11yLabel }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.pillLabel}>{label}</Text>
    </Pressable>
  );
}

/** Botão flutuante de ação principal da tela. */
export function Fab({ label, onPress, icon = 'add' }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={colors.white} />
      <Text style={styles.fabLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.55 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: { backgroundColor: colors.surfaceMuted },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  pillLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    minHeight: 54,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    boxShadow: '0px 8px 20px rgba(19, 42, 102, 0.32)',
  },
  fabLabel: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
