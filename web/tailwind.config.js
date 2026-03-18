/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fffce6',
                    100: '#fff7cc',
                    200: '#fff099',
                    300: '#ffe666',
                    400: '#ffdb33',
                    500: '#FFB800', // Priotti Gold
                    600: '#e6a600',
                    700: '#cc9300',
                    800: '#b38100',
                    900: '#996e00',
                },
                surface: {
                    DEFAULT: '#19191E',
                    light: '#232328',
                    darker: '#111116',
                }
            }
        },
    },
    plugins: [],
}
