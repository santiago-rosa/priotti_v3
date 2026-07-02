import { create } from 'zustand';
import { useCartStore } from './cartStore';

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
    isInitializing: boolean;
    login: (user: User, role: 'client' | 'admin', token: string) => void;
    updateToken: (token: string) => void;
    logout: (clearLocalCart?: boolean) => void;
    initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    role: null,
    token: null,
    isInitializing: true,
    login: (user, role, token) => {
        localStorage.setItem('v3_token', token);
        localStorage.setItem('v3_user', JSON.stringify(user));
        localStorage.setItem('v3_role', role);

        // Sync cart owner on login and clear if switching users
        const cartStore = useCartStore.getState();
        if (cartStore.userId && cartStore.userId !== user.id) {
            cartStore.clearCart();
        }
        cartStore.setUserId(user.id);

        set({ user, role, token });
    },
    updateToken: (token) => {
        localStorage.setItem('v3_token', token);
        set({ token });
    },
    logout: (clearLocalCart = true) => {
        localStorage.removeItem('v3_token');
        localStorage.removeItem('v3_user');
        localStorage.removeItem('v3_role');
        if (clearLocalCart) {
            useCartStore.getState().clearCart();
        }
        set({ user: null, role: null, token: null });
    },
    initialize: () => {
        const token = localStorage.getItem('v3_token');
        const userStr = localStorage.getItem('v3_user');
        const role = localStorage.getItem('v3_role') as 'client' | 'admin' | null;

        if (token && userStr && role) {
            const parsedUser = JSON.parse(userStr);

            // Sync cart owner on initialization
            const cartStore = useCartStore.getState();
            if (cartStore.userId && cartStore.userId !== parsedUser.id) {
                cartStore.clearCart();
            }
            cartStore.setUserId(parsedUser.id);

            set({ token, user: parsedUser, role, isInitializing: false });
        } else {
            set({ isInitializing: false });
        }
    }
}));
