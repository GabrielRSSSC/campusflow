import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/constants/options';
import { card, colors, radius, spacing } from '@/constants/theme';

interface ProgressBarProps {
  /** Valor entre 0 e 1. */
  value: number;
  label: string;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ value, label, color = colors.primary, trackColor = colors.surfaceMuted, height = 8 }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <View style={{ width: `${percent}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  icon: IconName;
  color: string;
}

export function StatTile({ label, value, icon, color }: StatTileProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface BadgeProps {
  label: string;
  color: string;
  background: string;
  icon?: IconName;
}

export function Badge({ label, color, background, icon }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  tile: {
    ...card,
    flexGrow: 1,
    flexBasis: 140,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tileValue: { fontSize: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
