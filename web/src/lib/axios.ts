import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to inject the JWT
let lastRefreshTime = 0;
const REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

api.interceptors.request.use(
    async (config) => {
        const { token, updateToken } = useAuthStore.getState();
        
        // Sliding session logic: refresh token if it's more than 2h old and user is active
        const now = Date.now();
        if (token && !config.url?.includes('/auth/refresh') && (now - lastRefreshTime > REFRESH_THRESHOLD)) {
            // update lastRefreshTime immediately to prevent concurrent refresh calls
            lastRefreshTime = now;
            
            // Background refresh
            api.get('/auth/refresh')
                .then(res => {
                    if (res.data.token) {
                        updateToken(res.data.token);
                    }
                })
                .catch(err => {
                    console.error('Failed to refresh token', err);
                });
        }

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle global errors (like 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Force logout on unauthorized access
            useAuthStore.getState().logout();
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
