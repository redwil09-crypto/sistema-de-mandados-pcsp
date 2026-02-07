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
                // Backgrounds
                "cyber-black": "#050505",   // Deepest black for main background
                "cyber-dark": "#0a0a0a",    // Slightly lighter for cards/sections
                "cyber-gray": "#18181b",    // Borders/secondary elements

                // Accents - High Saturation Neon
                "neon-red": "#ff2a2a",      // Warning / Critical / Action
                "neon-blue": "#2a62ff",     // Info / Primary Action
                "neon-cyan": "#00f0ff",     // Secondary / Data 
                "neon-purple": "#bd00ff",   // Special / Rare

                // Text
                "text-main": "#ededed",     // Primary text
                "text-muted": "#a1a1aa",    // Secondary text

                // Functional Overrides (backward compat if needed, or new logic)
                // Functional Overrides (backward compat/force dark)
                "background-dark": "#050505",
                "background-light": "#050505",
                "surface-dark": "#0a0a0a",
                "surface-light": "#0a0a0a",
                "surface-elevated": "#121212",
                "border-cyber": "#27272a",
                "border-light": "#27272a",
                "border-dark": "#27272a",
                "text-light": "#ededed",
                "text-dark": "#ededed",
                "text-secondary-light": "#a1a1aa",
                "text-secondary-dark": "#a1a1aa",
            },
            fontFamily: {
                "sans": ["Inter", "sans-serif"],
                "display": ["Rajdhani", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
            },
            backgroundImage: {
                'cyber-gradient': 'linear-gradient(to bottom, #050505, #0a0a0a)',
                'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                'red-glow-radial': 'radial-gradient(circle at center, rgba(255, 42, 42, 0.15) 0%, transparent 70%)',
                'blue-glow-radial': 'radial-gradient(circle at center, rgba(42, 98, 255, 0.15) 0%, transparent 70%)',
            },
            boxShadow: {
                'neon-red': '0 0 10px rgba(255, 42, 42, 0.5), 0 0 20px rgba(255, 42, 42, 0.3)',
                'neon-blue': '0 0 10px rgba(42, 98, 255, 0.5), 0 0 20px rgba(42, 98, 255, 0.3)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }
        },
    },
    plugins: [
        tailwindAnimate,
    ],
}
