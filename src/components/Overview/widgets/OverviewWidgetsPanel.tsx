import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from 'lucide-react';
import { fetchOverviewWidgets, type OverviewWidgetsResponse } from '../../../services/overviewWidgetsApi';
import { fetchDefectGroups } from '../../../services/defectGroupsApi';
import { exportOverviewWidgets, type OverviewExporter } from '../../../services/overviewExportService';
import OverviewSummaryCards from './OverviewSummaryCards';
import WeeklyExecutionWidget from './WeeklyExecutionWidget';
import ServiceCountryExecutionWidget from './ServiceCountryExecutionWidget';
import DefectBreakdownByServiceWidget from './DefectBreakdownByServiceWidget';
import NoErrorThisWeek from './NoErrorThisWeek';
import { toDateOnly } from './navigateToFilteredLaunches';

interface OverviewWidgetsPanelProps {
  projectIds?: number[];
  gitlabProjectNames?: string[];
  registerExporter?: (exporter: OverviewExporter | null) => void;
}

const OverviewWidgetsPanel: React.FC<OverviewWidgetsPanelProps> = ({ projectIds, gitlabProjectNames, registerExporter }) => {
  const [data, setData] = useState<OverviewWidgetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defectColorMap, setDefectColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDefectGroups()
      .then(groups => {
        const map: Record<string, string> = {};
        for (const group of groups) {
          for (const type of group.defectTypes) {
            map[type.slug] = type.color;
          }
        }
        setDefectColorMap(map);
      })
      .catch(() => { /* use fallback hardcoded colors */ });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const hasProjectIds = projectIds && projectIds.length > 0;
        const hasRepoFilter = gitlabProjectNames != null && gitlabProjectNames.length > 0;
        const params = (hasProjectIds || hasRepoFilter)
          ? { projectIds: hasProjectIds ? projectIds : undefined, gitlabProjectNames: hasRepoFilter ? gitlabProjectNames : undefined }
          : undefined;
        const res = await fetchOverviewWidgets(params);
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load overview widgets');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [projectIds, gitlabProjectNames]);

  useEffect(() => {
    if (!registerExporter) return;
    if (!data) {
      registerExporter(null);
      return;
    }
    const exporter: OverviewExporter = format => exportOverviewWidgets({
      format,
      domSelector: '[data-overview-export="widgets"]',
      data,
      filters: {
        gitlabProjectNames,
        projectIds,
      },
    });
    registerExporter(exporter);
    return () => registerExporter(null);
  }, [registerExporter, data, projectIds, gitlabProjectNames]);

  const summaryStats = useMemo(() => {
    if (!data) return null;
    const { pass, fail, passRate } = data.weeklyTotals;
    const totalTests = pass + fail;
    const failedRate = passRate != null ? Math.round((100 - passRate) * 10) / 10 : null;
    const totalIssues = data.defectMix.reduce((sum, item) => sum + item.failCount, 0);
    return { totalTests, passRate, failedRate, totalIssues };
  }, [data]);

  const windowDates = useMemo(() => {
    if (!data) return null;
    return { startFrom: toDateOnly(data.window.from), startTo: toDateOnly(data.window.to) };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader className="w-10 h-10 text-cyan-500 animate-spin" aria-hidden />
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading widgets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 text-center">
        <p className="text-red-800 dark:text-red-300 font-medium">Could not load overview widgets</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
      </div>
    );
  }

  if (!data || !windowDates) {
    return null;
  }

  return (
    <div className="space-y-6" data-overview-export="widgets">
      {summaryStats && (
        <OverviewSummaryCards
          totalTests={summaryStats.totalTests}
          passRate={summaryStats.passRate}
          failedRate={summaryStats.failedRate}
          totalIssues={summaryStats.totalIssues}
          windowStartFrom={windowDates.startFrom}
          windowStartTo={windowDates.startTo}
        />
      )}
      <WeeklyExecutionWidget
        weeklyTotals={data.weeklyTotals}
        window={data.window}
        defectMix={data.defectMix}
        windowStartFrom={windowDates.startFrom}
        windowStartTo={windowDates.startTo}
        defectColorMap={defectColorMap}
      />
      <ServiceCountryExecutionWidget
        executionByService={data.executionByService}
        executionByCountry={data.executionByCountry}
        executionByCountryByService={data.executionByCountryByService ?? {}}
        windowStartFrom={windowDates.startFrom}
        windowStartTo={windowDates.startTo}
      />
      <DefectBreakdownByServiceWidget
        defectSeriesByProject={data.defectSeriesByProject}
        executionByService={data.executionByService}
        window={data.window}
        windowStartFrom={windowDates.startFrom}
        windowStartTo={windowDates.startTo}
        defectColorMap={defectColorMap}
      />
      <NoErrorThisWeek
        executionByService={data.executionByService}
        windowStartFrom={windowDates.startFrom}
        windowStartTo={windowDates.startTo}
      />
    </div>
  );
};

export default OverviewWidgetsPanel;
