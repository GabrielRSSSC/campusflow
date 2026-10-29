export type Category = 'exam' | 'assignment' | 'exercise' | 'other';
export type Priority = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'done';

export interface Subject {
  id: number;
  name: string;
  teacher: string | null;
  color: string;
}

export interface SubjectWithCounts extends Subject {
  total: number;
  pending: number;
}

export interface Activity {
  id: number;
  title: string;
  description: string;
  subjectId: number | null;
  category: Category;
  priority: Priority;
  status: Status;
  /** Prazo em horário local, no formato 'AAAA-MM-DDTHH:mm'. */
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  subjectName: string | null;
  subjectColor: string | null;
}

export type ActivityInput = Pick<
  Activity,
  'title' | 'description' | 'subjectId' | 'category' | 'priority' | 'status' | 'dueAt'
>;

export type SubjectInput = Omit<Subject, 'id'>;

/** 'overdue' = pendente com prazo vencido. */
export type StatusFilter = Status | 'overdue';

export interface ActivityFilters {
  status?: StatusFilter;
  priority?: Priority;
  /** `null` filtra atividades sem disciplina. */
  subjectId?: number | null;
  /** Prazo inicial (inclusivo), mesmo formato de `dueAt`. */
  from?: string;
  /** Prazo final (exclusivo), mesmo formato de `dueAt`. */
  to?: string;
  sort?: 'asc' | 'desc';
  limit?: number;
}

export interface Summary {
  total: number;
  done: number;
  pending: number;
  overdue: number;
  /** Pendentes com prazo nos próximos 7 dias. */
  dueSoon: number;
}

export interface SubjectStat {
  subjectId: number | null;
  name: string | null;
  color: string | null;
  total: number;
  done: number;
  overdue: number;
}

export interface CategoryStat {
  category: Category;
  total: number;
  done: number;
}

export interface Preferences {
  userName: string;
  remindersEnabled: boolean;
  /** Antecedência do lembrete em minutos (0 = no horário do prazo). */
  reminderLeadMinutes: number;
}
