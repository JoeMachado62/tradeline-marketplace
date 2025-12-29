import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api/portal' : 'http://localhost:3000/api/portal',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('client_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('client_token');
      // window.location.href = '/login'; // Don't redirect automatically, let component handle
    }
    return Promise.reject(error);
  }
);

export default api;
