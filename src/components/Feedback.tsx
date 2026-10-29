import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import type { IconName } from '@/constants/options';
import { card, colors, radius, spacing, type } from '@/constants/theme';

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Algo deu errado', message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.icon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="warning-outline" size={28} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {onRetry && <Button title="Tentar novamente" icon="refresh" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Versão menor, para uso dentro de seções. */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact,
}: EmptyStateProps) {
  return (
    <View style={[styles.empty, compact && styles.compact]}>
      <View style={[styles.icon, compact && styles.iconCompact]}>
        <Ionicons name={icon} size={compact ? 22 : 30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {(actionLabel || secondaryLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && <Button title={actionLabel} icon="add" onPress={onAction} />}
          {secondaryLabel && onSecondary && <Button title={secondaryLabel} variant="secondary" onPress={onSecondary} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    minHeight: 280,
  },
  empty: {
    ...card,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  compact: { paddingVertical: spacing.xl, boxShadow: 'none' },
  icon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconCompact: { width: 44, height: 44 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center', maxWidth: 360 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
