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
                "primary": "#6366f1", // Electric Indigo
                "primary-dark": "#4338ca",
                "primary-light": "#818cf8",
                "secondary": "#06b6d4", // Neon Cyan for accents
                "risk-high": "#f43f5e", // Rose for alerts
                "risk-med": "#f59e0b", // Amber for warnings
                "success": "#10b981", // Emerald for success
                "background-dark": "#09090b", // Zinc 950 - Deep Cold Black
                "surface-dark": "#18181b", // Zinc 900
                "surface-dark-elevated": "#27272a", // Zinc 800
                "border-dark": "#27272a", // Zinc 800
                "border-dark-highlight": "#3f3f46", // Zinc 700
                "background-light": "#f8fafc", // Slate 50
                "surface-light": "#ffffff",
                "border-light": "#e2e8f0", // Slate 200
                "text-light": "#0f172a", // Slate 900
                "text-dark": "#f8fafc", // Slate 50
                "text-secondary-light": "#64748b", // Slate 500
                "text-secondary-dark": "#a1a1aa", // Zinc 400
                "text-muted": "#52525b", // Zinc 600 (Darker muted)
            },
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
