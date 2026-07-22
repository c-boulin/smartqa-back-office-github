import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchOverviewTests,
  type OverviewLaunchesMeta,
  type OverviewTestApiRow,
  type OverviewTestsSortColumn,
} from '../services/overviewWidgetsApi';

interface UseOverviewTestsParams {
  /** Additional repo filter applied on top of URL params (comes from the Overview page sidebar). */
  gitlabProjectNames?: string[];
}

interface UseOverviewTestsResult {
  rows: OverviewTestApiRow[];
  meta: OverviewLaunchesMeta;
  loading: boolean;
  error: string | null;
  page: number;
  perPage: number;
  sort: OverviewTestsSortColumn;
  direction: 'asc' | 'desc';
  setPage: (page: number) => void;
  setSort: (sort: OverviewTestsSortColumn, direction: 'asc' | 'desc') => void;
  filters: {
    projectIds: number[];
    startFrom?: string;
    startTo?: string;
    status?: 'passed' | 'failed';
    defectTag?: string;
    hasIssues: boolean;
  };
  reload: () => void;
}

const DEFAULT_PER_PAGE = 15;
const DEFAULT_SORT: OverviewTestsSortColumn = 'start_time';
const DEFAULT_DIRECTION: 'asc' | 'desc' = 'desc';

function parseIntParam(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseProjectIds(value: string | null): number[] {
  if (value === null || value === '') return [];
  return value
    .split(',')
    .map(s => Number.parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0);
}

function parseSort(value: string | null): OverviewTestsSortColumn {
  if (value === 'name' || value === 'duration' || value === 'status' || value === 'start_time') {
    return value;
  }
  return DEFAULT_SORT;
}

function parseDirection(value: string | null): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : DEFAULT_DIRECTION;
}

function parseStatus(value: string | null): 'passed' | 'failed' | undefined {
  return value === 'passed' || value === 'failed' ? value : undefined;
}

export function useOverviewTests({ gitlabProjectNames }: UseOverviewTestsParams): UseOverviewTestsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<OverviewTestApiRow[]>([]);
  const [meta, setMeta] = useState<OverviewLaunchesMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: DEFAULT_PER_PAGE,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const page = parseIntParam(searchParams.get('page'), 1);
  const perPage = parseIntParam(searchParams.get('per_page'), DEFAULT_PER_PAGE);
  const sort = parseSort(searchParams.get('sort'));
  const direction = parseDirection(searchParams.get('direction'));

  const filters = useMemo(() => {
    const startFrom = searchParams.get('start_from') ?? undefined;
    const startTo = searchParams.get('start_to') ?? undefined;
    const status = parseStatus(searchParams.get('status'));
    const defectTag = searchParams.get('defect_tag') ?? undefined;
    const hasIssues = searchParams.get('has_issues') === '1';
    const projectIds = parseProjectIds(searchParams.get('project_ids'));
    return {
      projectIds,
      startFrom: startFrom === '' ? undefined : startFrom,
      startTo: startTo === '' ? undefined : startTo,
      status,
      defectTag: defectTag === '' ? undefined : defectTag,
      hasIssues,
    };
  }, [searchParams]);

  const gitlabKey = gitlabProjectNames == null ? '' : gitlabProjectNames.join(',');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchOverviewTests({
          page,
          perPage,
          sort,
          direction,
          projectIds: filters.projectIds.length > 0 ? filters.projectIds : undefined,
          gitlabProjectNames: gitlabKey === '' ? undefined : gitlabKey.split(','),
          startFrom: filters.startFrom,
          startTo: filters.startTo,
          status: filters.status,
          defectTag: filters.defectTag,
          hasIssues: filters.hasIssues,
        });
        if (cancelled) return;
        setRows(Array.isArray(res.tests) ? res.tests : []);
        setMeta(res.meta ?? {
          currentPage: 1,
          lastPage: 1,
          perPage: DEFAULT_PER_PAGE,
          total: 0,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load tests');
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [page, perPage, sort, direction, filters, gitlabKey, reloadToken]);

  const setPage = (next: number): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('page', String(next));
      return params;
    }, { replace: true });
  };

  const setSort = (nextSort: OverviewTestsSortColumn, nextDirection: 'asc' | 'desc'): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('sort', nextSort);
      params.set('direction', nextDirection);
      params.set('page', '1');
      return params;
    }, { replace: true });
  };

  const reload = (): void => setReloadToken(t => t + 1);

  return {
    rows,
    meta,
    loading,
    error,
    page,
    perPage,
    sort,
    direction,
    setPage,
    setSort,
    filters,
    reload,
  };
}
