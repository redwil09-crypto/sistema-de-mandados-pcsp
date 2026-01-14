export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#137fec",
                "primary-dark": "#0f65bd",
                "background-light": "#ced4da",
                "background-dark": "#1c1c1c",
                "text-light": "#000000",
                "text-dark": "#e5e5e5",
                "text-secondary-light": "#1f2937",
                "text-secondary-dark": "#a3a3a3",
                "surface-light": "#ffffff",
                "surface-dark": "#2d2d2d",
                "border-light": "#adb5bd",
                "border-dark": "#404040",
                "status-open": "#D32F2F",
                "status-completed": "#388E3C",
                "status-cancelled": "#FFA000"
            },
            fontFamily: {
                "display": ["Public Sans", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            boxShadow: {
                'neon-blue': '0 0 5px theme("colors.primary"), 0 0 20px theme("colors.primary")',
            }
        },
    },
    plugins: [],
}
