import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#1B3B8C',
  primaryDark: '#132A66',
  primarySoft: '#E8EEFB',
  accent: '#C8F05A',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF0F7',
  border: '#E1E6F0',
  text: '#0F1B3D',
  textMuted: '#56617F',
  // Texto e selos com contraste ≥ 4,5:1 (WCAG AA) sobre o fundo e as cores suaves.
  textFaint: '#646D88',
  success: '#12704C',
  successSoft: '#E2F5EC',
  danger: '#C93636',
  dangerSoft: '#FDEDED',
  warning: '#9A5800',
  warningSoft: '#FFF3DC',
  white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/** Largura máxima do conteúdo em tablets e telas largas. */
export const MAX_CONTENT_WIDTH = 720;

export const shadow = { boxShadow: '0px 4px 14px rgba(15, 27, 61, 0.07)' } as const;

export const type = StyleSheet.create({
  display: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 21, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
});

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  ...shadow,
} as const;
