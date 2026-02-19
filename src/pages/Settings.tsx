import React, { useEffect, useState } from 'react';
import { Users, Loader, Shield, Bot, Search, ChevronLeft, ChevronRight, SquarePen } from 'lucide-react';
import { usersApiService, User } from '../services/usersApi';
import { apiService, Role } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import toast from 'react-hot-toast';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types';
import { COUNTRY_CODES_ALPHA2 } from '../constants/countryCodes';
import { projectsApiService } from '../services/projectsApi';

export type GitlabRepositoryOption = {
  id: string;
  name: string;
  url: string;
};

type SettingsTab = 'users' | 'automation';

export type AutomatedTestCaseLink = {
  id: string;
  title: string;
  gitlab_test_name: string | null | undefined;
};

type AutomationEditForm = {
  country: string;
  url: string;
  gitlabProject: string;
  testSuite: string;
};

const Settings: React.FC = () => {
  const { state: authState, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const {
    projects,
    loading: projectsLoading,
    pagination: projectsPagination,
    fetchProjects,
  } = useProjects();

  const [automationEditModalOpen, setAutomationEditModalOpen] = useState(false);
  const [projectBeingEdited, setProjectBeingEdited] = useState<Project | null>(null);
  const [automationForm, setAutomationForm] = useState<AutomationEditForm>({
    country: '',
    url: '',
    gitlabProject: '',
    testSuite: '',
  });
  const [testSuiteOptions, setTestSuiteOptions] = useState<string[]>([]);
  const [testSuiteLoading, setTestSuiteLoading] = useState(false);
  const [automationSaving, setAutomationSaving] = useState(false);
  const [testCaseLinksData, setTestCaseLinksData] = useState<{
    automatedTestCases: AutomatedTestCaseLink[];
    gitlabTestNames: string[];
  } | null>(null);
  const [testCaseLinksLoading, setTestCaseLinksLoading] = useState(false);
  const [testCaseLinksSaving, setTestCaseLinksSaving] = useState(false);
  /** test_case_id -> gitlab_test_name for the mapping form */
  const [testCaseLinkSelections, setTestCaseLinkSelections] = useState<Record<string, string>>({});
  const [gitlabRepositories, setGitlabRepositories] = useState<GitlabRepositoryOption[]>([]);
  const [gitlabRepositoriesLoading, setGitlabRepositoriesLoading] = useState(false);

  const isSuperAdmin = authState.user?.role?.slug === 'superadmin';
  const canAccessSettings = hasPermission(PERMISSIONS.ADMIN_PANEL.READ);

  useEffect(() => {
    if (!canAccessSettings) {
      toast.error('You do not have permission to access this page');
      return;
    }
    loadData();
  }, [canAccessSettings]);

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
      .then((response: { data?: Array<{ id: string; name: string; url: string }> }) => {
        if (cancelled) return;
        const list = response?.data;
        setGitlabRepositories(Array.isArray(list) ? list : []);
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

  // Fetch test suite list when a GitLab project is selected (only when modal is open)
  useEffect(() => {
    if (!automationEditModalOpen) {
      return;
    }
    const gitlabProject = automationForm.gitlabProject;
    if (!gitlabProject) {
      setTestSuiteOptions([]);
      setAutomationForm((f) => (f.testSuite ? { ...f, testSuite: '' } : f));
      return;
    }
    const repositoryUrl = gitlabProject;
    let cancelled = false;
    setTestSuiteLoading(true);
    setTestSuiteOptions([]);
    setAutomationForm((f) => (f.testSuite ? { ...f, testSuite: '' } : f));
    apiService
      .authenticatedRequest(
        `/gitlab/suits-list?repository_url=${encodeURIComponent(repositoryUrl)}`
      )
      .then((response: { success?: boolean; data?: string[] }) => {
        if (cancelled) return;
        if (response?.success && Array.isArray(response.data)) {
          setTestSuiteOptions(response.data);
          // Restore saved test suite from DB once options are loaded (it was cleared when fetch started)
          const savedSuite = projectBeingEdited?.test_suite_name ?? '';
          if (savedSuite && response.data.includes(savedSuite)) {
            setAutomationForm((f) => ({ ...f, testSuite: savedSuite }));
          }
        } else {
          setTestSuiteOptions([]);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load test suites');
        setTestSuiteOptions([]);
      })
      .finally(() => {
        if (!cancelled) setTestSuiteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [automationEditModalOpen, automationForm.gitlabProject]);

  // Load test case links when modal is open and project has GitLab + Test suite saved
  useEffect(() => {
    if (
      !automationEditModalOpen ||
      !projectBeingEdited?.id ||
      !projectBeingEdited.gitlab_project_name ||
      !projectBeingEdited.test_suite_name
    ) {
      setTestCaseLinksData(null);
      return;
    }
    let cancelled = false;
    setTestCaseLinksLoading(true);
    setTestCaseLinksData(null);
    apiService
      .authenticatedRequest(`/projects/${projectBeingEdited.id}/test-case-gitlab-links`)
      .then((response: { data?: { automatedTestCases?: AutomatedTestCaseLink[]; gitlabTestNames?: string[] } }) => {
        if (cancelled) return;
        const data = response?.data;
        if (data?.automatedTestCases && Array.isArray(data.automatedTestCases) && Array.isArray(data.gitlabTestNames)) {
          setTestCaseLinksData({
            automatedTestCases: data.automatedTestCases,
            gitlabTestNames: data.gitlabTestNames,
          });
          const initial: Record<string, string> = {};
          data.automatedTestCases.forEach((tc) => {
            initial[tc.id] = tc.gitlab_test_name ?? '';
          });
          setTestCaseLinkSelections(initial);
        } else {
          setTestCaseLinksData({ automatedTestCases: [], gitlabTestNames: data?.gitlabTestNames ?? [] });
          setTestCaseLinkSelections({});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load test case links');
        setTestCaseLinksData(null);
      })
      .finally(() => {
        if (!cancelled) setTestCaseLinksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    automationEditModalOpen,
    projectBeingEdited?.id,
    projectBeingEdited?.gitlab_project_name,
    projectBeingEdited?.test_suite_name,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        usersApiService.getUsers(),
        usersApiService.getRoles()
      ]);

      console.log('Users API Response:', usersResponse);
      console.log('Roles API Response:', rolesResponse);

      const transformedUsers = usersResponse.data.map(apiUser =>
        usersApiService.transformApiUser(apiUser, usersResponse.included)
      );

      console.log('Transformed Users:', transformedUsers);

      setUsers(transformedUsers);
      setRoles(rolesResponse);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load users and roles');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      setUpdatingUserId(userId);
      await usersApiService.updateUserRole(userId, parseInt(newRoleId));

      const updatedRole = roles.find(r => r.id === parseInt(newRoleId));

      setUsers(prevUsers =>
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-gray-400">Manage users and permissions</p>
        </div>
      </div>

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
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
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">User Management</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
            Assign roles to users to control their access and permissions
          </p>
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
              {users
                .filter(user => !(authState.user && authState.user.id.toString() === user.id))
                .filter(user => isSuperAdmin || user.role?.slug !== 'superadmin')
                .map((user) => (
                  <tr
                    key={user.id}
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
                            {user.role.name}
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

        {users.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-gray-400">No users found</p>
          </div>
        )}
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
            {projectsLoading && (
              <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                <Loader className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-spin" />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">ID</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Title</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-sm text-slate-700 dark:text-gray-300 font-mono">
                        #{project.id || 'NO_ID'}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {project.name}
                            {(!project.id || project.id === '' || project.id === 'undefined') && (
                              <span className="text-red-400 text-xs ml-2">(NO ID)</span>
                            )}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">{project.description}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => {
                            setProjectBeingEdited(project);
                            setAutomationForm({
                              country: project.country ?? '',
                              url: project.url ?? '',
                              gitlabProject: project.gitlab_project_name ?? '',
                              testSuite: project.test_suite_name ?? '',
                            });
                            setTestSuiteOptions([]);
                            setTestSuiteLoading(false);
                            setTestCaseLinksData(null);
                            setTestCaseLinkSelections({});
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
                  <p className="text-lg font-medium text-slate-600 dark:text-gray-400">No projects found</p>
                  <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                    Create projects from the Projects page to see them here.
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
                      onClick={() => fetchProjects(projectsPagination.currentPage - 1)}
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
                      onClick={() => fetchProjects(projectsPagination.currentPage + 1)}
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
            size="sm"
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!projectBeingEdited) return;
                try {
                  setAutomationSaving(true);
                  const response = await projectsApiService.updateProject(projectBeingEdited.id, {
                    title: projectBeingEdited.name,
                    description: projectBeingEdited.description,
                    country: automationForm.country,
                    url: automationForm.url,
                    gitlab_project_name: automationForm.gitlabProject || undefined,
                    test_suite_name: automationForm.testSuite,
                  });
                  toast.success('Automation settings saved');
                  const updated = projectsApiService.transformApiProject(response.data);
                  setProjectBeingEdited(updated);
                  fetchProjects(projectsPagination.currentPage);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to save automation settings');
                } finally {
                  setAutomationSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="automation-edit-country" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                  Country
                </label>
                <select
                  id="automation-edit-country"
                  value={automationForm.country}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, country: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                >
                  <option value="">Select country</option>
                  {COUNTRY_CODES_ALPHA2.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {code} — {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="automation-edit-url" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                  URL
                </label>
                <input
                  id="automation-edit-url"
                  type="url"
                  value={automationForm.url}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                />
              </div>
              <div>
                <label htmlFor="automation-edit-gitlab-project" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                  Gitlab project
                </label>
                <select
                  id="automation-edit-gitlab-project"
                  value={automationForm.gitlabProject}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, gitlabProject: e.target.value }))}
                  disabled={gitlabRepositoriesLoading}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {gitlabRepositoriesLoading ? 'Loading…' : 'Select GitLab repository'}
                  </option>
                  {gitlabRepositories.map((repo) => (
                    <option key={repo.id} value={repo.url}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="automation-edit-test-suite" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                  Test suite
                </label>
                <select
                  id="automation-edit-test-suite"
                  value={automationForm.testSuite}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, testSuite: e.target.value }))}
                  disabled={testSuiteLoading || !automationForm.gitlabProject}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {(() => {
                      if (testSuiteLoading) return 'Loading…';
                      if (!automationForm.gitlabProject) return 'Select a GitLab project first';
                      return 'Select test suite';
                    })()}
                  </option>
                  {testSuiteOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {projectBeingEdited?.gitlab_project_name && projectBeingEdited?.test_suite_name ? (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                    Test case mapping
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Link each automated test case to the corresponding test in the GitLab suite.
                  </p>
                  {testCaseLinksLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading test cases…
                    </div>
                  ) : testCaseLinksData && testCaseLinksData.automatedTestCases.length > 0 ? (
                    <>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {testCaseLinksData.automatedTestCases.map((tc) => (
                          <div
                            key={tc.id}
                            className="flex items-center gap-2 flex-wrap"
                          >
                            <span className="text-sm text-slate-700 dark:text-gray-300 min-w-0 truncate flex-1">
                              {tc.title}
                            </span>
                            <select
                              value={testCaseLinkSelections[tc.id] ?? ''}
                              onChange={(e) =>
                                setTestCaseLinkSelections((prev) => ({
                                  ...prev,
                                  [tc.id]: e.target.value,
                                }))
                              }
                              className="flex-shrink-0 px-2 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                            >
                              <option value="">— Not linked —</option>
                              {testCaseLinksData.gitlabTestNames.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={testCaseLinksSaving}
                        onClick={async () => {
                          if (!projectBeingEdited?.id) return;
                          try {
                            setTestCaseLinksSaving(true);
                            const links = testCaseLinksData.automatedTestCases.map((tc) => ({
                              test_case_id: Number(tc.id),
                              gitlab_test_name: (testCaseLinkSelections[tc.id] ?? '').trim() || null,
                            }));
                            await apiService.authenticatedRequest(
                              `/projects/${projectBeingEdited.id}/test-case-gitlab-links`,
                              {
                                method: 'PATCH',
                                body: JSON.stringify({ links }),
                                headers: { 'Content-Type': 'application/json' },
                              }
                            );
                            toast.success('Test case links saved');
                            setTestCaseLinksData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    automatedTestCases: prev.automatedTestCases.map((tc) => ({
                                      ...tc,
                                      gitlab_test_name: testCaseLinkSelections[tc.id] || null,
                                    })),
                                  }
                                : null
                            );
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Failed to save test case links');
                          } finally {
                            setTestCaseLinksSaving(false);
                          }
                        }}
                      >
                        {testCaseLinksSaving ? 'Saving…' : 'Save test case links'}
                      </Button>
                    </>
                  ) : testCaseLinksData?.automatedTestCases.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      No automated test cases in this project. Mark test cases as &quot;Automated&quot; to link them.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Save <strong>GitLab project</strong> and <strong>Test suite</strong> above to manage test case links.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAutomationEditModalOpen(false);
                    setProjectBeingEdited(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={automationSaving}>
                  {automationSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Settings;
