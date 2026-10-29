import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, MAX_CONTENT_WIDTH, spacing, type } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Telas das abas cuidam da área segura superior; telas com cabeçalho nativo usam []. */
  edges?: Edge[];
}

export function Screen({ children, refreshing = false, onRefresh, edges = ['top'] }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <ScrollView
        contentContainerStyle={screenContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Conteúdo centralizado com largura máxima e espaço para o botão flutuante. */
export const screenContent = {
  padding: spacing.lg,
  paddingBottom: 112,
  gap: spacing.xl,
  width: '100%',
  maxWidth: MAX_CONTENT_WIDTH,
  alignSelf: 'center',
} as const;

interface ScreenHeaderProps {
  title: string;
  overline?: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, overline, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {overline && <Text style={type.overline}>{overline}</Text>}
        <Text style={type.display} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && <Text style={type.caption}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'danger';
}

export function Section({ title, children, actionLabel, onAction, tone = 'default' }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[type.heading, tone === 'danger' && styles.danger]} accessibilityRole="header">
          {title}
        </Text>
        {actionLabel && onAction && (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={14}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  danger: { color: colors.danger },
  action: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
