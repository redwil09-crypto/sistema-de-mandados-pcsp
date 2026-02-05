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
                "secondary": "#06b6d4", // Cyan 500 - Более яркий (Vivid)
                "risk-high": "#f43f5e", // Rose 500 - Vivid
                "risk-med": "#f59e0b", // Amber 500
                "success": "#10b981", // Emerald 500
                "background-dark": "#020617",
                "surface-dark": "#0f172a",
                "surface-dark-elevated": "#1e293b",
                "border-dark": "#1e293b",
                "border-dark-highlight": "#334155",
                "background-light": "#e2e8f0", // Slate 200 - True 50% Mid Tone
                "surface-light": "#f1f5f9", // Slate 100 - Card Surface
                "border-light": "#cbd5e1", // Slate 300 - Visible borders
                "text-light": "#1e293b", // Slate 800 - Better readability on grey
                "text-dark": "#f8fafc", // Slate 50
                "text-secondary-light": "#475569", // Slate 600
                "text-secondary-dark": "#94a3b8", // Slate 400
                "text-muted": "#64748b", // Slate 500
            },
            fontFamily: {
                "sans": ["Manrope", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
                "display": ["Manrope", "sans-serif"],
                "tech": ["JetBrains Mono", "monospace"]
            },
            backgroundImage: {
                'grid-pattern': "url(\"data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%2306b6d4' fill-opacity='0.08' fill-rule='evenodd'/%3e%3c/svg%3e\")",
                'gradient-radial-tactic': 'radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
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
