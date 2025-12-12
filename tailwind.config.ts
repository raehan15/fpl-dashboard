import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode palette
        dark: {
          900: '#0a0f1a',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        // Primary - Ocean Blue
        primary: {
          50: '#e6f4ff',
          100: '#bae3ff',
          200: '#7cc4fa',
          300: '#47a3f3',
          400: '#2186eb',
          500: '#0967d2',
          600: '#0552b5',
          700: '#03449e',
          800: '#01337d',
          900: '#002159',
        },
        // Accent - Teal/Cyan
        accent: {
          50: '#e6fffa',
          100: '#b2f5ea',
          200: '#81e6d9',
          300: '#4fd1c5',
          400: '#38b2ac',
          500: '#319795',
          600: '#2c7a7b',
          700: '#285e61',
          800: '#234e52',
          900: '#1d4044',
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-dark": "linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #1e293b 100%)",
        "gradient-light": "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdfa 100%)",
        "gradient-card-dark": "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
        "gradient-card-light": "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 249, 255, 0.8) 100%)",
        "gradient-accent": "linear-gradient(135deg, #0967d2 0%, #319795 100%)",
        "gradient-glow": "radial-gradient(circle at center, rgba(9, 103, 210, 0.15) 0%, transparent 70%)",
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(9, 103, 210, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(49, 151, 149, 0.5)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glow-blue': '0 0 40px rgba(9, 103, 210, 0.3)',
        'glow-teal': '0 0 40px rgba(49, 151, 149, 0.3)',
      },
      backdropBlur: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
};
export default config;
