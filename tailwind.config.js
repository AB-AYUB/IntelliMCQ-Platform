/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#151C2C',
        surfaceHover: '#1E293B',
        primary: '#3B82F6',
        primaryHover: '#2563EB',
        accent: '#8B5CF6',
        textMain: '#F1F5F9',
        textMuted: '#94A3B8',
        border: '#334155',
        success: '#10B981',
        error: '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
