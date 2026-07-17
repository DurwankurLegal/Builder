import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: inject JWT and workspace headers dynamically
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const tenantId = useTenantStore.getState().activeTenantId;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: on an expired/invalid session (401), clear auth and
// send the user to the login screen instead of silently showing empty states.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || '';
    // Don't hijack the login call itself (a bad password is a normal 401 there)
    if (status === 401 && !url.includes('/auth/login')) {
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (isAuthenticated) {
        logout();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);
