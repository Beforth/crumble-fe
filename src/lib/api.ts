import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Use /api proxy (see next.config.mjs rewrites) to avoid CORS; fallback to direct URL if needed
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return '/api'; // same-origin proxy in browser
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

/**
 * FastAPI routers that declare the collection route as `"/"` (not `""`) only match WITH a
 * trailing slash, e.g. GET /raw-materials/ vs /raw-materials → 404 or redirect issues with POST.
 * Routers using `""` (users, outlets) must stay without a trailing slash — do not add those here.
 */
const BACKEND_COLLECTION_PREFIXES = [
  '/raw-materials',
  '/products',
  '/tables',
  '/credit-clients',
  '/raw-material-sales',
  '/kots',
  '/transfers',
] as const;

function normalizeTrailingSlashForFastAPI(url: string): string {
  const [path, ...queryParts] = url.split('?');
  const query = queryParts.length > 0 ? queryParts.join('?') : '';
  for (const prefix of BACKEND_COLLECTION_PREFIXES) {
    if (path === prefix || path === `${prefix}/`) {
      return query ? `${prefix}/?${query}` : `${prefix}/`;
    }
  }
  return url;
}

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Match FastAPI collection paths (trailing slash) before other interceptors
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof config.url === 'string' && config.url.length > 0 && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizeTrailingSlashForFastAPI(config.url);
  }
  return config;
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Don't set Content-Type for FormData, let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token on 401
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
