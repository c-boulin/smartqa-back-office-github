import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Download, LayoutGrid, Rocket, Shield } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import OverviewLaunchesTable from '../components/Overview/OverviewLaunchesTable';
import OverviewTestsTable from '../components/Overview/OverviewTestsTable';
import OverviewWidgetsPanel from '../components/Overview/widgets/OverviewWidgetsPanel';
import OverviewProjectSidebar from '../components/Overview/OverviewProjectSidebar';
import DownloadModal from '../components/Reports/DownloadModal';
import type { OverviewExporter, OverviewExportFormat } from '../services/overviewExportService';
import toast from 'react-hot-toast';

type TabType = 'widgets' | 'launches' | 'tests';

const Overview: React.FC = () => {
  const { hasPermission } = useAuth();
  const canAccessOverview = hasPermission(PERMISSIONS.ADMIN_PANEL.READ);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
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

  const handleSelectReposChange = useCallback((repoSlugs: string[]) => {
    setSelectedRepos(repoSlugs);
  }, []);

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

  useEffect(() => {
    if (!canAccessOverview) {
      toast.error('You do not have permission to access this page');
    }
  }, [canAccessOverview]);

  if (!canAccessOverview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-gray-400">You do not have permission to access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 data-mipqa="overview-title" className="text-3xl font-bold text-slate-900 dark:text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Scheduled Automation tests - Last 7 days</p>
      </div>

      <div className="flex gap-6">
        <OverviewProjectSidebar
          selectedRepos={selectedRepos}
          onSelectReposChange={handleSelectReposChange}
        />

        <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
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
                    {exporting ? 'Exporting…' : 'Export report'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'widgets' && (
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40">
              <OverviewWidgetsPanel
                gitlabProjectNames={selectedRepos.length > 0 ? selectedRepos : undefined}
                registerExporter={activeTab === 'widgets' ? registerExporter : undefined}
              />
            </div>
          )}
          {activeTab === 'launches' && (
            <div className="p-6 min-h-[12rem] bg-slate-50 dark:bg-slate-900/40">
              <OverviewLaunchesTable
                gitlabProjectNames={selectedRepos.length > 0 ? selectedRepos : undefined}
                registerExporter={activeTab === 'launches' ? registerExporter : undefined}
              />
            </div>
          )}
          {activeTab === 'tests' && (
            <div className="p-6 min-h-[12rem] bg-slate-50 dark:bg-slate-900/40">
              <OverviewTestsTable
                gitlabProjectNames={selectedRepos.length > 0 ? selectedRepos : undefined}
              />
            </div>
          )}
        </div>
      </div>
      <DownloadModal
        isOpen={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        onDownloadPDF={() => void handleExport('pdf')}
        onDownloadCSV={() => void handleExport('csv')}
        reportTitle={`Overview – ${activeTab === 'widgets' ? 'Widgets' : activeTab === 'tests' ? 'Tests' : 'Launches'}`}
      />
    </div>
  );
};

export default Overview;
