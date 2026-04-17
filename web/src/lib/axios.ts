import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to inject the JWT
let isRefreshing = false;

api.interceptors.request.use(
    async (config) => {
        const { token, updateToken } = useAuthStore.getState();
        
        // Sliding session logic: refresh token based on its actual expiration percentage
        if (token && !config.url?.includes('/auth/refresh') && !isRefreshing) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                
                const iat = payload.iat * 1000;
                const exp = payload.exp * 1000;
                const now = Date.now();
                
                // Refresh when 50% of token life has passed
                const refreshThresholdTime = iat + (exp - iat) * 0.5;
                
                if (now > refreshThresholdTime) {
                    isRefreshing = true;
                    api.get('/auth/refresh')
                        .then(res => {
                            if (res.data.token) {
                                updateToken(res.data.token);
                            }
                        })
                        .catch(err => {
                            console.error('Failed to refresh token', err);
                        })
                        .finally(() => {
                            isRefreshing = false;
                        });
                }
            } catch (e) {
                // Ignore decoding errors
            }
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
