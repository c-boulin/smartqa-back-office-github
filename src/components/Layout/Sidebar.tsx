import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  TestTube,
  Play,
  Calendar,
  BarChart3,
  Settings,
  Layers,
  ChevronDown,
  Loader,
  Search,
  X,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { projectsApiService } from '../../services/projectsApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useTemplateContext } from '../../hooks/useTemplateContext';
import { PERMISSIONS } from '../../utils/permissions';
import { Project } from '../../types';

type NavItem = {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permissions: string[];
};

const projectNavItems: NavItem[] = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    permissions: [PERMISSIONS.TEST_CASE.READ, PERMISSIONS.TEST_RUN.READ]
  },
  {
    path: '/test-cases',
    icon: TestTube,
    label: 'Test Cases',
    permissions: [PERMISSIONS.TEST_CASE.READ]
  },
  {
    path: '/shared-steps',
    icon: Layers,
    label: 'Shared Steps',
    permissions: [PERMISSIONS.SHARED_STEP.READ]
  },
  {
    path: '/test-runs',
    icon: Play,
    label: 'Test Runs',
    permissions: [PERMISSIONS.TEST_RUN.READ]
  },
  {
    path: '/test-plans',
    icon: Calendar,
    label: 'Test Plans',
    permissions: [PERMISSIONS.TEST_PLAN.READ]
  },
  {
    path: '/reports',
    icon: BarChart3,
    label: 'Reports',
    permissions: [PERMISSIONS.TEST_RUN.READ]
  }
];

const templateNavItems: NavItem[] = [
  {
    path: '/test-cases',
    icon: TestTube,
    label: 'Test Cases',
    permissions: [PERMISSIONS.TEST_CASE.READ]
  },
  {
    path: '/shared-steps',
    icon: Layers,
    label: 'Shared Steps',
    permissions: [PERMISSIONS.SHARED_STEP.READ]
  }
];

const adminNavItems: NavItem[] = [
  {
    path: '/settings',
    icon: Settings,
    label: 'Settings',
    permissions: [PERMISSIONS.ADMIN_PANEL.READ]
  }
];

