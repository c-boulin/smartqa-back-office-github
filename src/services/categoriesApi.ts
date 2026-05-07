import { apiService } from './api';

export interface ApiCategory {
  id: string;
  type: string;
  attributes: {
    id: number;
    name: string;
  };
}

export interface CategoriesApiResponse {
  data: ApiCategory[];
}

export interface Category {
  id: string;
  name: string;
  iri: string;
}

function transformCategory(apiCategory: ApiCategory): Category {
  return {
    id: apiCategory.attributes.id.toString(),
    name: apiCategory.attributes.name,
    iri: apiCategory.id,
  };
}

class CategoriesApiService {
  async getCategories(): Promise<Category[]> {
    try {
      const response: CategoriesApiResponse = await apiService.authenticatedRequest('/categories');
      if (!response?.data) return [];
      return response.data.map(transformCategory);
    } catch {
      return [];
    }
  }
}

export const categoriesApiService = new CategoriesApiService();
