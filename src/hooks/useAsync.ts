import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Runs an async function on mount and whenever `deps` changes, tracking
 * loading/error/data. Guards against a stale response landing after a
 * newer call has already started (fast tab-switch, changing deps quickly)
 * by ignoring any resolution that isn't from the most recent call.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const callId = useRef(0);
  // Only used to force a reload without changing `deps` semantics.
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    const myCallId = ++callId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fn()
      .then((data) => {
        if (myCallId !== callId.current) return; // superseded
        setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (myCallId !== callId.current) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fn` intentionally excluded; callers pass a fresh closure each render and including it would defeat the deps array entirely.
  }, [...deps, reloadToken]);

  return { ...state, reload };
}
