/**
 * ActionLoader — shared inline loading state tracker for row/card-level actions.
 * Keeps a Set of IDs currently in-flight so each row can show its own spinner
 * without locking the whole page.
 *
 * Usage:
 *   const { isLoading, run } = useActionLoader();
 *   <button disabled={isLoading(id)} onClick={() => run(id, () => api.delete(...))}>
 *     {isLoading(id) ? <Loader2 className="animate-spin" /> : <Trash2 />}
 *   </button>
 */

import { useState, useCallback } from 'react';

export function useActionLoader() {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const isLoading = useCallback(
    (id: string) => loadingIds.has(id),
    [loadingIds]
  );

  const run = useCallback(
    async (id: string, fn: () => Promise<void>) => {
      setLoadingIds(prev => new Set(prev).add(id));
      try {
        await fn();
      } finally {
        setLoadingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    []
  );

  return { isLoading, run };
}

