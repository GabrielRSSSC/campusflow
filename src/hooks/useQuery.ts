import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { type DependencyList, useCallback, useEffect, useState } from 'react';

import { onDataChanged } from '@/database/changes';

interface QueryResult<T> {
  /** Identifica a execução que produziu este resultado. */
  key?: string;
  data?: T;
  error?: Error;
}

/**
 * Executa uma consulta no SQLite e a repete quando `deps` mudam ou quando qualquer
 * gravação chama `notifyDataChanged()`. Os dados anteriores ficam visíveis durante a recarga.
 * `deps` deve conter apenas valores primitivos.
 */
export function useQuery<T>(query: (db: SQLiteDatabase) => Promise<T>, deps: DependencyList) {
  const db = useSQLiteContext();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<QueryResult<T>>({});
  // Só o gesto de "puxar para atualizar" mostra o indicador; recargas automáticas não.
  const [refreshing, setRefreshing] = useState(false);
  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const refresh = useCallback(() => {
    setRefreshing(true);
    reload();
  }, [reload]);
  // `undefined` vira um marcador próprio para não se confundir com `null` (ex.: filtro "Sem disciplina").
  const key = JSON.stringify([version, ...deps], (_, value) => (value === undefined ? '\u0000undefined' : value));

  useEffect(() => onDataChanged(reload), [reload]);

  useEffect(() => {
    let active = true;
    query(db)
      .then(
        (data) => active && setResult({ key, data }),
        (error: Error) => active && setResult((current) => ({ key, data: current.data, error })),
      )
      .finally(() => active && setRefreshing(false));
    return () => {
      active = false;
    };
    // `query` é recriada a cada render; as dependências reais estão em `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);

  return {
    data: result.data,
    error: result.error,
    loading: result.key !== key,
    reload,
    refresh,
    refreshing,
  };
}
