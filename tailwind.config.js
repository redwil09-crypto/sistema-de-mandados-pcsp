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
                "primary": "#0f172a", // Slate 900
                "primary-dark": "#020617", // Slate 950
                "primary-light": "#334155", // Slate 700
                "secondary": "#22d3ee", // Cyan 400
                "tactic-indigo": "#6366f1", // Indigo 500
                "neon-purple": "#a855f7", // Purple 500 - NEON VIBE
                "risk-high": "#fb7185", // Rose 400
                "risk-med": "#fbbf24", // Amber 400
                "success": "#34d399", // Emerald 400
                "background-dark": "#020617",
                "surface-dark": "#0f172a",
                "surface-dark-elevated": "#1e293b",
                "border-dark": "#1e293b",
                "border-dark-highlight": "#334155",
                "background-light": "#475569", // Slate 600
                "surface-light": "#64748b", // Slate 500
                "border-light": "#94a3b8", // Slate 400
                "text-light": "#f8fafc", // Slate 50
                "text-dark": "#f8fafc", // Slate 50
                "text-secondary-light": "#cbd5e1", // Slate 300
                "text-secondary-dark": "#94a3b8", // Slate 400
                "text-muted": "#94a3b8", // Slate 400
            },
            fontFamily: {
                "sans": ["Manrope", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
                "display": ["Manrope", "sans-serif"],
                "tech": ["JetBrains Mono", "monospace"]
            },
            backgroundImage: {
                'grid-pattern': "url(\"data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%236366f1' fill-opacity='0.08' fill-rule='evenodd'/%3e%3c/svg%3e\")",
                'gradient-radial-tactic': 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25) 0%, rgba(34, 211, 238, 0.1) 40%, transparent 80%)',
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "2xl": "1.5rem",
                "full": "9999px"
            },
            boxShadow: {
                'neon-blue': '0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
                'neon-purple': '0 0 10px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)',
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
