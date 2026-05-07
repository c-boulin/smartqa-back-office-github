import { useState } from 'react';
import { projectsApiService, ProjectsApiResponse } from '../services/projectsApi';
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
      
      let response: ProjectsApiResponse = await projectsApiService.getProjectsList(page, 30);
      
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
      
      let response: ProjectsApiResponse = await projectsApiService.searchProjectsList(searchTerm, page, 30, sortParam);
      
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
      
      let response: ProjectsApiResponse = await projectsApiService.getProjectsList(page, 30, sortParam, userId);
      
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
      
      let response: ProjectsApiResponse = await projectsApiService.searchProjectsList(searchTerm, page, 30, sortParam, userId);
      
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

      let response: ProjectsApiResponse = await projectsApiService.getProjectsList(page, 30, sortParam);
      
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
  const createProject = async (projectData: { name: string; description: string; userId?: string; country?: string; url?: string; categoryIri?: string; categoryName?: string; projectTypeIri?: string; }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.createProject({
          title: projectData.name,
          description: projectData.description,
          country: projectData.country,
          url: projectData.url,
          categoryIri: projectData.categoryIri,
          projectTypeIri: projectData.projectTypeIri,
        });

        // Transform and add the new project to the current list
        const newProject = projectsApiService.transformApiProject(response.data);
        if (!newProject.category && projectData.categoryName) {
          newProject.category = projectData.categoryName;
        }
        setProjects(prevProjects => [newProject, ...prevProjects]);

        // Update pagination to reflect the new total
        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
        }));

        toast.success('Project created successfully');
        return newProject.id;
      })(),
      'Creating project...'
    );
  };

  const updateProject = async (id: string, projectData: { name: string; description: string; country?: string; url?: string; categoryIri?: string; categoryName?: string; projectTypeIri?: string; }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.updateProject(id, {
          title: projectData.name,
          description: projectData.description,
          country: projectData.country,
          url: projectData.url,
          categoryIri: projectData.categoryIri,
          projectTypeIri: projectData.projectTypeIri,
        });
        
        // Transform and update the project in the current list.
        // The PATCH response may omit category/projectType, so use the submitted values as truth.
        const updatedProject = projectsApiService.transformApiProject(response.data);
        setProjects(prevProjects =>
          prevProjects.map(project => {
            if (project.id !== id) return project;
            return {
              ...project,
              ...updatedProject,
              category: projectData.categoryName ?? updatedProject.category ?? project.category,
              categoryIri: projectData.categoryIri ?? updatedProject.categoryIri ?? project.categoryIri,
              project_type: projectData.projectTypeIri ?? updatedProject.project_type ?? project.project_type,
              projectTypeIri: projectData.projectTypeIri ?? updatedProject.projectTypeIri ?? project.projectTypeIri,
            };
          })
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

  const cloneProject = async (sourceProjectId: string, projectData: { title: string; description: string; category?: string; categoryIri?: string; country?: string; project_type?: string; projectTypeIri?: string; testCasesCount?: number }) => {
    try {
      return await withLoading(
        (async () => {
          const response = await projectsApiService.cloneProject(sourceProjectId, projectData);

          if (!response || !response.data) {
            throw new Error('Invalid response from clone API');
          }

          const clonedProject = projectsApiService.transformApiProject(response.data);

          // Persist category/country/type to the backend so re-fetches return complete data
          if (projectData.country || projectData.categoryIri || projectData.projectTypeIri) {
            try {
              await projectsApiService.updateProject(clonedProject.id, {
                title: clonedProject.name,
                description: clonedProject.description,
                country: projectData.country,
                categoryIri: projectData.categoryIri,
                projectTypeIri: projectData.projectTypeIri,
              });
            } catch {
              // Non-fatal — still show the project with patched in-memory data
            }
          }

          // Apply source metadata to in-memory record immediately
          if (projectData.category) clonedProject.category = projectData.category;
          if (projectData.categoryIri) clonedProject.categoryIri = projectData.categoryIri;
          if (projectData.country) clonedProject.country = projectData.country;
          if (projectData.project_type) clonedProject.project_type = projectData.project_type;
          if (projectData.projectTypeIri) clonedProject.projectTypeIri = projectData.projectTypeIri;
          if (projectData.testCasesCount !== undefined) clonedProject.testCasesCount = projectData.testCasesCount;

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

  const prependProject = (project: import('../types').Project) => {
    setProjects(prev => [project, ...prev]);
    setPagination(prev => ({
      ...prev,
      totalItems: prev.totalItems + 1,
      totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage),
    }));
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
    prependProject,
    cloneProject
  };
};