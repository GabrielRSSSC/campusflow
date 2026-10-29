// Aviso global de "o banco mudou": as consultas abertas (hooks/useQuery) recarregam.
const listeners = new Set<() => void>();

export function onDataChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDataChanged(): void {
  listeners.forEach((listener) => listener());
}
