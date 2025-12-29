import axios from 'axios';

// Get base URL from window location if in production or use default
const API_URL = import.meta.env.PROD 
  ? '/api' 
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('broker_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (!window.location.pathname.includes('/login')) {
         localStorage.removeItem('broker_token');
         window.location.href = '/broker-portal/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
