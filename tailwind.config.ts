import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // TavernKeep custom colors from DESIGN.md
        'surface': '#111316',
        'surface-dim': '#111316',
        'surface-bright': '#37393d',
        'surface-container-lowest': '#0c0e11',
        'surface-container-low': '#1a1c1f',
        'surface-container': '#1e2023',
        'surface-container-high': '#282a2d',
        'surface-container-highest': '#333538',
        'surface-variant': '#333538',
        'on-surface': '#e2e2e6',
        'on-surface-variant': '#d0c5af',
        'gold': '#ffc637',
        'gold-light': '#ffdf9e',
        'gold-dim': '#fabd00',
        'gold-container': '#e2aa00',
        'on-gold': '#3f2e00',
        'ember': '#e2aa00',
        'parchment': '#d0c5af',
        'ink': '#2c1810',
        'shadow': '#0c0e11',
        'outline': '#99907c',
        'outline-variant': '#4d4635',
        'error': '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        // Rarity colors
        'rarity-common': '#6b7280',
        'rarity-uncommon': '#10b981',
        'rarity-rare': '#3b82f6',
        'rarity-very-rare': '#8b5cf6',
        'rarity-legendary': '#f59e0b',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'display': ['var(--font-noto-serif)', 'serif'],
        'body': ['var(--font-manrope)', 'sans-serif'],
        'mono': ['var(--font-courier-prime)', 'monospace'],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "slideUp": {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scaleIn": {
          from: {
            opacity: "0",
            transform: "scale(0.8)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 1.5s infinite",
        "slideUp": "slideUp 300ms ease-out",
        "scaleIn": "scaleIn 300ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
