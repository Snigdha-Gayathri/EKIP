import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Attach auth token if present
  const token = localStorage.getItem('ekip_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach API keys from localStorage for dynamic backend configuration
  const apiKeys = localStorage.getItem('ekip_api_keys');
  if (apiKeys && config.headers) {
    config.headers['X-API-Keys'] = apiKeys;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response || error.message === 'Network Error') {
      error.message = 'Unable to connect to the EKIP backend server (Network Error / CORS). Please ensure the backend service is running on port 8000.';
    } else if (error.response.status === 404) {
      const msg = 'Backend API endpoint not found (404). Please ensure the backend service is running on port 8000 and is up to date.';
      error.message = msg;
      if (error.response.data && typeof error.response.data === 'object') {
        error.response.data.detail = msg;
      }
    }
    return Promise.reject(error);
  }
);
