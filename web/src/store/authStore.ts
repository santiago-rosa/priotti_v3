import { create } from 'zustand';

interface User {
    id: number;
    nombre: string;
    numero: string;
    coeficiente?: number;
}

interface AuthState {
    user: User | null;
    role: 'client' | 'admin' | null;
    token: string | null;
    login: (user: User, role: 'client' | 'admin', token: string) => void;
    logout: () => void;
    initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    role: null,
    token: null,
    login: (user, role, token) => {
        localStorage.setItem('v3_token', token);
        localStorage.setItem('v3_user', JSON.stringify(user));
        localStorage.setItem('v3_role', role);
        set({ user, role, token });
    },
    logout: () => {
        localStorage.removeItem('v3_token');
        localStorage.removeItem('v3_user');
        localStorage.removeItem('v3_role');
        set({ user: null, role: null, token: null });
    },
    initialize: () => {
        const token = localStorage.getItem('v3_token');
        const userStr = localStorage.getItem('v3_user');
        const role = localStorage.getItem('v3_role') as 'client' | 'admin' | null;

        if (token && userStr && role) {
            set({ token, user: JSON.parse(userStr), role });
        }
    }
}));
