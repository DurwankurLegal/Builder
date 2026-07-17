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
