import { useState } from 'react';
import { projectsApiService, ProjectsApiResponse } from '../services/projectsApi';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { useLoading } from '../context/LoadingContext';

export const useTemplates = () => {
  const { withLoading } = useLoading();
  const [templates, setTemplates] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 30,
    totalPages: 1
  });

  const fetchTemplates = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      let response: ProjectsApiResponse = await projectsApiService.getTemplatesList(page, 30);

      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }

      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };

      const transformedTemplates = responseData.map(apiTemplate =>
        projectsApiService.transformApiProject(apiTemplate)
      );

      setTemplates(transformedTemplates);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchTemplates = async (searchTerm: string, page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);

      let response: ProjectsApiResponse = await projectsApiService.searchTemplatesList(searchTerm, page, 30, sortParam);

      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }

      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };

      const transformedTemplates = responseData.map(apiTemplate =>
        projectsApiService.transformApiProject(apiTemplate)
      );

      setTemplates(transformedTemplates);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search templates';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error searching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesCreatedByUser = async (userId: string, page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);

      let response: ProjectsApiResponse = await projectsApiService.getTemplatesList(page, 30, sortParam, userId);

      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }

      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };

      const transformedTemplates = responseData.map(apiTemplate =>
        projectsApiService.transformApiProject(apiTemplate)
      );

      setTemplates(transformedTemplates);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user templates';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching user templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchTemplatesCreatedByUser = async (searchTerm: string, userId: string, page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);

      let response: ProjectsApiResponse = await projectsApiService.searchTemplatesList(searchTerm, page, 30, sortParam, userId);

      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }

      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };

      const transformedTemplates = responseData.map(apiTemplate =>
        projectsApiService.transformApiProject(apiTemplate)
      );

      setTemplates(transformedTemplates);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search user templates';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error searching user templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesWithSort = async (page: number = 1, sortParam?: string) => {
    try {
      setLoading(true);
      setError(null);

      let response: ProjectsApiResponse = await projectsApiService.getTemplatesList(page, 30, sortParam);

      if (!response) {
        response = projectsApiService.getDefaultProjectsResponse();
      }

      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };

      const transformedTemplates = responseData.map(apiTemplate =>
        projectsApiService.transformApiProject(apiTemplate)
      );

      setTemplates(transformedTemplates);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching templates with sort:', err);
    } finally {
      setLoading(false);
    }
  };

  const cloneTemplate = async (id: string, data: { title: string; description: string }) => {
    try {
      return await withLoading((async () => {
        const response = await projectsApiService.cloneTemplate(id, data);

        if (!response || !response.data) {
          throw new Error('Invalid response from clone API');
        }

        const clonedTemplate = projectsApiService.transformApiProject(response.data);
        setTemplates(prevTemplates => [clonedTemplate, ...prevTemplates]);

        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
        }));

        toast.success('Template cloned successfully');
        return clonedTemplate.id;
      })());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clone template';
      toast.error(errorMessage);
      throw err;
    }
  };

  const cloneTemplateToProject = async (id: string, data: { title: string; description: string }) => {
    try {
      return await withLoading((async () => {
        const response = await projectsApiService.cloneTemplateToProject(id, data);

        if (!response || !response.data) {
          throw new Error('Invalid response from clone API');
        }

        const clonedProject = projectsApiService.transformApiProject(response.data);
        toast.success('Template cloned to project successfully');
        return clonedProject;
      })());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clone template to project';
      toast.error(errorMessage);
      throw err;
    }
  };

  const createTemplate = async (templateData: { name: string; description: string }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.createTemplate({
          title: templateData.name,
          description: templateData.description
        });

        const newTemplate = projectsApiService.transformApiProject(response.data);
        setTemplates(prevTemplates => [newTemplate, ...prevTemplates]);

        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
        }));

        toast.success('Template created successfully');
        return response;
      })()
    );
  };

  const updateTemplate = async (id: string, templateData: { name: string; description: string }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.updateTemplate(id, {
          title: templateData.name,
          description: templateData.description
        });

        const updatedTemplate = projectsApiService.transformApiProject(response.data);
        setTemplates(prevTemplates =>
          prevTemplates.map(template =>
            template.id === id ? updatedTemplate : template
          )
        );

        toast.success('Template updated successfully');
      })(),
      'Updating template...'
    );
  };

  const deleteTemplate = async (id: string) => {
    return withLoading(
      (async () => {
        await projectsApiService.deleteTemplate(id);

        setTemplates(prevTemplates => prevTemplates.filter(template => template.id !== id));

        setPagination(prev => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
          totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
        }));

        toast.success('Template deleted successfully');
      })(),
      'Deleting template...'
    );
  };

  return {
    templates,
    loading,
    error,
    pagination,
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
  };
};
