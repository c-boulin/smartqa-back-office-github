import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { DOC_SECTIONS, COLOR_MAP } from '../data/documentationData';
import DocSideNav from '../components/Documentation/DocSideNav';
import DocSearchBar from '../components/Documentation/DocSearchBar';

// Lazy-load section content components
const SECTION_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {
  'projects-management':    lazy(() => import('../components/Documentation/sections/DocProjectsManagement')),
  'test-cases':             lazy(() => import('../components/Documentation/sections/DocTestCases')),
  'test-execution':         lazy(() => import('../components/Documentation/sections/DocTestExecution')),
  'reports-analytics':      lazy(() => import('../components/Documentation/sections/DocReportsAnalytics')),
  'downloading-reports':    lazy(() => import('../components/Documentation/sections/DocDownloadingReports')),
  'automated-configuration':lazy(() => import('../components/Documentation/sections/DocAutomatedConfiguration')),
  'tags-organization':      lazy(() => import('../components/Documentation/sections/DocTagsOrganization')),
  'dashboard-overview':     lazy(() => import('../components/Documentation/sections/DocDashboardOverview')),
  'best-practices':         lazy(() => import('../components/Documentation/sections/DocBestPractices')),
};

const ContentSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
  </div>
);

const DocumentationDetail: React.FC = () => {
  const { sectionId = 'projects-management' } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const section = DOC_SECTIONS.find(s => s.id === sectionId);
  const colors = section ? COLOR_MAP[section.color] : COLOR_MAP['cyan'];
  const Icon = section?.icon;

  // Search: filter sections matching query, navigate to first match
  const handleSearch = (val: string) => {
    setSearch(val);
    if (!val.trim()) return;
    const q = val.toLowerCase().trim();
    const match = DOC_SECTIONS.find(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q)
    );
    if (match && match.id !== sectionId) {
      navigate(`/documentation/${match.id}`);
      setSearch('');
    }
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return DOC_SECTIONS.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q)
    );
  }, [search]);

  const SectionContent = SECTION_COMPONENTS[sectionId];

  if (!section || !SectionContent) {
    return (
      <div className="flex items-center justify-center py-32" data-mipqa="doc-detail-not-found">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mb-3">
            Section not found
          </p>
          <button
            type="button"
            onClick={() => navigate('/documentation')}
            data-mipqa="doc-detail-back-button"
            className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline"
          >
            Back to Documentation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-mipqa="doc-detail-page">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/documentation')}
          data-mipqa="doc-detail-back-link"
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Documentation
        </button>

        {/* Search bar top-right */}
        <div className="relative w-72">
          <DocSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search documentation"
            className="w-full"
          />
          {/* Dropdown results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
              {searchResults.map(result => {
                const RIcon = result.icon;
                const rc = COLOR_MAP[result.color];
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      navigate(`/documentation/${result.id}`);
                      setSearch('');
                    }}
                    data-mipqa={`doc-search-result-${result.id}-button`}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                  >
                    <RIcon className={`w-4 h-4 shrink-0 ${rc.text}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{result.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          data-mipqa="doc-detail-mobile-menu-button"
          className="lg:hidden p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          data-mipqa="doc-detail-mobile-overlay"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contents</p>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                data-mipqa="doc-detail-mobile-close-button"
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DocSideNav
              activeId={sectionId}
            />
          </div>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <DocSideNav activeId={sectionId} />
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Section header card */}
          <div className={`rounded-2xl border ${colors.border} bg-white dark:bg-slate-800/60 p-6 mb-6 shadow-sm`}>
            <div className="flex items-start gap-4">
              {Icon && (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.iconBg} shrink-0`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
              )}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${colors.text} mb-1`}>
                  {section.subtitle}
                </p>
                <h1
                  className="text-2xl font-bold text-slate-900 dark:text-white"
                  data-mipqa="doc-detail-title"
                >
                  {section.title}
                </h1>
              </div>
            </div>
          </div>

          {/* Section content */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
            <Suspense fallback={<ContentSkeleton />}>
              <SectionContent />
            </Suspense>
          </div>

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between mt-6 gap-4">
            {(() => {
              const idx = DOC_SECTIONS.findIndex(s => s.id === sectionId);
              const prev = idx > 0 ? DOC_SECTIONS[idx - 1] : null;
              const next = idx < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[idx + 1] : null;
              const PrevIcon = prev?.icon;
              const NextIcon = next?.icon;
              return (
                <>
                  <div className="flex-1">
                    {prev && (
                      <button
                        type="button"
                        onClick={() => navigate(`/documentation/${prev.id}`)}
                        data-mipqa="doc-detail-prev-button"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-cyan-500/40 hover:shadow-sm transition-all text-left group w-full max-w-xs"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400 mb-0.5">Previous</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                            {PrevIcon && <PrevIcon className={`w-3.5 h-3.5 shrink-0 ${COLOR_MAP[prev.color].text}`} />}
                            {prev.title}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex justify-end">
                    {next && (
                      <button
                        type="button"
                        onClick={() => navigate(`/documentation/${next.id}`)}
                        data-mipqa="doc-detail-next-button"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-cyan-500/40 hover:shadow-sm transition-all text-right group w-full max-w-xs justify-end"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400 mb-0.5">Next</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5 justify-end">
                            {NextIcon && <NextIcon className={`w-3.5 h-3.5 shrink-0 ${COLOR_MAP[next.color].text}`} />}
                            {next.title}
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors rotate-180 shrink-0" />
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationDetail;
