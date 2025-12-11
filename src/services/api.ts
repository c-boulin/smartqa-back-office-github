const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface SSOInitResponse {
  data: {
    url: string;
  };
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

export interface SSOLoginResponse {
  data: {
    id: string;
    type: string;
    token: string;
    attributes: {
      id: number;
      name: string;
      login: string;
      email: string;
      role_id: string;
      created_at: string;
      updated_at: string;
      role: Role;
    };
    permissions: string[];
  };
}

export interface User {
  id: number;
  name: string;
  login: string;
  email: string;
  token: string;
  role_id: string | null;
  role?: Role;
  permissions?: string[];
}

class ApiService {
  private baseURL: string;

  constructor() {
    if (!API_BASE_URL || typeof API_BASE_URL !== 'string' || API_BASE_URL.trim() === '') {
      console.error('VITE_API_BASE_URL is not defined or is empty. Please set it in your .env file.');
      throw new Error('API_BASE_URL is not configured. Please check your .env file.');
    }
    this.baseURL = API_BASE_URL;
  }

  async initSSO(callbackUrl: string): Promise<SSOInitResponse> {
    const response = await fetch(`${this.baseURL}/sso/init?callback_url=${encodeURIComponent(callbackUrl)}`);
    if (!response.ok) {
      throw new Error('Failed to initialize SSO');
    }
    return response.json();
  }

  async loginSSO(sesameToken: string): Promise<SSOLoginResponse> {
    const response = await fetch(`${this.baseURL}/sso/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sesame_token: sesameToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to login with SSO');
    }
    return response.json();
  }

  // Helper method for authenticated API calls
  async authenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    
    if (!token || token.trim() === '') {
      throw new Error('No authentication token found');
    }
    
    const headers = {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    let response;
    try {
      response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (error) {
      // Handle network-level errors (Failed to fetch, CORS, etc.)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the server. Please check your internet connection or try again later.');
      } else if (error instanceof TypeError && error.message.includes('CORS')) {
        throw new Error('Cross-origin request blocked. Please contact support.');
      } else {
        throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown network error'}`);
      }
    }

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].detail || errorData.errors[0].title || errorMessage;
        }
      } catch {
        // If we can't parse the error response, use the default message
      }
      
      throw new Error(errorMessage);
    }

    // Handle empty responses (like DELETE requests)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    return response.json();
  }
}

export const apiService = new ApiService();