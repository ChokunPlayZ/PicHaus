/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./app/**/*.{vue,ts}",
        "./app/pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./app.vue",
        "./error.vue",
    ],
    theme: {
        extend: {
            colors: {
                'surface-1': 'var(--surface-1)',
                'surface-2': 'var(--surface-2)',
                'surface-3': 'var(--surface-3)',
                page: 'var(--bg-page)',
                separator: 'var(--separator)',
                'separator-strong': 'var(--separator-strong)',
                'text-1': 'var(--text-1)',
                'text-2': 'var(--text-2)',
                'text-3': 'var(--text-3)',
                accent: 'var(--accent)',
                'accent-hover': 'var(--accent-hover)',
                'accent-pressed': 'var(--accent-pressed)',
                'accent-light': 'var(--accent-light)',
                'accent-text': 'var(--accent-text)',
                error: 'var(--error)',
                success: 'var(--success)',
                warning: 'var(--warning)',
            },
            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                pill: 'var(--radius-pill)',
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
            },
        },
    },
    plugins: [],
}
