// TEMP(bolt-overview) — whole file. SB scope = QATESmartbuilder projects minus the Bolt allowlist.
// TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
import { useCallback, useEffect, useState } from 'react';
import { projectsApiService } from '../services/projectsApi';
import { isTempBoltProjectId, TEMP_SB_OVERVIEW_REPO_NAME } from '../constants/overviewCategories';

const PER_PAGE = 100;

export type TempSbScopeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; projectIds: number[] }
  | { status: 'empty' }
  | { status: 'error' };

async function fetchSbProjectIdsWithoutBolt(): Promise<number[]> {
  const repos = [TEMP_SB_OVERVIEW_REPO_NAME];
  const first = await projectsApiService.getProjectsList(1, PER_PAGE, undefined, undefined, repos);
  if (!first || !Array.isArray(first.data) || !first.meta) {
    throw new Error('Unexpected projects list response');
  }
  const items = [...first.data];
  const totalPages = Math.max(1, Math.ceil(first.meta.totalItems / (first.meta.itemsPerPage || PER_PAGE)));
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        projectsApiService.getProjectsList(i + 2, PER_PAGE, undefined, undefined, repos),
      ),
    );
    for (const res of rest) {
      if (!res || !Array.isArray(res.data)) throw new Error('Unexpected projects list response');
      items.push(...res.data);
    }
  }
  const ids = new Set<number>();
  for (const p of items) {
    const id = Number(p.attributes?.id);
    if (Number.isFinite(id) && id > 0 && !isTempBoltProjectId(id)) ids.add(id);
  }
  return [...ids].sort((a, b) => a - b);
}

export function useTempSbScopeProjectIds(enabled: boolean): TempSbScopeState & { retry: () => void } {
  const [state, setState] = useState<TempSbScopeState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    fetchSbProjectIdsWithoutBolt()
      .then(projectIds => {
        if (cancelled) return;
        setState(projectIds.length > 0 ? { status: 'ready', projectIds } : { status: 'empty' });
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load SB projects for Overview scope', err);
        setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  // Avoid a one-render gap where `enabled` flipped true but the effect hasn't set 'loading' yet.
  if (enabled && state.status === 'idle') return { status: 'loading', retry };
  return { ...state, retry };
}
