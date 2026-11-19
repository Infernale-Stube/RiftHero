import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rift: {
          950: '#060a12',
          900: '#0a101d',
          850: '#0e1729',
          800: '#131e36',
          700: '#1b2a4a',
          600: '#263b66',
        },
        hextech: {
          gold: '#c8aa6e',
          lightGold: '#f0e6d2',
          blue: '#0acbe6',
          darkBlue: '#0397ab',
        },
        lol: {
          win: '#1d4ed8',
          winBg: 'rgba(29, 78, 216, 0.12)',
          winBorder: '#2563eb',
          loss: '#dc2626',
          lossBg: 'rgba(220, 38, 38, 0.12)',
          lossBorder: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};

export default config;
