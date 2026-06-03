import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, SquarePen, Trash2, Copy, ChevronLeft, ChevronRight,
  Loader, MoreVertical, List, LayoutGrid, ChevronUp, ChevronDown, CheckCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';
import PermissionGuard from '../components/PermissionGuard';
import { projectsApiService } from '../services/projectsApi';
import ProjectCard from '../components/Project/ProjectCard';
import ProjectTitle from '../components/Project/ProjectTitle';
import CreateProjectModal, { CreateProjectFormData } from '../components/Project/CreateProjectModal';
import EditProjectModal, { EditProjectFormData } from '../components/Project/EditProjectModal';
import SearchAutocomplete, { Suggestion } from '../components/UI/SearchAutocomplete';

const ProjectFormModal: React.FC<{
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

  const isCreateProject = title.includes('Create');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={projectData.name}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter project name"
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
            placeholder="Enter project description"
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
                {title.includes('Create') ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              title.includes('Create') ? 'Create' : 'Update'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const CloneProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  projectData: { name: string; description: string };
  setProjectData: (data: { name: string; description: string }) => void;
  isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, title, projectData, setProjectData, isSubmitting }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={projectData.name}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter project name"
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

const ActionMenu: React.FC<{
  project: Project;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
  canCreate: boolean;
  canDelete: boolean;
  disabled: boolean;
}> = ({ project, onDuplicate, onDelete, canCreate, canDelete, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setIsOpen(v => !v);
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  if (!canCreate && !canDelete) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={disabled}
        className="p-2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1"
        >
          {canCreate && (
            <button
              data-mipqa={`project-duplicate-btn-${project.id}`}
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDuplicate(project); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              <Copy className="w-4 h-4 text-slate-400 dark:text-gray-400" />
              Duplicate Project
            </button>
          )}
          {canDelete && (
            <button
              data-mipqa={`project-delete-btn-${project.id}`}
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(project); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

function formatModifiedDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(date);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}


const ViewDropdown: React.FC<{
  value: 'all' | 'my-projects';
  onChange: (v: 'all' | 'my-projects') => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = value === 'all' ? 'All Project' : 'My Projects';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all"
      >
        <span>{label}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
          {(['all', 'my-projects'] as const).map(v => (
            <button
              key={v}
              onClick={() => { onChange(v); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                v === value
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              {v === 'all' ? 'All Project' : 'My Projects'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

type SortField = 'id' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getSelectedProject, state: appState } = useApp();
  const { state: authState } = useAuth();
  const { dispatch, loadProjects } = useApp();
  const { hasPermission } = usePermissions();
  const hasFetchedRef = useRef(false);

  const hasAnyAction = hasPermission(PERMISSIONS.PROJECT.UPDATE) ||
                       hasPermission(PERMISSIONS.PROJECT.DELETE) ||
                       hasPermission(PERMISSIONS.PROJECT.CREATE);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [columnSort, setColumnSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'updatedAt', direction: 'desc' });

  const {
    projects,
    loading,
    error,
    pagination,
    fetchProjects,
    searchProjects,
    fetchProjectsCreatedByUser,
    searchProjectsCreatedByUser,
    fetchProjectsWithSort,
    createProject,
    updateProject,
    deleteProject,
    cloneProject,
    prependProject,
  } = useProjects();

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
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [modalTemplates, setModalTemplates] = useState<Project[]>([]);
  const [templatesLoadingForModal, setTemplatesLoadingForModal] = useState(false);

  const projectNameSuggestions = useMemo<Suggestion[]>(() =>
    projects
      .filter(p => p.name)
      .map(p => ({ label: p.name, country: p.country ?? undefined })),
    [projects]
  );

  const SORT_OPTIONS = useMemo(() => [
    { value: 'createdAt-desc', label: 'Creation Date (New to Old)', param: 'order[createdAt]=desc' },
    { value: 'createdAt-asc', label: 'Creation Date (Old to New)', param: 'order[createdAt]=asc' },
    { value: 'id-asc', label: 'ID (Ascending)', param: 'order[id]=asc' },
    { value: 'id-desc', label: 'ID (Descending)', param: 'order[id]=desc' },
    { value: 'updatedAt-desc', label: 'Last Modified', param: 'order[updatedAt]=desc' },
    { value: 'title-asc', label: 'Title (A-Z)', param: 'order[title]=asc' },
    { value: 'title-desc', label: 'Title (Z-A)', param: 'order[title]=desc' }
  ], []);

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);

    if (term.trim()) {
      if (filterMode === 'my-projects') {
        await searchProjectsCreatedByUser(term, authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        await searchProjects(term, 1, sortOption?.param);
      }
    } else {
      await handleFilterChange(filterMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchProjects, searchProjectsCreatedByUser, filterMode, sortBy]);

  const handleFilterChange = useCallback(async (mode: 'all' | 'my-projects') => {
    setFilterMode(mode);
    setSearchTerm('');
    setCurrentSearchTerm('');
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);

    if (mode === 'my-projects') {
      await fetchProjectsCreatedByUser(authState.user?.id?.toString() || '', 1, sortOption?.param);
    } else {
      await fetchProjectsWithSort(1, sortOption?.param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProjectsCreatedByUser, fetchProjectsWithSort, sortBy, authState]);

  const handleSortChange = useCallback(async (newSortBy: string) => {
    setSortBy(newSortBy);
    const sortOption = SORT_OPTIONS.find(o => o.value === newSortBy);

    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-projects') {
        await searchProjectsCreatedByUser(currentSearchTerm, authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        await searchProjects(currentSearchTerm, 1, sortOption?.param);
      }
    } else {
      if (filterMode === 'my-projects') {
        await fetchProjectsCreatedByUser(authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        await fetchProjectsWithSort(1, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchProjects, searchProjectsCreatedByUser, fetchProjectsCreatedByUser, fetchProjectsWithSort, currentSearchTerm, filterMode]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleColumnSort = useCallback((field: SortField) => {
    const newDirection: SortDirection = columnSort.field === field && columnSort.direction === 'asc' ? 'desc' : 'asc';
    setColumnSort({ field, direction: newDirection });
    const sortMap: Record<string, string> = {
      'id-asc': 'id-asc', 'id-desc': 'id-desc',
      'updatedAt-asc': 'createdAt-asc', 'updatedAt-desc': 'updatedAt-desc',
    };
    handleSortChange(sortMap[`${field}-${newDirection}`] || 'createdAt-desc');
  }, [columnSort, handleSortChange]);

  const handleCreateProject = useCallback(async (data: CreateProjectFormData) => {
    try {
      setIsSubmitting(true);
      if (data.startFrom === 'template' && data.templateId) {
        const cloneResponse = await projectsApiService.cloneTemplateToProject(data.templateId, {
          title: data.name,
          description: data.description,
          country: data.country || undefined,
          categoryIri: data.categoryIri || undefined,
          categoryName: data.categoryName || undefined,
          projectTypeIri: data.projectTypeIri || undefined,
        });
        const newProject = projectsApiService.transformApiProject(cloneResponse.data);
        // Always override with the form-selected values since the clone API
        // response may not include category/country/type
        if (data.categoryName) newProject.category = data.categoryName;
        if (data.categoryIri) newProject.categoryIri = data.categoryIri;
        if (data.country) newProject.country = data.country;
        if (data.projectTypeIri) newProject.project_type = data.projectTypeIri;
        // Use the source template's test case count since the clone copies all test cases
        const sourceTemplate = modalTemplates.find(t => t.id === data.templateId);
        if (sourceTemplate) newProject.testCasesCount = sourceTemplate.testCasesCount;
        prependProject(newProject);
        toast.success('Project created successfully');
        // Refresh sidebar only — do not refetch the list as it would overwrite
        // the patched project with incomplete API data
        loadProjects();
      } else {
        await createProject({
          name: data.name,
          description: data.description,
          userId: authState.user?.id,
          country: data.country || undefined,
          url: data.url || undefined,
          categoryIri: data.categoryIri || undefined,
          categoryName: data.categoryName || undefined,
          projectTypeIri: data.projectTypeIri || undefined,
        });
        const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);
        if (filterMode === 'my-projects') {
          await fetchProjectsCreatedByUser(authState.user?.id?.toString() || '', 1, sortOption?.param);
        } else {
          await fetchProjectsWithSort(1, sortOption?.param);
        }
        loadProjects();
      }
      setIsCreateModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [createProject, authState.user?.id, loadProjects, filterMode, sortBy, SORT_OPTIONS, fetchProjectsCreatedByUser, fetchProjectsWithSort]);

  const handleEditProject = useCallback(async (data: EditProjectFormData) => {
    if (!projectToManage) return;
    try {
      setIsSubmitting(true);
      await updateProject(projectToManage.id, {
        name: data.name,
        description: data.description,
        country: data.country || undefined,
        url: data.url || undefined,
        categoryIri: data.categoryIri || undefined,
        categoryName: data.categoryName || undefined,
        projectTypeIri: data.projectTypeIri || undefined,
      });
      // Patch AppContext sidebar projects with the submitted values directly,
      // avoiding a full reload that could drop category/type from unreliable API responses.
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: {
          ...projectToManage,
          name: data.name,
          description: data.description,
          country: data.country || projectToManage.country,
          url: data.url || projectToManage.url,
          categoryIri: data.categoryIri || projectToManage.categoryIri,
          category: data.categoryName || projectToManage.category,
          projectTypeIri: data.projectTypeIri || projectToManage.projectTypeIri,
          project_type: projectToManage.project_type,
        },
      });
      setIsEditModalOpen(false);
      setProjectToManage(null);
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  }, [updateProject, projectToManage, dispatch]);

  const handleCloneProject = useCallback(async () => {
    if (!projectToManage) return;
    try {
      setIsSubmitting(true);
      await cloneProject(projectToManage.id, {
        title: formData.name,
        description: formData.description,
        category: projectToManage.category ?? undefined,
        categoryIri: projectToManage.categoryIri ?? undefined,
        country: projectToManage.country ?? undefined,
        project_type: projectToManage.project_type ?? undefined,
        projectTypeIri: projectToManage.projectTypeIri ?? undefined,
        testCasesCount: projectToManage.testCasesCount,
      });
    } catch (err) {
      console.error('Error cloning:', err);
    } finally {
      setIsSubmitting(false);
      setIsCloneModalOpen(false);
      setProjectToManage(null);
      setFormData({ name: '', description: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneProject, projectToManage, formData]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectToManage) return;
    try {
      setIsSubmitting(true);
      await deleteProject(projectToManage.id);
      await loadProjects(true);
      setProjectToManage(null);
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteProject, projectToManage]);

  const openEditModal = useCallback((project: Project) => {
    setProjectToManage(project);
    setFormData({ name: project.name, description: project.description });
    setIsEditModalOpen(true);
  }, []);

  const openCloneModal = useCallback((project: Project) => {
    setProjectToManage(project);
    setFormData({ name: `${project.name} (copy)`, description: project.description });
    setIsCloneModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((project: Project) => {
    setProjectToManage(project);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);

    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-projects') {
        searchProjectsCreatedByUser(currentSearchTerm, authState.user?.id?.toString() || '', page, sortOption?.param);
      } else {
        searchProjects(currentSearchTerm, page, sortOption?.param);
      }
    } else {
      if (filterMode === 'my-projects') {
        fetchProjectsCreatedByUser(authState.user?.id?.toString() || '', page, sortOption?.param);
      } else {
        fetchProjectsWithSort(page, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearchTerm, filterMode, sortBy, searchProjects, searchProjectsCreatedByUser, fetchProjectsCreatedByUser, fetchProjectsWithSort]);

  const handleProjectClick = useCallback((project: Project) => {
    dispatch({ type: 'SET_NAVIGATING_TO_PROJECT', payload: true });

    const contextProject = getSelectedProject();
    if (!contextProject || contextProject.id !== project.id) {
      dispatch({ type: 'UPDATE_PROJECT', payload: project });
    }

    dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });

    setTimeout(() => {
      toast.success(`Selected project: ${project.name}`);
      navigate('/dashboard');
    }, 50);
  }, [dispatch, navigate, getSelectedProject]);

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

    if (hasFetchedRef.current) return;

    const sortOption = SORT_OPTIONS.find(o => o.value === sortBy);
    fetchProjectsWithSort(1, sortOption?.param);
    hasFetchedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, sortBy, appState.isNavigatingToProject]);

  useEffect(() => {
    const fetchTemplatesForModal = async () => {
      if (isCreateModalOpen) {
        setTemplatesLoadingForModal(true);
        try {
          const response = await projectsApiService.getTemplates(1);
          const transformedTemplates = response.data.map(apiTemplate =>
            projectsApiService.transformApiProject(apiTemplate)
          );
          setModalTemplates(transformedTemplates);
        } catch (err) {
          console.error('Error fetching templates for modal:', err);
        } finally {
          setTemplatesLoadingForModal(false);
        }
      }
    };
    fetchTemplatesForModal();
  }, [isCreateModalOpen]);

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load projects</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchProjects(1)}>Try Again</Button>
        </div>
      </div>
    );
  }

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    const isActive = columnSort.field === field;
    return (
      <span className="inline-flex flex-col ml-1 -space-y-1">
        <ChevronUp className={`w-3 h-3 ${isActive && columnSort.direction === 'asc' ? 'text-cyan-400' : 'text-slate-500 dark:text-gray-600'}`} />
        <ChevronDown className={`w-3 h-3 ${isActive && columnSort.direction === 'desc' ? 'text-cyan-400' : 'text-slate-500 dark:text-gray-600'}`} />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 data-mipqa="projects-title" className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span><span className="font-semibold text-slate-700 dark:text-gray-200">{pagination.totalItems} done</span> this month</span>
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <SearchAutocomplete
              data-mipqa="projects-search-input"
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={handleSearch}
              suggestions={projectNameSuggestions}
              placeholder="Search for project..."
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-gray-400">View</span>
            <ViewDropdown value={filterMode} onChange={handleFilterChange} />
          </div>

          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              data-mipqa="projects-view-list-btn"
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              data-mipqa="projects-view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <PermissionGuard permission={PERMISSIONS.PROJECT.CREATE}>
          <button
            data-mipqa="create-project-button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create new project
          </button>
        </PermissionGuard>
      </div>

      {/* Active filters */}
      {(currentSearchTerm || filterMode !== 'all') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-gray-400">Active filters:</span>
          {currentSearchTerm && (
            <span className="inline-flex items-center px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-600 dark:text-cyan-400">
              Search: &ldquo;{currentSearchTerm}&rdquo;
            </span>
          )}
          {filterMode !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-600 dark:text-blue-400">
              My Projects
            </span>
          )}
          <button
            onClick={() => {
              setSearchTerm('');
              setCurrentSearchTerm('');
              setFilterMode('all');
              setSortBy('createdAt-desc');
              fetchProjectsWithSort(1, SORT_OPTIONS.find(o => o.value === 'createdAt-desc')?.param);
            }}
            className="text-xs text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 rounded-2xl">
            <Loader className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-spin" />
          </div>
        )}

        {viewMode === 'grid' ? (
          /* ---- GRID VIEW ---- */
          <>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project)}
                    onEdit={() => openEditModal(project)}
                    onDuplicate={() => openCloneModal(project)}
                    onDelete={() => openDeleteDialog(project)}
                    onTestCasesClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });
                      dispatch({ type: 'UPDATE_PROJECT', payload: project });
                      navigate('/test-cases');
                      toast.success(`Viewing test cases for ${project.name}`);
                    }}
                    onTestRunsClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });
                      dispatch({ type: 'UPDATE_PROJECT', payload: project });
                      navigate('/test-runs');
                      toast.success(`Viewing test runs for ${project.name}`);
                    }}
                    canEdit={hasPermission(PERMISSIONS.PROJECT.UPDATE)}
                    canCreate={hasPermission(PERMISSIONS.PROJECT.CREATE)}
                    canDelete={hasPermission(PERMISSIONS.PROJECT.DELETE)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-gray-600" />
                <p className="text-lg font-medium text-slate-500 dark:text-gray-400">No projects found</p>
                <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
                  {currentSearchTerm || filterMode !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first project to get started.'}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          /* ---- LIST VIEW ---- */
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm">
            <div className="overflow-x-auto overflow-y-visible rounded-2xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60">
                    <th
                      className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 cursor-pointer select-none hover:text-slate-700 dark:hover:text-gray-300 transition-colors w-20"
                      onClick={() => handleColumnSort('id')}
                    >
                      <span className="flex items-center">ID <SortIcon field="id" /></span>
                    </th>
                    <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                      Project Name
                    </th>
                    <th className="text-center py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-36">
                      Test Case
                    </th>
                    <th className="text-center py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-36">
                      Test Runs
                    </th>
                    <th
                      className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 cursor-pointer select-none hover:text-slate-700 dark:hover:text-gray-300 transition-colors w-44"
                      onClick={() => handleColumnSort('updatedAt')}
                    >
                      <span className="flex items-center">Modified <SortIcon field="updatedAt" /></span>
                    </th>
                    {hasAnyAction && (
                      <th className="text-right py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 w-28">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      data-mipqa={`project-row-${project.id}`}
                      onClick={() => handleProjectClick(project)}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6 text-sm font-mono text-slate-500 dark:text-gray-400">
                        #{project.id || 'N/A'}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <ProjectTitle
                          project={project}
                          nameClassName="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                        />
                        {project.description && (
                          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-1">{project.description}</p>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          data-mipqa={`project-testcases-btn-${project.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });
                            dispatch({ type: 'UPDATE_PROJECT', payload: project });
                            navigate('/test-cases');
                            toast.success(`Viewing test cases for ${project.name}`);
                          }}
                          className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors whitespace-nowrap"
                        >
                          {project.testCasesCount} Test cases
                        </button>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          data-mipqa={`project-testruns-btn-${project.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });
                            dispatch({ type: 'UPDATE_PROJECT', payload: project });
                            navigate('/test-runs');
                            toast.success(`Viewing test runs for ${project.name}`);
                          }}
                          className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors whitespace-nowrap"
                        >
                          {project.testRunsCount > 0 ? `${project.testRunsCount} test run${project.testRunsCount !== 1 ? 's' : ''}` : 'No test run'}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500 dark:text-gray-400">
                        {formatModifiedDate(project.updatedAt)}
                      </td>
                      {hasAnyAction && (
                        <td className="py-4 px-6 align-middle">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {hasPermission(PERMISSIONS.PROJECT.UPDATE) && (
                              <button
                                data-mipqa={`project-edit-btn-${project.id}`}
                                onClick={() => openEditModal(project)}
                                className="p-2 text-slate-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit"
                                disabled={isSubmitting}
                              >
                                <SquarePen className="w-4 h-4" />
                              </button>
                            )}
                            <ActionMenu
                              project={project}
                              onDuplicate={openCloneModal}
                              onDelete={openDeleteDialog}
                              canCreate={hasPermission(PERMISSIONS.PROJECT.CREATE)}
                              canDelete={hasPermission(PERMISSIONS.PROJECT.DELETE)}
                              disabled={isSubmitting}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {projects.length === 0 && !loading && (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-gray-600" />
                  <p className="text-lg font-medium text-slate-500 dark:text-gray-400">No projects found</p>
                  <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
                    {currentSearchTerm || filterMode !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Create your first project to get started.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-gray-400">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} projects
            </div>
            <div className="flex items-center space-x-2">
              <Button
                data-mipqa="projects-pagination-prev"
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500 dark:text-gray-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                data-mipqa="projects-pagination-next"
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
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        templates={modalTemplates}
        templatesLoading={templatesLoadingForModal}
      />

      <EditProjectModal
        isOpen={isEditModalOpen}
        project={projectToManage}
        onClose={() => { setIsEditModalOpen(false); setProjectToManage(null); }}
        onSubmit={handleEditProject}
      />

      <CloneProjectModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onSubmit={handleCloneProject}
        title="Clone Project"
        projectData={formData}
        setProjectData={setFormData}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete the project "${projectToManage?.name}"? This action is irreversible and will delete all associated test cases, test runs, and data.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Projects;
