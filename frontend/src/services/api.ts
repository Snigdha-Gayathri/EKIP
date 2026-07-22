import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
    }
    return Promise.reject(error);
  }
);
