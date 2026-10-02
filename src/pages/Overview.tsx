import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Download, LayoutGrid, Rocket } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import OverviewLaunchesTable from '../components/Overview/OverviewLaunchesTable';
import OverviewTestsTable from '../components/Overview/OverviewTestsTable';
import OverviewWidgetsPanel from '../components/Overview/widgets/OverviewWidgetsPanel';
import OverviewProjectSidebar from '../components/Overview/OverviewProjectSidebar';
import DownloadModal from '../components/Reports/DownloadModal';
import type { OverviewExporter, OverviewExportFormat } from '../services/overviewExportService';
import toast from 'react-hot-toast';
import {
  EMPTY_OVERVIEW_CATEGORY_SELECTION,
  type OverviewCategorySelection,
} from '../constants/overviewCategories';

type TabType = 'widgets' | 'launches' | 'tests';

const Overview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selection, setSelection] = useState<OverviewCategorySelection>(EMPTY_OVERVIEW_CATEGORY_SELECTION);
  const exporterRef = useRef<OverviewExporter | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const registerExporter = useCallback((exporter: OverviewExporter | null) => {
    exporterRef.current = exporter;
  }, []);

  const handleOpenExport = useCallback(() => {
    if (exporterRef.current === null) {
      toast.error('Nothing to export yet — wait for data to load.');
      return;
    }
    setDownloadOpen(true);
  }, []);

  const handleExport = useCallback(async (format: OverviewExportFormat) => {
    const exporter = exporterRef.current;
    if (exporter === null) {
      toast.error('Nothing to export yet — wait for data to load.');
      return;
    }
    try {
      setExporting(true);
      await exporter(format);
      toast.success(`Overview ${format.toUpperCase()} downloaded`);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to generate ${format.toUpperCase()}`;
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleSelectionChange = useCallback((next: OverviewCategorySelection) => {
    setSelection(next);
  }, []);

  const selectedRepos = selection.repoNames.length > 0 ? selection.repoNames : undefined;
  // TEMP(bolt-overview) — sidebar projectIds only come from the Bolt placeholder; sent alone (no gitlab_project_name).
  // TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
  const selectedProjectIds = selection.projectIds.length > 0 ? selection.projectIds : undefined;

  const isLaunchesPath = useMemo(() => {
    const normalized = location.pathname.replace(/\/+$/, '');

    return normalized === '/overview/launches' || normalized.startsWith('/overview/launches/');
  }, [location.pathname]);

  const isTestsPath = useMemo(() => {
    const normalized = location.pathname.replace(/\/+$/, '');

    return normalized === '/overview/tests' || normalized.startsWith('/overview/tests/');
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (isTestsPath) {
      return 'tests';
    }
    if (isLaunchesPath) {
      return 'launches';
    }

    const tabParam = searchParams.get('tab');
    if (tabParam === 'launches') return 'launches';
    if (tabParam === 'tests') return 'tests';
    return 'widgets';
  });

  useEffect(() => {
    const tre = searchParams.get('tre');
    if (isTestsPath) {
      setActiveTab('tests');
      return;
    }
    if (isLaunchesPath || (tre !== null && tre !== '')) {
      setActiveTab('launches');
      return;
    }

    setActiveTab('widgets');
  }, [isLaunchesPath, isTestsPath, searchParams]);


  return (
    <>
      <div className="flex -ml-6 -mt-6">
        <OverviewProjectSidebar
          selection={selection}
          onSelectionChange={handleSelectionChange}
        />

        <div className="flex-1 min-w-0 flex flex-col space-y-6 p-6" style={{ containerType: 'inline-size', containerName: 'overview-main' }}>
          <div>
            <h1 data-mipqa="overview-title" className="text-3xl font-bold text-slate-900 dark:text-white">Overview</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Scheduled Automation tests - Last 7 days</p>
          </div>

          {/* Tab bar — sits on page background, no rounded box */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
            <nav className="flex -mb-px">
              <button
                data-mipqa="overview-tab-widgets"
                type="button"
                onClick={() => {
                  if (activeTab === 'widgets') {
                    return;
                  }
                  setActiveTab('widgets');
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete('tab');
                    return next;
                  }, { replace: true });
                  navigate('/overview', { replace: true });
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'widgets'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Widget
              </button>
              <button
                data-mipqa="overview-tab-launches"
                type="button"
                onClick={() => {
                  if (activeTab === 'launches') {
                    return;
                  }
                  setActiveTab('launches');
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.set('tab', 'launches');
                    return next;
                  }, { replace: true });
                  navigate({
                    pathname: '/overview/launches',
                    search: searchParams.toString() !== '' ? `?${searchParams.toString()}` : '',
                  }, { replace: true });
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'launches'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Rocket className="w-4 h-4" />
                Launches
              </button>
            </nav>
            <div className="pr-4">
              {activeTab === 'widgets' && (
                <button
                  type="button"
                  data-mipqa="overview-export-report-btn"
                  onClick={handleOpenExport}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Export report'}
                </button>
              )}
            </div>
          </div>

          {/* Content — no wrapper box, sits directly on page background */}
          <div>
            {activeTab === 'widgets' && (
              <div className="pt-2">
                <OverviewWidgetsPanel
                  projectIds={selectedProjectIds}
                  gitlabProjectNames={selectedRepos}
                  registerExporter={activeTab === 'widgets' ? registerExporter : undefined}
                />
              </div>
            )}
            {activeTab === 'launches' && (
              <div className="pt-2 min-h-[12rem]">
                <OverviewLaunchesTable
                  externalProjectIds={selectedProjectIds}
                  gitlabProjectNames={selectedRepos}
                  registerExporter={activeTab === 'launches' ? registerExporter : undefined}
                />
              </div>
            )}
            {activeTab === 'tests' && (
              <div className="pt-2 min-h-[12rem]">
                <OverviewTestsTable
                  projectIds={selectedProjectIds}
                  gitlabProjectNames={selectedRepos}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <DownloadModal
        isOpen={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        onDownloadPDF={() => void handleExport('pdf')}
        onDownloadCSV={() => void handleExport('csv')}
        reportTitle={`Overview – ${activeTab === 'widgets' ? 'Widgets' : activeTab === 'tests' ? 'Tests' : 'Launches'}`}
      />
    </>
  );
};

export default Overview;
