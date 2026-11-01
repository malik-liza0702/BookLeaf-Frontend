/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 500 is the brand colour, rgb(241, 104, 118). Use 700 for text on
        // white or brand-50 backgrounds; 500 is too light for body copy.
        brand: {
          50: '#fef2f3',
          100: '#fde3e6',
          200: '#fbcbd0',
          300: '#f8a5ae',
          400: '#f4858f',
          500: '#f16876',
          600: '#d93f4f',
          700: '#b52d3d',
          800: '#962838',
          900: '#7c2431',
        },
      },
      keyframes: {
        'tick-disc': {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        // Opacity hides the dot a round linecap leaves on a zero-length dash.
        'tick-draw': {
          '0%': { strokeDashoffset: '1', opacity: '0' },
          '1%': { opacity: '1' },
          '100%': { strokeDashoffset: '0', opacity: '1' },
        },
        'tick-ripple': {
          '0%': { transform: 'scale(0.9)', opacity: '0.45' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        'rise-in': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'tick-disc': 'tick-disc 450ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
        'tick-draw': 'tick-draw 350ms ease-out 300ms both',
        'tick-ripple': 'tick-ripple 800ms ease-out 450ms both',
        'rise-in': 'rise-in 400ms ease-out 450ms both',
      },
    },
  },
  plugins: [],
};
