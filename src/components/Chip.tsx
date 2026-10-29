import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/constants/options';
import { colors, radius, spacing, type } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Cor de destaque quando selecionado. */
  color?: string;
  icon?: IconName;
  /** Bolinha colorida antes do texto (ex.: cor da disciplina). */
  dot?: string;
}

export function Chip({ label, selected = false, onPress, color = colors.primary, icon, dot }: ChipProps) {
  const foreground = selected ? colors.white : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
        pressed && styles.pressed,
      ]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }, selected && styles.dotSelected]} />}
      {icon && <Ionicons name={icon} size={16} color={selected ? colors.white : color} />}
      <Text style={[styles.label, { color: foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Grupo de chips com rótulo; rola na horizontal ou quebra linha (`wrap`). */
export function ChipGroup({ label, wrap = false, children }: { label?: string; wrap?: boolean; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {label && <Text style={type.overline}>{label}</Text>}
      {wrap ? (
        <View style={styles.wrap}>{children}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.8 },
  label: { fontSize: 14, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotSelected: { borderWidth: 1.5, borderColor: colors.white },
  group: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Rola até a borda da tela, apesar do padding do conteúdo.
  scroller: { marginHorizontal: -spacing.lg },
  scrollContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
});
