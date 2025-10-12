/** @type {import('tailwindcss').Config} */
module.exports = {
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
        // Goa Police Theme Colors (Legacy)
        'goa-saffron': '#FF9933',
        'goa-white': '#FFFFFF',
        'goa-green': '#138808',
        'police-blue': '#1E3A8A',
        'goa-navy': '#000080',
        // Light Forest Theme Colors
        'forest': {
          'bg-primary': '#0E2A1B',
          'bg-card': '#184C32',
          'bg-sidebar': '#153C27',
          'bg-quick-actions': '#E8F2E3',
          'accent-primary': '#00C46B',
          'accent-light': '#56E39F',
          'accent-hover': '#297F57',
          'text-primary': '#F2F8F4',
          'text-secondary': '#B8D1C0',
          'border': '#264C3B',
          'button-primary': '#1DD37C',
          'trend-up': '#3EE57A',
          'warning': '#FFB84C',
          'error': '#FF5E57',
          'heatmap-low': '#B6E7C8',
          'heatmap-mid': '#4AD991',
          'heatmap-high': '#007F4F',
          'sidebar-active': '#1E5C3C',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