const Sidebar: React.FC = () => {
  const { state, dispatch, getSelectedProject, loadProjects } = useApp();
  const { state: authState } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const { isTemplateContext } = useTemplateContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allItems, setAllItems] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const primaryNavItems = (isTemplateContext ? templateNavItems : projectNavItems).filter(
    item => item.permissions.length === 0 || hasAnyPermission(item.permissions)
  );
  const visibleAdminNav = adminNavItems.filter(
    item => item.permissions.length === 0 || hasAnyPermission(item.permissions)
  );

  /** Templates are not loaded into state.projects (only non-templates from loadProjects); do not use a template pool from context. */
  const poolForClientSearch = isTemplateContext ? [] : state.projects;

  const itemsToShow = allItems.length > 0 ? allItems : poolForClientSearch;

  const filteredItems = itemsToShow
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const runSearchApi = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setAllItems([]);
        return;
      }

      if (term.length < 3) {
        return;
      }
      // Projects: skip server search when few items are already in memory (client filter handles it).
      if (!isTemplateContext && poolForClientSearch.length < 100) {
        return;
      }

      try {
        setIsSearching(true);
        const firstPageResponse = isTemplateContext
          ? await projectsApiService.getTemplatesForSidebarPage(1, term)
          : await projectsApiService.getProjectsForSidebarPage(1, term);
        if (firstPageResponse.meta.totalItems === 0) {
          setAllItems([]);
          return;
        }
        const searchResults = firstPageResponse.data.map(project =>
          projectsApiService.transformApiProject(project)
        );
        setAllItems(searchResults);
      } catch (error) {
        console.error('❌ Failed to search selector list:', error);
        setAllItems([]);
      } finally {
        setIsSearching(false);
      }
    },
    [isTemplateContext, poolForClientSearch.length]
  );

  const loadMoreItems = useCallback(async () => {
    if (isLoadingMore || !hasMoreItems || searchTerm) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = isTemplateContext
        ? await projectsApiService.getTemplatesForSidebarPage(nextPage)
        : await projectsApiService.getProjectsForSidebarPage(nextPage);
      const newItems = response.data.map(project => projectsApiService.transformApiProject(project));
      setAllItems(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
      setHasMoreItems(newItems.length === response.meta.itemsPerPage);
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreItems, currentPage, searchTerm, isTemplateContext]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;

      if (bottom && hasMoreItems && !isLoadingMore && !searchTerm) {
        loadMoreItems();
      }
    },
    [hasMoreItems, isLoadingMore, searchTerm, loadMoreItems]
  );

  const handleSelectorSelect = (value: string) => {
    setIsDropdownOpen(false);
    setSearchTerm('');

    if (value === 'all') {
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: null });
      if (isTemplateContext) {
        navigate('/projects?tab=templates');
      } else {
        navigate('/projects');
      }
    } else {
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: value });

      const selected = allItems.find(p => p.id === value) ?? poolForClientSearch.find(p => p.id === value);
      if (selected) {
        dispatch({ type: 'UPDATE_PROJECT', payload: selected });
      }

      if (isTemplateContext) {
        navigate('/test-cases');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        runSearchApi(value);
      }, 300);
    },
    [runSearchApi]
  );

  const clearSearch = () => {
    setSearchTerm('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setAllItems([]);
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setAllItems([]);
    setCurrentPage(1);
    setHasMoreItems(false);
    setIsLoadingMore(false);
  };

  const projectsListTab = searchParams.get('tab');
  const onProjectsPageTemplatesTab = location.pathname === '/projects' && projectsListTab === 'templates';

  const getSelectedDisplayName = () => {
    if (location.pathname === '/projects') {
      return onProjectsPageTemplatesTab ? 'All Templates' : 'All Projects';
    }

    const selectedProject = getSelectedProject();
    if (selectedProject) {
      return selectedProject.name;
    }

    if (state.isLoadingProjects) {
      return isTemplateContext ? '🔄 Loading templates...' : '🔄 Loading projects...';
    }

    if (state.projects.length === 0) {
      return isTemplateContext ? '❌ No templates available' : '❌ No projects available';
    }

    return isTemplateContext ? '🔍 Select template' : '🔍 Select project';
  };

  const selectorLabel = isTemplateContext ? 'Templates' : 'Projects';
  const entityWord = isTemplateContext ? 'templates' : 'projects';

  const getFilterInfo = () => {
    if (location.pathname === '/projects') {
      return null;
    }

    const selectedProject = getSelectedProject();
    if (selectedProject) {
      return (
        <div className="px-4 py-2 mb-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="text-xs text-cyan-400 font-medium">
            Filtered by {isTemplateContext ? 'template' : 'project'}:
          </div>
          <div className="text-sm text-slate-900 dark:text-white truncate">{selectedProject.name}</div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (
      state.projects.length === 0 &&
      !state.isLoadingProjects &&
      authState.isAuthenticated &&
      location.pathname !== '/projects'
    ) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.projects.length, state.isLoadingProjects, authState.isAuthenticated, location.pathname]);

  useEffect(() => {
    setAllItems([]);
    setCurrentPage(1);
    setHasMoreItems(false);
  }, [isTemplateContext]);

  useEffect(() => {
    const initializeDropdown = async () => {
      if (!isDropdownOpen || searchTerm || allItems.length > 0) {
        return;
      }

      try {
        if (isTemplateContext) {
          const { projects, meta } = await projectsApiService.getTemplatesForSidebar();
          setAllItems(projects);
          setTotalItems(meta.totalItems);
          setCurrentPage(meta.currentPage);
          setHasMoreItems(projects.length < meta.totalItems);
        } else {
          const { projects, meta } = await projectsApiService.getProjectsForSidebar();
          setAllItems(projects);
          setTotalItems(meta.totalItems);
          setCurrentPage(meta.currentPage);
          setHasMoreItems(projects.length < meta.totalItems);
        }
      } catch (error) {
        console.error('Failed to initialize dropdown:', error);
      }
    };

    initializeDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdownOpen, searchTerm, isTemplateContext]);

  const viewAllHighlighted =
    location.pathname === '/projects' &&
    (isTemplateContext ? onProjectsPageTemplatesTab : !onProjectsPageTemplatesTab) &&
    !state.selectedProjectId;

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl">
      <nav className="p-4 space-y-2">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2 px-4">
            {selectorLabel}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between ${
                getSelectedProject() || location.pathname === '/projects'
                  ? 'border-cyan-500 bg-slate-200 dark:border-cyan-500/50 dark:bg-slate-700/50'
                  : ''
              }`}
              disabled={state.isLoadingProjects}
            >
              <span className="truncate">
                {getSelectedProject() || location.pathname === '/projects' ? (
                  <>
                    <span className="text-cyan-600 dark:text-cyan-400">📁 </span>
                    <span className="text-slate-900 dark:text-white">{getSelectedDisplayName()}</span>
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-gray-400">{getSelectedDisplayName()}</span>
                )}
              </span>
              {state.isLoadingProjects ? (
                <Loader className="w-4 h-4 text-slate-400 dark:text-gray-400 animate-spin" />
              ) : (
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 dark:text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                onScroll={handleScroll}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
                    {isSearching && (
                      <Loader className="absolute right-8 top-1/2 transform -translate-y-1/2 text-cyan-600 dark:text-cyan-400 w-4 h-4 animate-spin" />
                    )}
                    <input
                      type="text"
                      placeholder={`Search all ${entityWord}...`}
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-8 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectorSelect('all')}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                      viewAllHighlighted
                        ? 'bg-slate-200 dark:bg-slate-700 text-cyan-600 dark:text-cyan-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {viewAllHighlighted ? '✓ ' : '🌐 '}
                    {isTemplateContext ? 'View all templates' : 'View all projects'}
                  </button>

                  {filteredItems.length > 0 && (
                    <>
                      {searchTerm && (
                        <div className="px-4 py-2 text-xs text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-700/50">
                          {isSearching
                            ? 'Searching...'
                            : `Found ${filteredItems.length} ${entityWord.slice(0, -1)}${filteredItems.length !== 1 ? 's' : ''} (from ${allItems.length} total)`}
                        </div>
                      )}

                      {filteredItems.map(item => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleSelectorSelect(item.id)}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors truncate ${
                            state.selectedProjectId === item.id
                              ? 'bg-slate-200 dark:bg-slate-700 text-cyan-600 dark:text-cyan-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                          title={item.name}
                        >
                          {state.selectedProjectId === item.id ? '✓ ' : '📁 '}
                          {item.name}
                        </button>
                      ))}
                    </>
                  )}

                  {allItems.length === 0 && !searchTerm && !isSearching && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm">
                      No {entityWord} available
                    </div>
                  )}

                  {filteredItems.length === 0 && searchTerm && !isSearching && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm">
                      No {entityWord} found matching &quot;{searchTerm}&quot;
                    </div>
                  )}

                  {isSearching && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm flex items-center">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Searching {entityWord}...
                    </div>
                  )}

                  {isLoadingMore && !searchTerm && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm flex items-center justify-center border-t border-slate-200 dark:border-slate-700">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Loading more {entityWord}...
                    </div>
                  )}

                  {!searchTerm && !isSearching && !isLoadingMore && allItems.length > 0 && (
                    <div className="px-4 py-2 text-xs text-slate-400 dark:text-gray-500 text-center border-t border-slate-200 dark:border-slate-700">
                      {hasMoreItems ? (
                        <>
                          Showing {allItems.length} of {totalItems} {entityWord} • Scroll for more
                        </>
                      ) : (
                        <>
                          All {allItems.length} {entityWord} loaded
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isDropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  handleDropdownClose();
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          {location.pathname !== '/projects' && (
            <div className="px-4">
              <Link
                to={isTemplateContext ? '/projects?tab=templates' : '/projects'}
                className="flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                {isTemplateContext ? 'Back to Templates' : 'Back to Projects'}
              </Link>
            </div>
          )}
          {getFilterInfo()}
        </div>

        {primaryNavItems.map(item => (
          <NavLink
            key={`${item.path}-${item.label}`}
            to={item.path}
            onClick={e => {
              if (location.pathname === item.path) {
                e.preventDefault();
                navigate(item.path, { replace: false, state: { timestamp: Date.now() } });
              }
            }}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-lg'
                  : 'text-slate-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            <div className="ml-auto w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}

        {visibleAdminNav.length > 0 && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-700 my-3 pt-2 space-y-2">
              {visibleAdminNav.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={e => {
                    if (location.pathname === item.path) {
                      e.preventDefault();
                      navigate(item.path, { replace: false, state: { timestamp: Date.now() } });
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-lg'
                        : 'text-slate-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <div className="ml-auto w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
