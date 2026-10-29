import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { Category, Priority, StatusFilter } from '@/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORIES: Record<Category, { label: string; icon: IconName; color: string }> = {
  exam: { label: 'Prova', icon: 'school-outline', color: '#7C3AED' },
  assignment: { label: 'Trabalho', icon: 'document-text-outline', color: '#0277BD' },
  exercise: { label: 'Exercício', icon: 'create-outline', color: '#0F766E' },
  other: { label: 'Outro', icon: 'bookmark-outline', color: '#5B6B82' },
};

export const PRIORITIES: Record<Priority, { label: string; color: string; soft: string }> = {
  high: { label: 'Alta', color: '#C93636', soft: '#FDEDED' },
  medium: { label: 'Média', color: '#9A5800', soft: '#FFF3DC' },
  low: { label: 'Baixa', color: '#4A5A75', soft: '#EDF0F7' },
};

export const STATUS_FILTERS: { value: StatusFilter | undefined; label: string }[] = [
  { value: undefined, label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'done', label: 'Concluídas' },
];

export const SUBJECT_COLORS = [
  { hex: '#2563EB', name: 'Azul' },
  { hex: '#7C3AED', name: 'Roxo' },
  { hex: '#DB2777', name: 'Rosa' },
  { hex: '#DC2626', name: 'Vermelho' },
  { hex: '#EA580C', name: 'Laranja' },
  { hex: '#CA8A04', name: 'Mostarda' },
  { hex: '#16A34A', name: 'Verde' },
  { hex: '#0D9488', name: 'Verde-água' },
  { hex: '#0891B2', name: 'Ciano' },
  { hex: '#475569', name: 'Grafite' },
] as const;

/** Cor usada para atividades sem disciplina. */
export const NO_SUBJECT_COLOR = '#94A3B8';

export const REMINDER_LEADS = [
  { minutes: 0, label: 'No horário' },
  { minutes: 60, label: '1 h antes' },
  { minutes: 1440, label: '1 dia antes' },
  { minutes: 2880, label: '2 dias antes' },
] as const;
