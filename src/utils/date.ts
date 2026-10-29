import type { Status } from '@/types';

// Os prazos são gravados como texto em horário local ('AAAA-MM-DDTHH:mm'): ordenam
// corretamente como string e não mudam de dia ao converter fusos horários.

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_NAMES = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];
export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const MINUTE = 60_000;
const DAY = 86_400_000;
const DB_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDbDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Chave do dia ('AAAA-MM-DD') usada para agrupar atividades no calendário. */
export function toDateKey(date: Date): string {
  return toDbDateTime(date).slice(0, 10);
}

/** Converte o texto do banco para Date local; retorna uma data inválida se o valor não existir no calendário. */
export function parseDbDateTime(value: string): Date {
  const match = DB_DATE_TIME.exec(value);
  if (!match) return new Date(NaN);
  const [year, month, day, hours, minutes] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  return toDbDateTime(date) === value ? date : new Date(NaN);
}

export function isValidDbDateTime(value: string): boolean {
  return !Number.isNaN(parseDbDateTime(value).getTime());
}

export function isOverdue(activity: { status: Status; dueAt: string }, now = new Date()): boolean {
  return activity.status === 'pending' && activity.dueAt < toDbDateTime(now);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Primeiro dia do mês deslocado em `months` meses. */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Diferença em dias de calendário (ignora horário e horário de verão). */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
}

/** Mantém o dia de `date` com o horário de `time`. */
export function withTime(date: Date, time: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** '3 nov' ou '3 nov 2027' quando o ano é diferente do atual. */
export function formatDate(date: Date, now = new Date()): string {
  const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function formatDateTime(date: Date, now = new Date()): string {
  return `${formatDate(date, now)}, ${formatTime(date)}`;
}

export function formatNumericDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 'quarta-feira, 29 de outubro' */
export function formatLongDate(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

function formatElapsed(ms: number): string {
  const minutes = Math.max(1, Math.floor(ms / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export type DueTone = 'overdue' | 'soon' | 'normal' | 'done';

/** Texto curto do prazo para cartões: 'Hoje, 14:30', 'Atrasada há 2 dias'... */
export function describeDue(dueAt: string, status: Status, now = new Date()): { label: string; tone: DueTone } {
  const due = parseDbDateTime(dueAt);
  if (status === 'done') return { label: formatDateTime(due, now), tone: 'done' };
  if (isOverdue({ status, dueAt }, now)) {
    return { label: `Atrasada há ${formatElapsed(now.getTime() - due.getTime())}`, tone: 'overdue' };
  }
  const days = dayDiff(now, due);
  const time = formatTime(due);
  if (days === 0) return { label: `Hoje, ${time}`, tone: 'soon' };
  if (days === 1) return { label: `Amanhã, ${time}`, tone: 'soon' };
  if (days < 7) return { label: `${WEEKDAYS[due.getDay()]}, ${time}`, tone: 'normal' };
  return { label: formatDateTime(due, now), tone: 'normal' };
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Grade do mês com 6 semanas (domingo a sábado); `null` nas casas fora do mês. */
export function getMonthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
