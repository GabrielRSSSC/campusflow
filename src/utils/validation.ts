import { CATEGORIES, PRIORITIES } from '@/constants/options';
import type { ActivityInput, SubjectInput } from '@/types';
import { isValidDbDateTime } from '@/utils/date';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const LIMITS = {
  title: 100,
  description: 1000,
  subjectName: 60,
  teacher: 80,
} as const;

/** Erro de regra de negócio associado a campos do formulário. */
export class ValidationError<T> extends Error {
  readonly fields: FieldErrors<T>;

  constructor(fields: FieldErrors<T>) {
    super(Object.values(fields).find(Boolean) as string);
    this.fields = fields;
  }
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateActivity(input: ActivityInput): FieldErrors<ActivityInput> {
  const errors: FieldErrors<ActivityInput> = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Informe um título para a atividade.';
  else if (title.length < 3) errors.title = 'O título precisa ter pelo menos 3 caracteres.';
  else if (title.length > LIMITS.title) errors.title = `Use no máximo ${LIMITS.title} caracteres.`;

  if (input.description.trim().length > LIMITS.description) {
    errors.description = `A descrição pode ter no máximo ${LIMITS.description} caracteres.`;
  }
  if (!Object.hasOwn(CATEGORIES, input.category)) errors.category = 'Selecione uma categoria.';
  if (!Object.hasOwn(PRIORITIES, input.priority)) errors.priority = 'Selecione uma prioridade.';
  if (input.status !== 'pending' && input.status !== 'done') errors.status = 'Selecione um status.';
  if (!isValidDbDateTime(input.dueAt)) errors.dueAt = 'Escolha uma data e um horário válidos.';
  return errors;
}

export function validateSubject(input: SubjectInput): FieldErrors<SubjectInput> {
  const errors: FieldErrors<SubjectInput> = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Informe o nome da disciplina.';
  else if (name.length < 2) errors.name = 'O nome precisa ter pelo menos 2 caracteres.';
  else if (name.length > LIMITS.subjectName) errors.name = `Use no máximo ${LIMITS.subjectName} caracteres.`;

  if ((input.teacher ?? '').trim().length > LIMITS.teacher) {
    errors.teacher = `Use no máximo ${LIMITS.teacher} caracteres.`;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) errors.color = 'Escolha uma cor.';
  return errors;
}
