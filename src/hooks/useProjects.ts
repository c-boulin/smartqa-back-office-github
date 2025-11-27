import { useState } from 'react';
import { projectsApiService, ProjectsApiResponse } from '../services/projectsApi';
import { foldersApiService } from '../services/foldersApi';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { useLoading } from '../context/LoadingContext';

// Import SORT_OPTIONS from the component or define it here
const _SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Creation Date (New → Old)', param: 'order[createdAt]=desc' },
  { value: 'createdAt-asc', label: 'Creation Date (Old → New)', param: 'order[createdAt]=asc' },
  { value: 'id-asc', label: 'ID (Ascending)', param: 'order[id]=asc' },
  { value: 'id-desc', label: 'ID (Descending)', param: 'order[id]=desc' },
  { value: 'updatedAt-desc', label: 'Last Modified', param: 'order[updatedAt]=desc' },
  { value: 'title-asc', label: 'Title (A-Z)', param: 'order[title]=asc' },
  { value: 'title-desc', label: 'Title (Z-A)', param: 'order[title]=desc' }
];

export const useProjects = () => {
  const { withLoading } = useLoading();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 30,
    totalPages: 1
  });

  const fetchProjects = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      let response: ProjectsApiResponse = await projectsApiService.getProjects(page);
      
      // Ensure response is defined, if not use default
      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }
      
      // Defensive checks for response structure
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedProjects = responseData.map(apiProject => 
        projectsApiService.transformApiProject(apiProject)
      );

      // Check for projects with invalid IDs
      const invalidProjects = transformedProjects.filter(p => !p.id || p.id === '' || p.id === 'undefined');
      if (invalidProjects.length > 0) {
        console.error('❌ Found projects with invalid IDs:', invalidProjects);
      }
      
      setProjects(transformedProjects);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchProjects = async (searchTerm: string, page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let response: ProjectsApiResponse = await projectsApiService.searchProjects(searchTerm, page, 30, sortParam);
      
      // Ensure response is defined, if not use default
      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }
      
      // Defensive checks for response structure
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedProjects = responseData.map(apiProject => 
        projectsApiService.transformApiProject(apiProject)
      );

      // Check for projects with invalid IDs
      const invalidProjects = transformedProjects.filter(p => !p.id || p.id === '' || p.id === 'undefined');
      if (invalidProjects.length > 0) {
        console.error('❌ Found projects with invalid IDs:', invalidProjects);
      }
      
      setProjects(transformedProjects);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search projects';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error searching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectsCreatedByUser = async (userId: string, page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let response: ProjectsApiResponse = await projectsApiService.getProjectsCreatedByUser(userId, page, 30, sortParam);
      
      // Ensure response is defined, if not use default
      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }
      
      // Defensive checks for response structure
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedProjects = responseData.map(apiProject => 
        projectsApiService.transformApiProject(apiProject)
      );

      // Check for projects with invalid IDs
      const invalidProjects = transformedProjects.filter(p => !p.id || p.id === '' || p.id === 'undefined');
      if (invalidProjects.length > 0) {
        console.error('❌ Found projects with invalid IDs:', invalidProjects);
      }
      
      setProjects(transformedProjects);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects created by user';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching projects created by user:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchProjectsCreatedByUser = async (searchTerm: string, userId: string, page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let response: ProjectsApiResponse = await projectsApiService.searchProjectsCreatedByUser(searchTerm, userId, page, 30, sortParam);
      
      // Ensure response is defined, if not use default
      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }
      
      // Defensive checks for response structure
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedProjects = responseData.map(apiProject => 
        projectsApiService.transformApiProject(apiProject)
      );

      // Check for projects with invalid IDs
      const invalidProjects = transformedProjects.filter(p => !p.id || p.id === '' || p.id === 'undefined');
      if (invalidProjects.length > 0) {
        console.error('❌ Found projects with invalid IDs:', invalidProjects);
      }
      
      setProjects(transformedProjects);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search projects created by user';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error searching projects created by user:', err);
    } finally {
      setLoading(false);
    }
  };
  const fetchProjectsWithSort = async (page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);

      let response: ProjectsApiResponse = await projectsApiService.getProjectsWithSort(page, 30, sortParam);
      
      // Ensure response is defined, if not use default
      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }
      
      // Defensive checks for response structure
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedProjects = responseData.map(apiProject => 
        projectsApiService.transformApiProject(apiProject)
      );

      // Check for projects with invalid IDs
      const invalidProjects = transformedProjects.filter(p => !p.id || p.id === '' || p.id === 'undefined');
      if (invalidProjects.length > 0) {
        console.error('❌ Found projects with invalid IDs:', invalidProjects);
      }
      
      setProjects(transformedProjects);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching projects with sort:', err);
    } finally {
      setLoading(false);
    }
  };
  const createProject = async (projectData: { name: string; description: string; userId?: string }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.createProject({
          title: projectData.name,
          description: projectData.description
        });

        // Transform and add the new project to the current list
        const newProject = projectsApiService.transformApiProject(response.data);
        setProjects(prevProjects => [newProject, ...prevProjects]);

        // Update pagination to reflect the new total
        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
        }));

        // Create default folder for the new project
        if (projectData.userId) {
          try {
            await foldersApiService.createFolder({
              name: 'Default Folder',
              description: 'Default folder for organizing test cases',
              projectId: newProject.id,
              childrenIds: [],
              userId: projectData.userId
            });
          } catch (error) {
            console.error('Failed to create default folder:', error);
          }
        }

        toast.success('Project created successfully');
        return newProject.id;
      })(),
      'Creating project...'
    );
  };

  const updateProject = async (id: string, projectData: { name: string; description: string }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.updateProject(id, {
          title: projectData.name,
          description: projectData.description
        });
        
        // Transform and update the project in the current list
        const updatedProject = projectsApiService.transformApiProject(response.data);
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.id === id ? updatedProject : project
          )
        );
        
        toast.success('Project updated successfully');
      })(),
      'Updating project...'
    );
  };

  const deleteProject = async (id: string) => {
    return withLoading(
      (async () => {
        await projectsApiService.deleteProject(id);

        // Remove the project from the current list
        setProjects(prevProjects => prevProjects.filter(project => project.id !== id));

        // Update pagination to reflect the new total
        setPagination(prev => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
          totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
        }));

        toast.success('Project deleted successfully');
      })(),
      'Deleting project...'
    );
  };

  const cloneProject = async (sourceProjectId: string, projectData: { title: string; description: string }) => {
    try {
      return await withLoading(
        (async () => {
          const response = await projectsApiService.cloneProject(sourceProjectId, projectData);

          if (!response || !response.data) {
            throw new Error('Invalid response from clone API');
          }

          const clonedProject = projectsApiService.transformApiProject(response.data);

          setProjects(prevProjects => [clonedProject, ...prevProjects]);

          setPagination(prev => ({
            ...prev,
            totalItems: prev.totalItems + 1,
            totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
          }));

          toast.success('Project cloned successfully');
          return clonedProject.id;
        })(),
        'Cloning project...'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone project';
      toast.error(errorMessage);
      throw error;
    }
  };

  return {
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
    cloneProject
  };
};