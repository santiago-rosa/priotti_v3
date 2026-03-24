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
                    50: '#fffce6',
                    100: '#fff7cc',
                    200: '#fff099',
                    300: '#ffe666',
                    400: '#ffdb33',
                    500: 'var(--primary)', // Dynamic Priotti Gold
                    600: 'var(--primary-hover)',
                    700: '#cc9300',
                    800: '#b38100',
                    900: '#996e00',
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
