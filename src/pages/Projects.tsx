import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Filter, SquarePen, Trash2, Copy, ChevronLeft, ChevronRight, Loader, FolderOpen, Globe } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { useTemplates } from '../hooks/useTemplates';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';
import PermissionGuard from '../components/PermissionGuard';
import { projectsApiService } from '../services/projectsApi';

const ProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  projectData: { name: string; description: string };
  setProjectData: (data: { name: string; description: string }) => void;
  isSubmitting: boolean;
  templates?: Project[];
  selectedTemplateId?: string;
  setSelectedTemplateId?: (id: string) => void;
  templatesLoading?: boolean;
}> = ({ isOpen, onClose, onSubmit, title, projectData, setProjectData, isSubmitting, templates, selectedTemplateId, setSelectedTemplateId, templatesLoading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const isTemplate = title.includes('Template');
  const isCreateProject = title.includes('Create') && title.includes('Project');
  const entityName = isTemplate ? 'template' : 'project';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            {isTemplate ? 'Template Name *' : 'Project Name *'}
          </label>
          <input
            type="text"
            value={projectData.name}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder={`Enter ${entityName} name`}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={projectData.description}
            onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder={`Enter ${entityName} description`}
          />
        </div>
        {isCreateProject && templates && setSelectedTemplateId && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
              Default Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
              disabled={isSubmitting || templatesLoading}
            >
              <option value="">None - Create Blank Project</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {templatesLoading && (
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Loading templates...</p>
            )}
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {title.includes('Create') ? 'Creating...' : title.includes('Clone') ? 'Duplicating...' : 'Updating...'}
              </>
            ) : (
              title.includes('Create') ? 'Create' : title.includes('Clone') ? 'Duplicate' : 'Update'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const CloneModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  projectData: { name: string; description: string };
  setProjectData: (data: { name: string; description: string }) => void;
  isSubmitting: boolean;
  isTemplate: boolean;
  cloneType: 'template' | 'project';
  setCloneType: (type: 'template' | 'project') => void;
}> = ({ isOpen, onClose, onSubmit, title, projectData, setProjectData, isSubmitting, isTemplate, cloneType, setCloneType }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            {isTemplate && cloneType === 'project' ? 'Project Name *' : isTemplate ? 'Template Name *' : 'Project Name *'}
          </label>
          <input
            type="text"
            value={projectData.name}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder={isTemplate && cloneType === 'project' ? 'Enter project name' : isTemplate ? 'Enter template name' : 'Enter project name'}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={projectData.description}
            onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            disabled={isSubmitting}
            placeholder="Enter description"
          />
        </div>
        {isTemplate && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
              Target Section *
            </label>
            <div className="mb-3 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-gray-400 text-sm">
              Selected: {cloneType === 'template' ? 'Templates' : 'Projects'}
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg space-y-2">
              <button
                type="button"
                onClick={() => setCloneType('template')}
                disabled={isSubmitting}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  cloneType === 'template'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <FolderOpen className="w-5 h-5 mr-3" />
                <span className="font-medium">Templates</span>
              </button>
              <button
                type="button"
                onClick={() => setCloneType('project')}
                disabled={isSubmitting}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  cloneType === 'project'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <Globe className="w-5 h-5 mr-3" />
                <span className="font-medium">Projects</span>
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              'Duplicate'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getSelectedProject, state: appState } = useApp();
  const { state: authState } = useAuth();
  const { dispatch, loadProjects } = useApp();
  const { hasPermission } = usePermissions();
  const _selectedProject = getSelectedProject();
  const hasFetchedRef = useRef(false);

  const hasAnyAction = hasPermission(PERMISSIONS.PROJECT.UPDATE) ||
                       hasPermission(PERMISSIONS.PROJECT.DELETE) ||
                       hasPermission(PERMISSIONS.PROJECT.CREATE);

  const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');

  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    pagination: projectsPagination,
    fetchProjects,
    searchProjects,
    fetchProjectsCreatedByUser,
    searchProjectsCreatedByUser,
    fetchProjectsWithSort,
    createProject,
    updateProject,
    deleteProject,
    cloneProject
  } = useProjects();

  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    pagination: templatesPagination,
    fetchTemplates,
    searchTemplates,
    fetchTemplatesCreatedByUser,
    searchTemplatesCreatedByUser,
    fetchTemplatesWithSort,
    cloneTemplate,
    cloneTemplateToProject,
    createTemplate,
    updateTemplate,
    deleteTemplate
  } = useTemplates();

  const items = activeTab === 'projects' ? projects : templates;
  const loading = activeTab === 'projects' ? projectsLoading : templatesLoading;
  const error = activeTab === 'projects' ? projectsError : templatesError;
  const pagination = activeTab === 'projects' ? projectsPagination : templatesPagination;

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-projects'>('all');
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToManage, setProjectToManage] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cloneType, setCloneType] = useState<'template' | 'project'>('template');
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [modalTemplates, setModalTemplates] = useState<Project[]>([]);
  const [templatesLoadingForModal, setTemplatesLoadingForModal] = useState(false);

  const SORT_OPTIONS = useMemo(() => [
    { value: 'createdAt-desc', label: 'Creation Date (New → Old)', param: 'order[createdAt]=desc' },
    { value: 'createdAt-asc', label: 'Creation Date (Old → New)', param: 'order[createdAt]=asc' },
    { value: 'id-asc', label: 'ID (Ascending)', param: 'order[id]=asc' },
    { value: 'id-desc', label: 'ID (Descending)', param: 'order[id]=desc' },
    { value: 'updatedAt-desc', label: 'Last Modified', param: 'order[updatedAt]=desc' },
    { value: 'title-asc', label: 'Title (A-Z)', param: 'order[title]=asc' },
    { value: 'title-desc', label: 'Title (Z-A)', param: 'order[title]=desc' }
  ], []);

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);

    if (term.trim()) {
      if (filterMode === 'my-projects') {
        if (activeTab === 'projects') {
          await searchProjectsCreatedByUser(term, authState.user?.id?.toString() || '', 1, sortOption?.param);
        } else {
          await searchTemplatesCreatedByUser(term, authState.user?.id?.toString() || '', 1, sortOption?.param);
        }
      } else {
        if (activeTab === 'projects') {
          await searchProjects(term, 1, sortOption?.param);
        } else {
          await searchTemplates(term, 1, sortOption?.param);
        }
      }
    } else {
      await handleFilterChange(filterMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS, authState.user?.id, handleFilterChange are stable
  }, [searchProjects, searchProjectsCreatedByUser, searchTemplates, searchTemplatesCreatedByUser, filterMode, sortBy, activeTab]);

  const handleFilterChange = useCallback(async (mode: 'all' | 'my-projects') => {
    setFilterMode(mode);
    setSearchTerm('');
    setCurrentSearchTerm('');

    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);

    if (mode === 'my-projects') {
      const userId = authState.user?.id?.toString() || '';
      if (activeTab === 'projects') {
        await fetchProjectsCreatedByUser(userId || '', 1, sortOption?.param);
      } else {
        await fetchTemplatesCreatedByUser(userId || '', 1, sortOption?.param);
      }
    } else {
      if (activeTab === 'projects') {
        await fetchProjectsWithSort(1, sortOption?.param);
      } else {
        await fetchTemplatesWithSort(1, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS is a constant
  }, [fetchProjectsCreatedByUser, fetchProjectsWithSort, fetchTemplatesCreatedByUser, fetchTemplatesWithSort, sortBy, authState, activeTab]);

  const handleSortChange = useCallback(async (newSortBy: string) => {
    setSortBy(newSortBy);
    const sortOption = SORT_OPTIONS.find(option => option.value === newSortBy);

    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        if (activeTab === 'projects') {
          await searchProjectsCreatedByUser(currentSearchTerm, userId, 1, sortOption?.param);
        } else {
          await searchTemplatesCreatedByUser(currentSearchTerm, userId, 1, sortOption?.param);
        }
      } else {
        if (activeTab === 'projects') {
          await searchProjects(currentSearchTerm, 1, sortOption?.param);
        } else {
          await searchTemplates(currentSearchTerm, 1, sortOption?.param);
        }
      }
    } else {
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        if (activeTab === 'projects') {
          await fetchProjectsCreatedByUser(userId, 1, sortOption?.param);
        } else {
          await fetchTemplatesCreatedByUser(userId, 1, sortOption?.param);
        }
      } else {
        if (activeTab === 'projects') {
          await fetchProjectsWithSort(1, sortOption?.param);
        } else {
          await fetchTemplatesWithSort(1, sortOption?.param);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS, authState.user?.id are stable
  }, [searchProjects, searchProjectsCreatedByUser, searchTemplates, searchTemplatesCreatedByUser, fetchProjectsCreatedByUser, fetchProjectsWithSort, fetchTemplatesCreatedByUser, fetchTemplatesWithSort, currentSearchTerm, filterMode, activeTab]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleCreateProject = useCallback(async () => {
    try {
      setIsSubmitting(true);

      if (selectedTemplateId) {
        await cloneTemplateToProject(selectedTemplateId, {
          title: newProject.name,
          description: newProject.description
        });
      } else {
        await createProject({
          ...newProject,
          userId: authState.user?.id
        });
      }

      await loadProjects(true);
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '' });
      setSelectedTemplateId('');
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects is stable
  }, [createProject, cloneTemplateToProject, newProject, authState.user?.id, selectedTemplateId]);

  const handleCreateTemplate = useCallback(async () => {
    try {
      setIsSubmitting(true);
      await createTemplate(newProject);
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '' });
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  }, [createTemplate, newProject]);

  const handleEditProject = useCallback(async () => {
    if (!projectToManage) return;

    try {
      setIsSubmitting(true);
      if (activeTab === 'templates') {
        await updateTemplate(projectToManage.id, newProject);
      } else {
        await updateProject(projectToManage.id, newProject);
        await loadProjects(true);
      }
      setIsEditModalOpen(false);
      setProjectToManage(null);
      setNewProject({ name: '', description: '' });
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects is stable
  }, [updateProject, updateTemplate, projectToManage, newProject, activeTab]);

  const handleCloneProject = useCallback(async () => {
    if (!projectToManage) return;

    try {
      setIsSubmitting(true);

      if (activeTab === 'templates') {
        if (cloneType === 'project') {
          await cloneTemplateToProject(projectToManage.id, {
            title: newProject.name,
            description: newProject.description
          });
          await loadProjects(true);
          setActiveTab('projects');
          const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);
          if (filterMode === 'my-projects') {
            await fetchProjectsCreatedByUser(authState.user?.id?.toString() || '', 1, sortOption?.param);
          } else {
            await fetchProjectsWithSort(1, sortOption?.param);
          }
        } else {
          await cloneTemplate(projectToManage.id, {
            title: newProject.name,
            description: newProject.description
          });
        }
      } else {
        await cloneProject(projectToManage.id, {
          title: newProject.name,
          description: newProject.description
        });
        await loadProjects(true);
      }
    } catch (error) {
      console.error('Error cloning:', error);
    } finally {
      setIsSubmitting(false);
      setIsCloneModalOpen(false);
      setProjectToManage(null);
      setNewProject({ name: '', description: '' });
      setCloneType('template');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects, authState.user are stable
  }, [cloneProject, cloneTemplate, cloneTemplateToProject, projectToManage, newProject, activeTab, cloneType, sortBy, fetchProjectsWithSort, fetchProjectsCreatedByUser, filterMode]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectToManage) return;

    try {
      setIsSubmitting(true);
      if (activeTab === 'templates') {
        await deleteTemplate(projectToManage.id);
      } else {
        await deleteProject(projectToManage.id);
        await loadProjects(true);
      }
      setProjectToManage(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects is stable
  }, [deleteProject, deleteTemplate, projectToManage, activeTab]);

  const openEditModal = useCallback((project: Project) => {
    setProjectToManage(project);
    setNewProject({
      name: project.name,
      description: project.description
    });
    setIsEditModalOpen(true);
  }, []);

  const openCloneModal = useCallback((project: Project) => {
    setProjectToManage(project);
    setNewProject({
      name: `${project.name} (copy)`,
      description: project.description
    });
    setCloneType(activeTab === 'templates' ? 'template' : 'project');
    setIsCloneModalOpen(true);
  }, [activeTab]);

  const openDeleteDialog = useCallback((project: Project) => {
    setProjectToManage(project);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);

    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        if (activeTab === 'projects') {
          searchProjectsCreatedByUser(currentSearchTerm, userId, page, sortOption?.param);
        } else {
          searchTemplatesCreatedByUser(currentSearchTerm, userId, page, sortOption?.param);
        }
      } else {
        if (activeTab === 'projects') {
          searchProjects(currentSearchTerm, page, sortOption?.param);
        } else {
          searchTemplates(currentSearchTerm, page, sortOption?.param);
        }
      }
    } else {
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        if (activeTab === 'projects') {
          fetchProjectsCreatedByUser(userId, page, sortOption?.param);
        } else {
          fetchTemplatesCreatedByUser(userId, page, sortOption?.param);
        }
      } else {
        if (activeTab === 'projects') {
          fetchProjectsWithSort(page, sortOption?.param);
        } else {
          fetchTemplatesWithSort(page, sortOption?.param);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS, authState.user?.id are stable
  }, [currentSearchTerm, filterMode, sortBy, activeTab, searchProjects, searchProjectsCreatedByUser, searchTemplates, searchTemplatesCreatedByUser, fetchProjectsCreatedByUser, fetchProjectsWithSort, fetchTemplatesCreatedByUser, fetchTemplatesWithSort]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentSearchTerm('');
    setFilterMode('all');
    setSortBy('createdAt-desc');
    const sortOption = SORT_OPTIONS.find(option => option.value === 'createdAt-desc');
    if (activeTab === 'projects') {
      fetchProjectsWithSort(1, sortOption?.param);
    } else {
      fetchTemplatesWithSort(1, sortOption?.param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS is a constant
  }, [fetchProjectsWithSort, fetchTemplatesWithSort, activeTab]);

  const handleProjectClick = useCallback((project: Project) => {
    dispatch({ type: 'SET_NAVIGATING_TO_PROJECT', payload: true });

    // CRITICAL: Ensure the project exists in App context state
    // If it doesn't exist, add it to the context
    const contextProject = getSelectedProject();
    if (!contextProject || contextProject.id !== project.id) {

      dispatch({ type: 'UPDATE_PROJECT', payload: project });
    }

    // Set the selected project ID
    dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });

    // Use a small delay to ensure state is updated before navigation
    setTimeout(() => {
      toast.success(`Selected project: ${project.name}`);
      navigate('/dashboard');
    }, 50);
  }, [dispatch, navigate, getSelectedProject]);

  const handleTabChange = useCallback((tab: 'projects' | 'templates') => {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentSearchTerm('');
    setFilterMode('all');
    setSortBy('createdAt-desc');
    hasFetchedRef.current = false;
  }, []);

  useEffect(() => {
    if (location.pathname !== '/projects') {
      hasFetchedRef.current = false;
      if (appState.isNavigatingToProject) {
        dispatch({ type: 'SET_NAVIGATING_TO_PROJECT', payload: false });
      }
      return;
    }

    if (appState.isNavigatingToProject) {
      dispatch({ type: 'SET_NAVIGATING_TO_PROJECT', payload: false });
      hasFetchedRef.current = false;
      return;
    }

    if (hasFetchedRef.current) {
      return;
    }

    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);
    if (activeTab === 'projects') {
      fetchProjectsWithSort(1, sortOption?.param);
    } else {
      fetchTemplatesWithSort(1, sortOption?.param);
    }
    hasFetchedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, sortBy, appState.isNavigatingToProject, activeTab]);

  useEffect(() => {
    const fetchTemplatesForModal = async () => {
      if (isCreateModalOpen && activeTab === 'projects') {
        setTemplatesLoadingForModal(true);
        try {
          const response = await projectsApiService.getTemplates(1);
          const transformedTemplates = response.data.map(apiTemplate =>
            projectsApiService.transformApiProject(apiTemplate)
          );
          setModalTemplates(transformedTemplates);
        } catch (error) {
          console.error('Error fetching templates for modal:', error);
        } finally {
          setTemplatesLoadingForModal(false);
        }
      }
    };

    fetchTemplatesForModal();
  }, [isCreateModalOpen, activeTab]);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading {activeTab}...</p>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load {activeTab}</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => activeTab === 'projects' ? fetchProjects(1) : fetchTemplates(1)}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'projects' ? 'Projects' : 'Templates'}
          </h2>
          <p className="text-slate-600 dark:text-gray-400">
            Manage your testing {activeTab} ({pagination.totalItems} total)
          </p>
        </div>
        {activeTab === 'projects' ? (
          <PermissionGuard permission={PERMISSIONS.PROJECT.CREATE}>
            <Button
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Project
            </Button>
          </PermissionGuard>
        ) : (
          <PermissionGuard permission={PERMISSIONS.PROJECT.CREATE}>
            <Button
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Template
            </Button>
          </PermissionGuard>
        )}
      </div>

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handleTabChange('projects')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'projects'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => handleTabChange('templates')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Templates
          </button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${activeTab} by title...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400 dark:text-gray-400" />
              <select
                value={filterMode}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'my-projects')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
              >
                <option value="all">All {activeTab === 'projects' ? 'Projects' : 'Templates'}</option>
                <option value="my-projects">My {activeTab === 'projects' ? 'Projects' : 'Templates'}</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-500 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active filters display */}
        {(currentSearchTerm || filterMode !== 'all') && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-gray-400">Active filters:</span>
            {currentSearchTerm && (
              <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-600 dark:text-cyan-400">
                Search: "{currentSearchTerm}"
              </span>
            )}
            {filterMode !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-600 dark:text-blue-400">
                Filter: {filterMode === 'my-projects' ? `My ${activeTab === 'projects' ? 'Projects' : 'Templates'}` : `All ${activeTab === 'projects' ? 'Projects' : 'Templates'}`}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      {/* Projects Table */}
      <Card className="overflow-hidden">
        {loading && (
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
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">Quick Links</th>
                {hasAnyAction && (
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((project) => (
                <tr key={project.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 text-sm text-slate-700 dark:text-gray-300 font-mono">
                    #{project.id || 'NO_ID'}
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <button
                        onClick={() => handleProjectClick(project)}
                        className="text-left w-full group"
                        disabled={!project.id || project.id === '' || project.id === 'undefined'}
                      >
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer">
                          {project.name}
                          {(!project.id || project.id === '' || project.id === 'undefined') && (
                            <span className="text-red-400 text-xs ml-2">(NO ID)</span>
                          )}
                        </h3>
                      </button>
                      <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">{project.description}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          // Set the selected project
                          dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });
                          
                          // Ensure the project exists in App context state
                          dispatch({ type: 'UPDATE_PROJECT', payload: project });
                          
                          // Navigate to test cases page
                          navigate('/test-cases');
                          
                          toast.success(`Viewing test cases for ${project.name}`);
                        }}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 cursor-pointer transition-colors text-left whitespace-nowrap"
                      >
                        {project.testCasesCount} Test Cases
                      </button>
                      <div className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 cursor-pointer whitespace-nowrap">
                        {project.testRunsCount} Test Runs
                      </div>
                    </div>
                  </td>
                  {hasAnyAction && (
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {hasPermission(PERMISSIONS.PROJECT.UPDATE) && (
                          <button
                            onClick={() => openEditModal(project)}
                            className="p-2 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                            disabled={isSubmitting}
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission(PERMISSIONS.PROJECT.CREATE) && (
                          <button
                            onClick={() => openCloneModal(project)}
                            className="p-2 text-slate-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Clone"
                            disabled={isSubmitting}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission(PERMISSIONS.PROJECT.DELETE) && (
                          <button
                            onClick={() => openDeleteDialog(project)}
                            className="p-2 text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Delete"
                            disabled={isSubmitting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {items.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-slate-500 dark:text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No {activeTab} found</p>
                <p className="text-sm">
                  {currentSearchTerm || filterMode !== 'all'
                    ? `No ${activeTab} found matching your filters. Try adjusting your search or filters.`
                    : `No ${activeTab} found.${activeTab === 'projects' ? ' Create your first project to get started.' : ''}`
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-gray-400">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} {activeTab}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600 dark:text-gray-400">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages || loading}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <ProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTemplateId('');
        }}
        onSubmit={activeTab === 'templates' ? handleCreateTemplate : handleCreateProject}
        title={activeTab === 'templates' ? 'Create New Template' : 'Create New Project'}
        projectData={newProject}
        setProjectData={setNewProject}
        isSubmitting={isSubmitting}
        templates={activeTab === 'projects' ? modalTemplates : undefined}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        templatesLoading={templatesLoadingForModal}
      />

      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditProject}
        title={activeTab === 'templates' ? 'Edit Template' : 'Edit Project'}
        projectData={newProject}
        setProjectData={setNewProject}
        isSubmitting={isSubmitting}
      />

      <CloneModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onSubmit={handleCloneProject}
        title={activeTab === 'templates' ? 'Clone Template' : 'Clone Project'}
        projectData={newProject}
        setProjectData={setNewProject}
        isSubmitting={isSubmitting}
        isTemplate={activeTab === 'templates'}
        cloneType={cloneType}
        setCloneType={setCloneType}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProject}
        title={activeTab === 'templates' ? 'Delete Template' : 'Delete Project'}
        message={
          activeTab === 'templates'
            ? `Are you sure you want to delete the template "${projectToManage?.name}"? This action is irreversible and will delete all associated test cases and data.`
            : `Are you sure you want to delete the project "${projectToManage?.name}"? This action is irreversible and will delete all associated test cases, test runs, and data.`
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Projects;