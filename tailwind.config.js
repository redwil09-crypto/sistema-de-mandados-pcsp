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
                "surface-dark": "#27272a", // Zinc 800
                "surface-dark-elevated": "#3f3f46", // Zinc 700
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
                'gradient-radial-tactic': 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "2xl": "1.5rem",
                "full": "9999px"
            },
            boxShadow: {
                'neon-blue': '0 1px 3px rgba(59, 130, 246, 0.15), 0 1px 2px rgba(59, 130, 246, 0.1)',
                'neon-blue-card': '0 2px 8px rgba(59, 130, 246, 0.12)',
                'neon-blue-tactic': '0 1px 4px rgba(59, 130, 246, 0.1)',
                'neon-purple': '0 1px 3px rgba(168, 85, 247, 0.15)',
                'neon-purple-tactic': '0 1px 4px rgba(168, 85, 247, 0.1)',
                'neon-orange': '0 1px 3px rgba(249, 115, 22, 0.15)',
                'neon-orange-card': '0 2px 8px rgba(249, 115, 22, 0.12)',
                'neon-green': '0 1px 3px rgba(34, 197, 94, 0.15)',
                'neon-green-card': '0 2px 8px rgba(34, 197, 94, 0.12)',
                'neon-red': '0 1px 3px rgba(239, 68, 68, 0.15)',
                'neon-yellow': '0 1px 3px rgba(234, 179, 8, 0.15)',
                'neon-yellow-card': '0 2px 8px rgba(234, 179, 8, 0.12)',
                'neon-cyan': '0 1px 3px rgba(6, 182, 212, 0.15)',
                'neon-cyan-card': '0 2px 8px rgba(6, 182, 212, 0.12)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
                'tactic': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [
        tailwindAnimate,
    ],
}
