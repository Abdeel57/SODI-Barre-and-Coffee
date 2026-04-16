/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noir: '#0D0D0D',
        white: '#FFFFFF',
        'off-white': '#FAFAF8',
        nude: {
          DEFAULT: '#C9A882',
          light: '#F2EBE1',
          border: '#E8E0D6',
          dark: '#7A5C3A',
        },
        stone: '#9C9590',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
