/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          950: '#06040a',
          900: '#0d0a17',
          850: '#130f24',
          800: '#1b1531',
          750: '#231c3e',
          700: '#2f2652',
          600: '#433775',
        },
        brand: {
          pink: '#f43f5e',
          crimson: '#e11d48',
          purple: '#8b5cf6',
          violet: '#6366f1',
          amber: '#f59e0b',
        },
        seat: {
          available: '#10b981',
          selected: '#3b82f6',
          held: '#f59e0b',
          booked: '#ef4444',
          vip: '#a855f7',
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #9f1239 100%)',
        'hero-gradient': 'linear-gradient(to right, rgba(13, 10, 23, 0.95) 0%, rgba(13, 10, 23, 0.6) 50%, rgba(13, 10, 23, 0.9) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};
