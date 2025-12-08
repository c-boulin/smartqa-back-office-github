import { apiService, Role } from './api';

export interface ApiUser {
  id: string;
  type: string;
  attributes: {
    id: number;
    name: string;
    login: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships?: {
    role?: {
      data: {
        type: string;
        id: string;
      } | [];
    };
    team?: {
      data: {
        type: string;
        id: string;
      } | [];
    };
  };
}

export interface IncludedRole {
  id: string;
  type: 'Role';
  attributes: {
    id: number;
    name: string;
    slug: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface IncludedTeam {
  id: string;
  type: 'Team';
  attributes: {
    id: number;
    name: string;
    description: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
}

export interface UsersApiResponse {
  links: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: ApiUser[];
  included?: Array<IncludedRole | IncludedTeam>;
}

export interface User {
  id: string;
  name: string;
  login: string;
  email: string;
  role_id: string | null;
  team_id: string | null;
  role?: Role;
  team?: Team;
}

class UsersApiService {
  public getDefaultUsersResponse(): UsersApiResponse {
    return {
      links: {
        self: '',
        first: '',
        last: ''
      },
      meta: {
        totalItems: 0,
        itemsPerPage: 100,
        currentPage: 1
      },
      data: []
    };
  }

  async getUsers(): Promise<UsersApiResponse> {
    const response = await apiService.authenticatedRequest('/users?itemsPerPage=100&include=role,team');
    return response || this.getDefaultUsersResponse();
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await apiService.authenticatedRequest(`/users/${userId}?include=role,team`);

      if (response?.data) {
        return this.transformApiUser(response.data, response.included);
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch user by ID:', error);
      return null;
    }
  }

  async getRoles(): Promise<Role[]> {
    const response = await apiService.authenticatedRequest('/roles');

    if (!response) {
      return [];
    }

    if (Array.isArray(response.data)) {
      return response.data.map((item: any) => {
        if (item.attributes) {
          return {
            id: item.attributes.id,
            name: item.attributes.name,
            slug: item.attributes.slug,
            description: item.attributes.description,
            created_at: item.attributes.createdAt || item.attributes.created_at,
            updated_at: item.attributes.updatedAt || item.attributes.updated_at,
            permissions: item.attributes.permissions || []
          };
        }
        return item;
      });
    }

    return [];
  }

  async getTeams(): Promise<Team[]> {
    const response = await apiService.authenticatedRequest('/teams');

    if (Array.isArray(response.data)) {
      return response.data.map((item: any) => ({
        id: item.attributes.id.toString(),
        name: item.attributes.name,
        description: item.attributes.description
      }));
    }

    return [];
  }

  async updateUserRole(userId: string, roleId: number): Promise<void> {
    await apiService.authenticatedRequest(`/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'users',
          id: userId,
          attributes: {
            role_id: roleId
          }
        }
      })
    });
  }

  async updateUserTeam(userId: string, teamId: number): Promise<void> {
    await apiService.authenticatedRequest(`/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'users',
          id: userId,
          attributes: {
            team_id: teamId
          }
        }
      })
    });
  }

  async createTeam(name: string, description: string): Promise<Team> {
    const response = await apiService.authenticatedRequest('/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'teams',
          attributes: {
            name,
            description
          }
        }
      })
    });

    return {
      id: response.data.attributes.id.toString(),
      name: response.data.attributes.name,
      description: response.data.attributes.description
    };
  }

  transformApiUser(apiUser: ApiUser, included?: Array<IncludedRole | IncludedTeam>): User {
    let role: Role | undefined;
    let roleId: string | null = null;
    let team: Team | undefined;
    let teamId: string | null = null;

    if (apiUser.relationships?.role?.data && !Array.isArray(apiUser.relationships.role.data)) {
      const roleReference = apiUser.relationships.role.data;
      const roleIdFromPath = roleReference.id.split('/').pop();

      if (roleIdFromPath && included) {
        const includedRole = included.find(
          item => item.type === 'Role' && item.id === roleReference.id
        ) as IncludedRole | undefined;

        if (includedRole) {
          roleId = includedRole.attributes.id.toString();
          role = {
            id: includedRole.attributes.id,
            name: includedRole.attributes.name,
            slug: includedRole.attributes.slug,
            description: includedRole.attributes.description,
            created_at: includedRole.attributes.createdAt,
            updated_at: includedRole.attributes.updatedAt,
            permissions: []
          };
        }
      }
    }

    if (apiUser.relationships?.team?.data && !Array.isArray(apiUser.relationships.team.data)) {
      const teamReference = apiUser.relationships.team.data;
      const teamIdFromPath = teamReference.id.split('/').pop();

      if (teamIdFromPath && included) {
        const includedTeam = included.find(
          item => item.type === 'Team' && item.id === teamReference.id
        ) as IncludedTeam | undefined;

        if (includedTeam) {
          teamId = includedTeam.attributes.id.toString();
          team = {
            id: includedTeam.attributes.id.toString(),
            name: includedTeam.attributes.name,
            description: includedTeam.attributes.description
          };
        }
      } else if (teamIdFromPath) {
        teamId = teamIdFromPath;
      }
    }

    return {
      id: apiUser.attributes.id.toString(),
      name: apiUser.attributes.name,
      login: apiUser.attributes.login,
      email: apiUser.attributes.email,
      role_id: roleId,
      team_id: teamId,
      role,
      team
    };
  }
}

export const usersApiService = new UsersApiService();