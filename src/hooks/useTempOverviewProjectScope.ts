// TEMP(bolt-overview) — whole file. SB and Bolt project_ids are resolved from one projects API response
// of the current environment: Bolt = projects whose title matches, SB = every other QATESmartbuilder project.
// TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
import { useCallback, useEffect, useState } from 'react';
import { projectsApiService, type ApiProject } from '../services/projectsApi';
import {
  isTempBoltProjectTitle,
  TEMP_SB_OVERVIEW_REPO_NAME,
  type OverviewProjectScope,
} from '../constants/overviewCategories';

const PER_PAGE = 100;

type ScopePartition = Record<OverviewProjectScope, number[]>;

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; partition: ScopePartition }
  | { status: 'error' };

export type TempOverviewScopeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; projectIds: number[] }
  | { status: 'empty' }
  | { status: 'error' };

async function fetchSmartbuilderProjects(): Promise<ApiProject[]> {
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
  return items;
}

function partitionProjects(projects: ApiProject[]): ScopePartition {
  const bolt = new Set<number>();
  const sb = new Set<number>();
  for (const p of projects) {
    const id = Number(p.attributes?.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    (isTempBoltProjectTitle(p.attributes?.title) ? bolt : sb).add(id);
  }
  const sorted = (ids: Set<number>) => [...ids].sort((a, b) => a - b);
  return { bolt: sorted(bolt), sb: sorted(sb) };
}

export function useTempOverviewProjectScope(
  scope: OverviewProjectScope | null,
): TempOverviewScopeState & { retry: () => void } {
  const enabled = scope !== null;
  const [state, setState] = useState<FetchState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    fetchSmartbuilderProjects()
      .then(projects => {
        if (!cancelled) setState({ status: 'loaded', partition: partitionProjects(projects) });
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load SB/Bolt projects for Overview scope', err);
        setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  if (scope === null) return { status: 'idle', retry };
  if (state.status === 'loaded') {
    const projectIds = state.partition[scope];
    return projectIds.length > 0 ? { status: 'ready', projectIds, retry } : { status: 'empty', retry };
  }
  // Avoid a one-render gap where the scope was just enabled but the effect hasn't set 'loading' yet.
  if (state.status === 'idle') return { status: 'loading', retry };
  return { ...state, retry };
}
