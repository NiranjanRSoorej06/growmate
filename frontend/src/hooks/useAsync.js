import { useCallback, useEffect, useRef, useState } from "react";

// Runs an async loader on mount (and whenever deps change). `reload` runs it again.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const tick = useRef(0);

  const run = useCallback(async () => {
    const id = ++tick.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === tick.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === tick.current) setState({ data: null, error, loading: false });
    }
  }, []);

  useEffect(() => {
    run();
    return () => {
      tick.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}
