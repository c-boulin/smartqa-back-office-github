import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, Loader, Shield, Bot, Search, ChevronLeft, ChevronRight, SquarePen, X } from 'lucide-react';
import { usersApiService, User } from '../services/usersApi';
import { apiService, Role } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRoleDisplayLabel } from '../components/Layout/SidebarUserCard';
import { PERMISSIONS } from '../utils/permissions';
import Pagination from '../components/UI/Pagination';
import toast from 'react-hot-toast';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types';
import AutomationEditWizard from '../components/Settings/AutomationEditWizard';
import ProjectTitle from '../components/Project/ProjectTitle';

type GitlabRepositoryOption = {
  id: string;
  name: string;
  url: string;
};

type SettingsTab = 'users' | 'automation';

const Settings: React.FC = () => {
  const { state: authState, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const rolesLoadedRef = useRef(false);

  const {
    projects,
    loading: projectsLoading,
    pagination: projectsPagination,
    fetchProjectsWithSort,
    searchProjects,
  } = useProjects();

  const [projectSearch, setProjectSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProjects = (page: number) => fetchProjectsWithSort(page, 'order[createdAt]=desc');

  const handleProjectSearch = (value: string) => {
    setProjectSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (value.trim()) {
        searchProjects(value.trim(), 1, 'order[createdAt]=desc');
      } else {
        fetchProjects(1);
      }
    }, 300);
  };

  const clearProjectSearch = () => {
    setProjectSearch('');
    fetchProjects(1);
  };

  const [automationEditModalOpen, setAutomationEditModalOpen] = useState(false);
  const [projectBeingEdited, setProjectBeingEdited] = useState<Project | null>(null);
  const [gitlabRepositories, setGitlabRepositories] = useState<GitlabRepositoryOption[]>([]);
  const [gitlabRepositoriesLoading, setGitlabRepositoriesLoading] = useState(false);

  const isSuperAdmin = authState.user?.role?.slug === 'superadmin';
  const canAccessSettings = hasPermission(PERMISSIONS.ADMIN_PANEL.READ);

  const loadSettingsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersApiService.getSettingsData(1, 1000);

      const transformedUsers = response.data.map(apiUser =>
        usersApiService.transformApiUser(apiUser, response.included)
      );
      setAllUsers(transformedUsers);

      if (!rolesLoadedRef.current && response.roles && response.roles.length > 0) {
        rolesLoadedRef.current = true;
        setRoles(response.roles.map(r => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          created_at: r.created_at,
          updated_at: r.updated_at,
          permissions: []
        })));
      }
    } catch (error) {
      console.error('Failed to load settings data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredUsers = allUsers
    .filter(u => !(authState.user && authState.user.id.toString() === u.id))
    .filter(u => isSuperAdmin || u.role?.slug !== 'superadmin')
    .filter(u => !userSearch.trim() || u.name.toLowerCase().includes(userSearch.trim().toLowerCase()));

  const USERS_PER_PAGE_DISPLAY = 30;
  const totalFilteredPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE_DISPLAY));
  const pagedUsers = filteredUsers.slice((usersPage - 1) * USERS_PER_PAGE_DISPLAY, usersPage * USERS_PER_PAGE_DISPLAY);

  useEffect(() => {
    if (!canAccessSettings) {
      toast.error('You do not have permission to access this page');
      return;
    }
    loadSettingsData();
  }, [canAccessSettings, loadSettingsData]);

  const handleUserSearch = (value: string) => {
    setUserSearch(value);
    setUsersPage(1);
  };

  const clearUserSearch = () => {
    setUserSearch('');
    setUsersPage(1);
  };

  useEffect(() => {
    if (activeTab === 'automation') {
      fetchProjects(1);
    }
    // Intentionally omit fetchProjects: we only want to run when switching to the automation tab.
    // fetchProjects is not stable (recreated each render in useProjects), which would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when tab becomes 'automation' only
  }, [activeTab]);

  // Fetch GitLab repositories from API when automation tab is active
  useEffect(() => {
    if (activeTab !== 'automation') {
      setGitlabRepositories([]);
      return;
    }
    let cancelled = false;
    setGitlabRepositoriesLoading(true);
    apiService
      .authenticatedRequest('/gitlab/repositories')
      .then((response: {
        data?: Array<
          | { id: string; name: string; url: string }
          | { id: string; type?: string; attributes: { id: number | string; name: string; url: string } }
        >;
      }) => {
        if (cancelled) return;
        const list = response?.data;
        if (!Array.isArray(list)) {
          setGitlabRepositories([]);
          return;
        }
        const normalized: GitlabRepositoryOption[] = list.map((item) => {
          if (item && typeof item === 'object' && 'attributes' in item && item.attributes) {
            return {
              id: String(item.attributes.id ?? item.id),
              name: item.attributes.name,
              url: item.attributes.url,
            };
          }
          const flat = item as { id: string; name: string; url: string };
          return { id: String(flat.id), name: flat.name, url: flat.url };
        }).filter((r) => r.name && r.url);
        setGitlabRepositories(normalized);
      })
      .catch(() => {
        if (!cancelled) setGitlabRepositories([]);
      })
      .finally(() => {
        if (!cancelled) setGitlabRepositoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      setUpdatingUserId(userId);
      await usersApiService.updateUserRole(userId, parseInt(newRoleId));

      const updatedRole = roles.find(r => r.id === parseInt(newRoleId));

      setAllUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, role_id: newRoleId, role: updatedRole }
            : user
        )
      );

      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!canAccessSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-gray-400">You do not have permission to access this page</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 data-mipqa="settings-title" className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-gray-400">Manage users and permissions</p>
        </div>
      </div>

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            data-mipqa="settings-tab-users"
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            data-mipqa="settings-tab-automation"
            onClick={() => setActiveTab('automation')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'automation'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            Automation Testing Management
          </button>
        </div>
      </Card>

      {activeTab === 'users' && (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-500" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">User Management</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                Assign roles to users to control their access and permissions
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
              <input
                data-mipqa="users-search-input"
                type="text"
                value={userSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={clearUserSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Assign Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pagedUsers.map((user) => (
                  <tr
                    key={user.id}
                    data-mipqa={`user-row-${user.id}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        {user.login}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.role ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                            {getRoleDisplayLabel(user.role.slug, user.role.name)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">
                            No Role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          data-mipqa={`user-role-select-${user.id}`}
                          value={user.role_id || ''}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingUserId === user.id}
                          className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <option value="">Select Role</option>
                          {roles
                            .filter(role => isSuperAdmin || role.slug !== 'superadmin')
                            .map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                        </select>
                        {updatingUserId === user.id && (
                          <Loader className="w-4 h-4 text-cyan-500 animate-spin flex-shrink-0" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-gray-400">
              {userSearch ? `No users found matching "${userSearch}"` : 'No users found'}
            </p>
          </div>
        )}

        <Pagination
          currentPage={usersPage}
          totalPages={totalFilteredPages}
          totalItems={filteredUsers.length}
          itemsPerPage={USERS_PER_PAGE_DISPLAY}
          onPageChange={setUsersPage}
        />
      </div>
      )}

      {activeTab === 'automation' && (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-500" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Automation Testing Management</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Configure and manage automation testing settings. All projects are listed below.
            </p>
          </Card>

          <Card className="overflow-hidden">
            {/* Search bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  data-mipqa="automation-project-search-input"
                  type="text"
                  value={projectSearch}
                  onChange={(e) => handleProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors"
                />
                {projectSearch && (
                  <button
                    type="button"
                    onClick={clearProjectSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {projectsLoading && (
              <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                <Loader className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-spin" />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-20">ID</th>
                    <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Project</th>
                    <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {projects.map((project) => (
                    <tr key={project.id} data-mipqa={`automation-project-row-${project.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-sm text-slate-500 dark:text-gray-400 font-mono shrink-0">
                        #{project.id || 'NO_ID'}
                      </td>
                      <td className="py-4 px-6">
                        <ProjectTitle project={project} />
                        {project.description && (
                          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-1">{project.description}</p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          data-mipqa={`automation-edit-btn-${project.id}`}
                          type="button"
                          onClick={() => {
                            setProjectBeingEdited(project);
                            setAutomationEditModalOpen(true);
                          }}
                          className="p-2 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit automation settings"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {projects.length === 0 && !projectsLoading && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-400 dark:text-gray-500" />
                  <p className="text-lg font-medium text-slate-600 dark:text-gray-400">
                    {projectSearch ? 'No projects match your search' : 'No projects found'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                    {projectSearch ? 'Try a different search term.' : 'Create projects from the Projects page to see them here.'}
                  </p>
                </div>
              )}
            </div>
            {projectsPagination.totalPages > 1 && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-gray-400">
                    Showing {((projectsPagination.currentPage - 1) * projectsPagination.itemsPerPage) + 1} to{' '}
                    {Math.min(projectsPagination.currentPage * projectsPagination.itemsPerPage, projectsPagination.totalItems)} of{' '}
                    {projectsPagination.totalItems} projects
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => projectSearch ? searchProjects(projectSearch, projectsPagination.currentPage - 1, 'order[createdAt]=desc') : fetchProjects(projectsPagination.currentPage - 1)}
                      disabled={projectsPagination.currentPage === 1 || projectsLoading}
                      icon={ChevronLeft}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-600 dark:text-gray-400">
                      Page {projectsPagination.currentPage} of {projectsPagination.totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => projectSearch ? searchProjects(projectSearch, projectsPagination.currentPage + 1, 'order[createdAt]=desc') : fetchProjects(projectsPagination.currentPage + 1)}
                      disabled={projectsPagination.currentPage === projectsPagination.totalPages || projectsLoading}
                      icon={ChevronRight}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Modal
            isOpen={automationEditModalOpen}
            onClose={() => {
              setAutomationEditModalOpen(false);
              setProjectBeingEdited(null);
            }}
            title={projectBeingEdited ? `Edit automation — ${projectBeingEdited.name}` : 'Edit automation'}
            size="lg"
          >
            {projectBeingEdited && (
              <AutomationEditWizard
                key={projectBeingEdited.id}
                project={projectBeingEdited}
                gitlabRepositories={gitlabRepositories}
                gitlabRepositoriesLoading={gitlabRepositoriesLoading}
                onSaved={(updated) => {
                  setProjectBeingEdited(updated);
                  fetchProjects(projectsPagination.currentPage);
                }}
                onClose={() => {
                  setAutomationEditModalOpen(false);
                  setProjectBeingEdited(null);
                }}
              />
            )}
          </Modal>
        </>
      )}
    </div>
  );
};

export default Settings;
