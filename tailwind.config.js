/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#1e1e2e',
          pane: '#181825',
          border: '#313244',
          text: '#cdd6f4',
          muted: '#6c7086',
          link: '#89b4fa',
          highlight: '#673ab7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
