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
                "primary": "#3b82f6", // Blue 500 - Main Brand Color
                "primary-dark": "#000000", // Pure Black
                "primary-light": "#334155", // Slate 700
                "secondary": "#f97316", // Orange 500 - Secondary Brand Color
                "tactic-indigo": "#6366f1", // Indigo 500
                "neon-purple": "#a855f7", // Purple 500
                "risk-high": "#ef4444", // Red 500
                "risk-med": "#eab308", // Yellow 500
                "success": "#22c55e", // Green 500
                "warning": "#f97316", // Orange 500
                "info": "#3b82f6", // Blue 500

                // Dark Mode Palette - The New Standard
                "background-dark": "#000000",
                "surface-dark": "#09090b", // Zinc 950
                "surface-dark-elevated": "#18181b", // Zinc 900
                "border-dark": "#27272a", // Zinc 800
                "border-dark-highlight": "#3f3f46", // Zinc 700

                // Light Mode Palette (Unchanged)
                "background-light": "#d4d4d8", // Zinc 300
                "surface-light": "#ffffff", // White
                "border-light": "#cbd5e1", // Slate 300
                "text-light": "#0f172a", // Slate 900
                "text-dark": "#f8fafc", // Slate 50
                "text-secondary-light": "#475569", // Slate 600
                "text-secondary-dark": "#a1a1aa", // Zinc 400
                "text-muted": "#71717a", // Zinc 500
            },
            fontFamily: {
                "sans": ["Manrope", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
                "display": ["Manrope", "sans-serif"],
                "tech": ["JetBrains Mono", "monospace"]
            },
            backgroundImage: {
                'grid-pattern': "url(\"data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%233b82f6' fill-opacity='0.08' fill-rule='evenodd'/%3e%3c/svg%3e\")",
                'gradient-radial-tactic': 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.25) 0%, rgba(16, 185, 129, 0.1) 40%, transparent 80%)',
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "2xl": "1.5rem",
                "full": "9999px"
            },
            boxShadow: {
                'neon-blue': '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
                'neon-blue-card': '0 0 15px rgba(59, 130, 246, 0.3)',
                'neon-blue-tactic': '0 0 10px rgba(59, 130, 246, 0.4)',
                'neon-purple': '0 0 10px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)',
                'neon-purple-tactic': '0 0 10px rgba(168, 85, 247, 0.4)',
                'neon-orange': '0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3)',
                'neon-orange-card': '0 0 15px rgba(249, 115, 22, 0.3)',
                'neon-green': '0 0 10px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3)',
                'neon-green-card': '0 0 15px rgba(34, 197, 94, 0.3)',
                'neon-red': '0 0 10px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)',
                'neon-yellow': '0 0 10px rgba(234, 179, 8, 0.5), 0 0 20px rgba(234, 179, 8, 0.3)',
                'neon-yellow-card': '0 0 15px rgba(234, 179, 8, 0.3)',
                'neon-cyan': '0 0 10px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3)',
                'neon-cyan-card': '0 0 15px rgba(6, 182, 212, 0.3)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'tactic': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
            }
        },
    },
    plugins: [
        tailwindAnimate,
    ],
}
