import axios from 'axios';

// Production API URL - hardcoded for reliability
const API_URL = 'https://api.corehr.africa';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';

      // Don't redirect on login endpoints - let the login page handle the error
      if (requestUrl.includes('/auth/login')) {
        return Promise.reject(error);
      }

      // For superadmin routes, redirect to superadmin login
      if (requestUrl.includes('/superadmin/') || window.location.pathname.startsWith('/superadmin')) {
        localStorage.removeItem('superadmin_token');
        localStorage.removeItem('superadmin');
        window.location.href = '/superadmin/login';
      } else {
        // Regular user routes - redirect to regular login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
