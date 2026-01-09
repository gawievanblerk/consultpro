import axios from 'axios';

// API URL - uses environment variable in production, auto-detect for local development
const getApiUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Auto-detect: if running on localhost, use local backend
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:4020';
  }
  // Production fallback
  return 'https://api.corehr.africa';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const requestUrl = config.url || '';

  // Use superadmin token for superadmin routes
  if (requestUrl.includes('/superadmin/')) {
    const superadminToken = localStorage.getItem('superadmin_token');
    if (superadminToken) {
      config.headers.Authorization = `Bearer ${superadminToken}`;
    }
  } else {
    // Use regular token for other routes
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
