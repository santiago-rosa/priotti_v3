/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50:  '#fdf5e4',
                    100: '#fbe9c0',
                    200: '#f7d28a',
                    300: '#f3bb55',
                    400: '#F5B030',   /* lighter amber — hover states */
                    500: 'var(--primary)',
                    600: 'var(--primary-hover)',
                    700: '#96610A',
                    800: '#7A4E08',
                    900: '#5E3C06',
                },
                surface: {
                    DEFAULT: 'var(--surface)',
                    light: 'var(--surface-light)',
                    darker: 'var(--surface-darker)',
                },
                muted: 'var(--muted)',
                background: 'var(--background)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
            },
            borderColor: {
                DEFAULT: 'var(--border)',
            }
        },
    },
    plugins: [],
}
