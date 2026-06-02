import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // send cookies
  headers: { 'Content-Type': 'application/json' },
});

// Global response interceptor — on 401 redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      // Clear any local auth state and redirect
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
