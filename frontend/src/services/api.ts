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
