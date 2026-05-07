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

  const cloneTemplate = async (id: string, data: { title: string; description: string; category?: string; categoryIri?: string; country?: string; project_type?: string; projectTypeIri?: string; testCasesCount?: number }) => {
    try {
      return await withLoading((async () => {
        const response = await projectsApiService.cloneTemplate(id, data);

        if (!response || !response.data) {
          throw new Error('Invalid response from clone API');
        }

        const clonedTemplate = projectsApiService.transformApiProject(response.data);

        // Persist category/country/type to the backend so re-fetches return complete data
        if (data.country || data.categoryIri || data.projectTypeIri) {
          try {
            await projectsApiService.updateTemplate(clonedTemplate.id, {
              title: clonedTemplate.name,
              description: clonedTemplate.description,
              categoryIri: data.categoryIri,
              country: data.country,
              projectTypeIri: data.projectTypeIri,
            });
          } catch {
            // Non-fatal — still show template with patched in-memory data
          }
        }

        // Apply source metadata to in-memory record immediately
        if (data.category) clonedTemplate.category = data.category;
        if (data.categoryIri) clonedTemplate.categoryIri = data.categoryIri;
        if (data.country) clonedTemplate.country = data.country;
        if (data.project_type) clonedTemplate.project_type = data.project_type;
        if (data.projectTypeIri) clonedTemplate.projectTypeIri = data.projectTypeIri;
        if (data.testCasesCount !== undefined) clonedTemplate.testCasesCount = data.testCasesCount;
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

  const createTemplate = async (templateData: { name: string; description: string; country?: string; url?: string; categoryIri?: string; categoryName?: string; projectTypeIri?: string; }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.createTemplate({
          title: templateData.name,
          description: templateData.description,
          country: templateData.country,
          url: templateData.url,
          categoryIri: templateData.categoryIri,
          projectTypeIri: templateData.projectTypeIri,
        });

        const newTemplate = projectsApiService.transformApiProject(response.data);
        if (!newTemplate.category && templateData.categoryName) {
          newTemplate.category = templateData.categoryName;
        }
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

  const updateTemplate = async (id: string, templateData: { name: string; description: string; categoryIri?: string; categoryName?: string }) => {
    return withLoading(
      (async () => {
        const response = await projectsApiService.updateTemplate(id, {
          title: templateData.name,
          description: templateData.description,
          categoryIri: templateData.categoryIri,
        });

        const updatedTemplate = projectsApiService.transformApiProject(response.data);
        if (!updatedTemplate.category && templateData.categoryName) {
          updatedTemplate.category = templateData.categoryName;
        }
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
