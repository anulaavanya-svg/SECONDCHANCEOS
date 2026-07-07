/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D3557',
          dark: '#12233F',
          light: '#2A4A75',
        },
        accent: {
          DEFAULT: '#1E9E76',
          light: '#E6F5F0',
        },
        warn: {
          DEFAULT: '#C2703D',
          light: '#F9EFE7',
        },
        surface: '#FFFFFF',
        bg: '#F3F5F8',
        line: '#E1E4EA',
        ink: '#12172B',
        muted: '#6B7280',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 23, 43, 0.04), 0 1px 3px rgba(18, 23, 43, 0.06)',
        panel: '0 10px 40px rgba(18, 23, 43, 0.16)',
      },
    },
  },
  plugins: [],
}
