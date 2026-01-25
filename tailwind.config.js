import tailwindAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#404040", // Neutral 700 - Solid Asphalt
                "primary-dark": "#262626", // Neutral 800
                "primary-light": "#737373", // Neutral 500
                "secondary": "#38bdf8", // Sky 400 - Clean high-vis contrast
                "risk-high": "#ef4444", // Red 500
                "risk-med": "#f59e0b", // Amber 500
                "success": "#10b981", // Emerald 500
                "background-dark": "#171717", // Neutral 900 - True Black/Gray
                "surface-dark": "#262626", // Neutral 800 - Deep Concrete
                "surface-dark-elevated": "#404040", // Neutral 700
                "border-dark": "#404040", // Neutral 700
                "border-dark-highlight": "#525252", // Neutral 600
                "background-light": "#f5f5f5", // Neutral 100 - Light Concrete
                "surface-light": "#ffffff",
                "border-light": "#d4d4d4", // Neutral 300
                "text-light": "#0a0a0a", // Neutral 950
                "text-dark": "#fafafa", // Neutral 50
                "text-secondary-light": "#525252", // Neutral 600
                "text-secondary-dark": "#a3a3a3", // Neutral 400
                "text-muted": "#737373", // Neutral 500
                fontFamily: {
                    "sans": ["Manrope", "sans-serif"],
                    "mono": ["JetBrains Mono", "monospace"],
                    "display": ["Manrope", "sans-serif"],
                    "tech": ["JetBrains Mono", "monospace"]
                },
                backgroundImage: {
                    'grid-pattern': "url(\"data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%236366f1' fill-opacity='0.03' fill-rule='evenodd'/%3e%3c/svg%3e\")",
                    'gradient-radial-tactic': 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
                },
                borderRadius: {
                    "DEFAULT": "0.5rem",
                    "lg": "0.75rem",
                    "xl": "1rem",
                    "2xl": "1.5rem",
                    "full": "9999px"
                },
                boxShadow: {
                    'neon-blue': '0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
                    'neon-red': '0 0 10px rgba(244, 63, 94, 0.5), 0 0 20px rgba(244, 63, 94, 0.3)',
                    'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    'tactic': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
                }
            },
        },
        plugins: [
            tailwindAnimate,
        ],
    }
