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
    groupByLaunch: boolean;
  };
  reload: () => void;
}

const DEFAULT_PER_PAGE = 15;
const FETCH_ALL_PER_PAGE = 100;
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

  const startFromParam = searchParams.get('start_from');
  const startToParam = searchParams.get('start_to');
  const statusParam = searchParams.get('status');
  const defectTagParam = searchParams.get('defect_tag');
  const hasIssuesParam = searchParams.get('has_issues');
  const groupByParam = searchParams.get('group_by');
  const projectIdsParam = searchParams.get('project_ids');

  // Keyed on individual params so a page change alone does not rebuild filters (and refetch).
  const filters = useMemo(() => ({
    projectIds: parseProjectIds(projectIdsParam),
    startFrom: startFromParam == null || startFromParam === '' ? undefined : startFromParam,
    startTo: startToParam == null || startToParam === '' ? undefined : startToParam,
    status: parseStatus(statusParam),
    defectTag: defectTagParam == null || defectTagParam === '' ? undefined : defectTagParam,
    hasIssues: hasIssuesParam === '1',
    groupByLaunch: groupByParam === 'launch',
  }), [startFromParam, startToParam, statusParam, defectTagParam, hasIssuesParam, groupByParam, projectIdsParam]);

  const gitlabKey = gitlabProjectNames == null ? '' : gitlabProjectNames.join(',');
  // Launch-grouped mode loads everything once and paginates launches client-side.
  const fetchPage = filters.groupByLaunch ? 1 : page;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseParams = {
          sort,
          direction,
          projectIds: filters.projectIds.length > 0 ? filters.projectIds : undefined,
          gitlabProjectNames: gitlabKey === '' ? undefined : gitlabKey.split(','),
          startFrom: filters.startFrom,
          startTo: filters.startTo,
          status: filters.status,
          defectTag: filters.defectTag,
          hasIssues: filters.hasIssues,
        };
        if (filters.groupByLaunch) {
          const all: OverviewTestApiRow[] = [];
          let current = 1;
          let last = 1;
          do {
            const res = await fetchOverviewTests({ ...baseParams, page: current, perPage: FETCH_ALL_PER_PAGE });
            if (cancelled) return;
            if (Array.isArray(res.tests)) all.push(...res.tests);
            last = res.meta?.lastPage ?? current;
            current += 1;
          } while (current <= last);
          setRows(all);
          setMeta({ currentPage: 1, lastPage: 1, perPage: all.length, total: all.length });
          return;
        }
        const res = await fetchOverviewTests({ ...baseParams, page: fetchPage, perPage });
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
  }, [fetchPage, perPage, sort, direction, filters, gitlabKey, reloadToken]);

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
