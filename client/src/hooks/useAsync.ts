import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../services/api';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs `fn` on mount (and whenever `deps` change) and exposes `{ data, loading,
 * error, refetch }`. Stale results are discarded when deps change or on unmount.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & {
  refetch: () => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const reqId = useRef(0);

  const run = useCallback(() => {
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => {
        if (id === reqId.current) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (id !== reqId.current) return;
        const message =
          err instanceof ApiRequestError || err instanceof Error ? err.message : 'Unexpected error';
        setState({ data: null, loading: false, error: message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      reqId.current++;
    };
  }, [run]);

  return { ...state, refetch: run };
}
