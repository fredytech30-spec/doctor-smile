import type { ApiResponse, PaginatedResponse, Analysis, Document, Report, DashboardStats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const body = options.body;
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(
        data.message || 'An error occurred',
        response.status,
        data
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error or server unavailable');
  }
}

export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string) => {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    
    register: async (userData: any) => {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    
    logout: async () => {
      return request('/auth/logout', {
        method: 'POST',
      });
    },
    
    verifyEmail: async (token: string) => {
      return request('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },
    
    resetPassword: async (email: string) => {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    
    verifyOTP: async (email: string, otp: string) => {
      return request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
    },
  },
  
  // Analysis endpoints
  analyses: {
    getAll: async (page = 1, pageSize = 10) => {
      return request<PaginatedResponse<Analysis>>(`/analyses?page=${page}&page_size=${pageSize}`);
    },
    
    getById: async (id: string) => {
      return request<Analysis>(`/analyses/${id}`);
    },
    
    create: async (data: Partial<Analysis>) => {
      return request<Analysis>('/analyses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    update: async (id: string, data: Partial<Analysis>) => {
      return request<Analysis>(`/analyses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    
    delete: async (id: string) => {
      return request(`/analyses/${id}`, {
        method: 'DELETE',
      });
    },
    
    uploadDocument: async (analysisId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return request<Document>(`/analyses/${analysisId}/documents`, {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: formData,
      });
    },
  },
  
  // Dashboard endpoints
  dashboard: {
    getStats: async () => {
      return request<DashboardStats>('/dashboard/stats');
    },
    
    getRecentAnalyses: async (limit = 5) => {
      return request<Analysis[]>(`/dashboard/recent-analyses?limit=${limit}`);
    },
  },
  
  // Reports endpoints
  reports: {
    generate: async (analysisId: string, format: 'pdf' | 'excel') => {
      return request<Report>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ analysisId, format }),
      });
    },
    
    getById: async (id: string) => {
      return request<Report>(`/reports/${id}`);
    },
    
    download: async (id: string) => {
      const url = `${API_BASE_URL}/reports/${id}/download`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new ApiError('Failed to download report');
      }
      
      const blob = await response.blob();
      return blob;
    },
  },
  
  // Notifications endpoints
  notifications: {
    getAll: async () => {
      return request('/notifications');
    },
    
    markAsRead: async (id: string) => {
      return request(`/notifications/${id}/read`, {
        method: 'POST',
      });
    },
    
    markAllAsRead: async () => {
      return request('/notifications/read-all', {
        method: 'POST',
      });
    },
  },
};

export { ApiError };
