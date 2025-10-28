import React, { useState, useCallback } from 'react';
import { Plus, Search, Filter, SquarePen, Trash2, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types';
import toast from 'react-hot-toast';

// Composant modal pour créer/éditer un projet
const ProjectModal: React.FC<{
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={projectData.name}
            onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter project name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={projectData.description}
            onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            disabled={isSubmitting}
            placeholder="Enter project description"
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

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { getSelectedProject } = useApp();
  const { state: authState } = useAuth();
  const { dispatch, loadProjects } = useApp();
  const selectedProject = getSelectedProject();
  
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
    deleteProject 
  } = useProjects();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-projects'>('all');
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToManage, setProjectToManage] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  const SORT_OPTIONS = [
    { value: 'createdAt-desc', label: 'Creation Date (New → Old)', param: 'order[createdAt]=desc' },
    { value: 'createdAt-asc', label: 'Creation Date (Old → New)', param: 'order[createdAt]=asc' },
    { value: 'id-asc', label: 'ID (Ascending)', param: 'order[id]=asc' },
    { value: 'id-desc', label: 'ID (Descending)', param: 'order[id]=desc' },
    { value: 'updatedAt-desc', label: 'Last Modified', param: 'order[updatedAt]=desc' },
    { value: 'title-asc', label: 'Title (A-Z)', param: 'order[title]=asc' },
    { value: 'title-desc', label: 'Title (Z-A)', param: 'order[title]=desc' }
  ];

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);
    
    if (term.trim()) {
      if (filterMode === 'my-projects') {
        // Recherche dans mes projets
        await searchProjectsCreatedByUser(term, authState.user?.id?.toString() || '', 1, sortOption?.param);
      } else {
        // Recherche dans tous les projets
        await searchProjects(term, 1, sortOption?.param);
      }
    } else {
      // Si la recherche est vide, revenir à la liste normale
      await handleFilterChange(filterMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS, authState.user?.id, handleFilterChange are stable
  }, [searchProjects, searchProjectsCreatedByUser, filterMode, sortBy]);

  const handleFilterChange = useCallback(async (mode: 'all' | 'my-projects') => {
    setFilterMode(mode);
    setSearchTerm('');
    setCurrentSearchTerm('');
    
    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);
    
    if (mode === 'my-projects') {
      const userId = authState.user?.id?.toString() || '';
      console.log('🔍 Filtering by user ID:', userId, 'from user:', authState?.user);
      await fetchProjectsCreatedByUser(userId || '', 1, sortOption?.param);
    } else {
      await fetchProjectsWithSort(1, sortOption?.param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS is a constant
  }, [fetchProjectsCreatedByUser, fetchProjectsWithSort, sortBy, authState]);

  const handleSortChange = useCallback(async (newSortBy: string) => {
    setSortBy(newSortBy);
    const sortOption = SORT_OPTIONS.find(option => option.value === newSortBy);
    
    if (currentSearchTerm.trim()) {
      // Si on a une recherche active, refaire la recherche avec le nouveau tri
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        console.log('🔍 Searching with user ID:', userId);
        await searchProjectsCreatedByUser(currentSearchTerm, userId, 1, sortOption?.param);
      } else {
        await searchProjects(currentSearchTerm, 1, sortOption?.param);
      }
    } else {
      // Sinon, refaire la liste avec le nouveau tri
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        console.log('🔍 Sorting with user ID:', userId);
        await fetchProjectsCreatedByUser(userId, 1, sortOption?.param);
      } else {
        await fetchProjectsWithSort(1, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS, authState.user?.id are stable
  }, [searchProjects, searchProjectsCreatedByUser, fetchProjectsCreatedByUser, fetchProjectsWithSort, currentSearchTerm, filterMode]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleCreateProject = useCallback(async () => {
    try {
      setIsSubmitting(true);
      await createProject(newProject);
      // Refresh the global project list in AppContext
      await loadProjects(true);
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '' });
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects is stable
  }, [createProject, newProject]);

  const handleEditProject = useCallback(async () => {
    if (!projectToManage) return;

    try {
      setIsSubmitting(true);
      await updateProject(projectToManage.id, newProject);
      // Refresh the global project list in AppContext
      await loadProjects(true);
      setIsEditModalOpen(false);
      setProjectToManage(null);
      setNewProject({ name: '', description: '' });
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects is stable
  }, [updateProject, projectToManage, newProject]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectToManage) return;
    
    try {
      setIsSubmitting(true);
      await deleteProject(projectToManage.id);
      // Refresh the global project list in AppContext
      await loadProjects(true);
      setProjectToManage(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjects is stable
  }, [deleteProject, projectToManage]);

  const openEditModal = useCallback((project: Project) => {
    setProjectToManage(project);
    setNewProject({
      name: project.name,
      description: project.description
    });
    setIsEditModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((project: Project) => {
    setProjectToManage(project);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    const sortOption = SORT_OPTIONS.find(option => option.value === sortBy);
    
    if (currentSearchTerm.trim()) {
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        console.log('🔍 Paginating with user ID:', userId);
        searchProjectsCreatedByUser(currentSearchTerm, userId, page, sortOption?.param);
      } else {
        searchProjects(currentSearchTerm, page, sortOption?.param);
      }
    } else {
      if (filterMode === 'my-projects') {
        const userId = authState.user?.id?.toString() || '';
        console.log('🔍 Paginating with user ID:', userId);
        fetchProjectsCreatedByUser(userId, page, sortOption?.param);
      } else {
        fetchProjectsWithSort(page, sortOption?.param);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS, authState.user?.id are stable
  }, [currentSearchTerm, filterMode, sortBy, searchProjects, searchProjectsCreatedByUser, fetchProjectsCreatedByUser, fetchProjectsWithSort]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentSearchTerm('');
    setFilterMode('all');
    setSortBy('createdAt-desc');
    const sortOption = SORT_OPTIONS.find(option => option.value === 'createdAt-desc');
    fetchProjectsWithSort(1, sortOption?.param);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SORT_OPTIONS is a constant
  }, [fetchProjectsWithSort]);

  const handleProjectClick = useCallback((project: Project) => {
    console.log('🎯 Project clicked:', project.name, 'ID:', project.id);
    
    // CRITICAL: Ensure the project exists in App context state
    // If it doesn't exist, add it to the context
    const contextProject = getSelectedProject();
    if (!contextProject || contextProject.id !== project.id) {
      console.log('📝 Adding/updating project in App context:', project.name);
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
  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load projects</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchProjects(1)}>
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
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <p className="text-gray-400">
            Manage your testing projects ({pagination.totalItems} total)
          </p>
          {selectedProject && (
            <div className="mt-2">
              <div className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400">
                📁 Selected: {selectedProject.name}
              </div>
            </div>
          )}
        </div>
        <Button 
          icon={Plus} 
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterMode}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'my-projects')}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Projects</option>
                <option value="my-projects">My Projects</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
            <span className="text-sm text-gray-400">Active filters:</span>
            {currentSearchTerm && (
              <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400">
                Search: "{currentSearchTerm}"
              </span>
            )}
            {filterMode !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
                Filter: {filterMode === 'my-projects' ? 'My Projects' : 'All Projects'}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-400 hover:text-white underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      {/* Projects Table */}
      <Card className="overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">ID</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Title</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400 whitespace-nowrap">Quick Links</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-300 font-mono">
                    #{project.id || 'NO_ID'}
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <button
                        onClick={() => handleProjectClick(project)}
                        className="text-left w-full group"
                        disabled={!project.id || project.id === '' || project.id === 'undefined'}
                      >
                        <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors cursor-pointer">
                          {project.name}
                          {(!project.id || project.id === '' || project.id === 'undefined') && (
                            <span className="text-red-400 text-xs ml-2">(NO ID)</span>
                          )}
                        </h3>
                      </button>
                      <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🎯 Test Cases link clicked for project:', project.name, 'ID:', project.id);
                          
                          // Set the selected project
                          dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: project.id });
                          
                          // Ensure the project exists in App context state
                          dispatch({ type: 'UPDATE_PROJECT', payload: project });
                          
                          // Navigate to test cases page
                          navigate('/test-cases');
                          
                          toast.success(`Viewing test cases for ${project.name}`);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors text-left whitespace-nowrap"
                      >
                        {project.testCasesCount} Test Cases
                      </button>
                      <div className="text-purple-400 hover:text-purple-300 cursor-pointer whitespace-nowrap">
                        {project.testRunsCount} Test Runs
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit"
                        disabled={isSubmitting}
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(project)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {projects.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No projects found</p>
                <p className="text-sm">
                  {currentSearchTerm || filterMode !== 'all'
                    ? 'No projects found matching your filters. Try adjusting your search or filters.'
                    : 'No projects found. Create your first project to get started.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} projects
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
                <span className="text-sm text-gray-400">
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
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        title="Create New Project"
        projectData={newProject}
        setProjectData={setNewProject}
        isSubmitting={isSubmitting}
      />

      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditProject}
        title="Edit Project"
        projectData={newProject}
        setProjectData={setNewProject}
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