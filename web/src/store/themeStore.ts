import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark',
            toggleTheme: () => set((state) => {
                const newTheme = state.theme === 'light' ? 'dark' : 'light';
                // Apply class to html element
                if (newTheme === 'light') {
                    document.documentElement.classList.add('light');
                } else {
                    document.documentElement.classList.remove('light');
                }
                return { theme: newTheme };
            }),
        }),
        {
            name: 'priotti-theme',
            onRehydrateStorage: () => (state) => {
                // Apply theme on load
                if (state) {
                    if (state.theme === 'light') {
                        document.documentElement.classList.add('light');
                    } else {
                        document.documentElement.classList.remove('light');
                    }
                }
            }
        }
    )
);
