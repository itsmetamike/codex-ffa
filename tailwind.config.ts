import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Override slate with pure black/neutral grays
        slate: {
          50: '#fafafa',
          100: '#ffffff',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Override gray with pure black/neutral grays (same as slate)
        gray: {
          50: '#fafafa',
          100: '#ffffff',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Override blue with gold
        blue: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#EDCF98',
          600: '#EDCF98',
          700: '#EDCF98',
          800: '#EDCF98',
          900: '#EDCF98',
          950: '#713f12',
        },
        // Add gold as a custom color
        gold: '#EDCF98',
        // Override black to ensure it's pure black
        black: '#000000',
        // Override white to ensure it's pure white
        white: '#ffffff',
      }
    }
  },
  plugins: []
};

export default config;
