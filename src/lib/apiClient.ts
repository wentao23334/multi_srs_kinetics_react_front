import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally: Hook into UI Zustand store here to automatically show Toasts on API errors
    return Promise.reject(error);
  }
);
