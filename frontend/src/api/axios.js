import axios from 'axios';

// In dev, Vite proxies /api. In prod (Render), the frontend is a separate
// origin, so point at the backend via VITE_API_URL.
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

// NOTE: do NOT set a global 'Content-Type' here. axios auto-picks the right one
// per request — application/json for object bodies, multipart/form-data (with the
// required boundary) for FormData uploads. Forcing json broke file uploads
// ("The submitted data was not a file").
const api = axios.create({
  baseURL: API_BASE,
});

const isGet = (config) => (config?.method || 'get').toLowerCase() === 'get';

// Retry a GET once with no auth header. Public endpoints (course list/detail,
// search) then load even with a dead session; protected ones just 401 again
// and reject, so this is always safe.
const retryWithoutToken = (config) => {
  config._retry = true;
  if (config.headers) delete config.headers.Authorization;
  return api(config);
};

// Request interceptor — attach access token when we have one
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (tokens.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    // For file uploads (FormData), drop the default JSON Content-Type so the
    // browser sets multipart/form-data with the correct boundary — otherwise
    // the file arrives as a string and DRF rejects it ("was not a file").
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — refresh on 401, degrade gracefully on failure
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');

      if (tokens.refresh) {
        try {
          const res = await axios.post(`${API_BASE}/users/token/refresh/`, {
            refresh: tokens.refresh,
          });
          const newTokens = {
            access: res.data.access,
            refresh: res.data.refresh || tokens.refresh,
          };
          localStorage.setItem('tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed — clear the dead session but don't hard-redirect.
          // ProtectedRoute sends the user to /login for protected pages;
          // public GETs are retried below so they keep rendering.
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
          if (isGet(originalRequest)) return retryWithoutToken(originalRequest);
          return Promise.reject(refreshError);
        }
      }

      // No refresh token but a token was (maybe) attached — retry public GETs bare.
      if (isGet(originalRequest)) return retryWithoutToken(originalRequest);
    }
    return Promise.reject(error);
  }
);

export default api;
