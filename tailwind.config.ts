import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sett: {
          primary: '#AAC737',
          'primary-hover': '#99B530',
          'primary-active': '#88A229',
          'primary-dark': '#667F00',
          sidebar: '#071C42',
          'sidebar-active': '#667F00',
          background: '#F8F9FB',
          card: '#FFFFFF',
          border: '#E6EAF0',
          fill: '#F7F7F7',
          'text-primary': '#1D1D1D',
          'text-secondary': '#4A4A4A',
          'text-accent': '#A3A3A3',
          'text-muted': '#767676',
          destructive: '#FB2C36',
          'destructive-hover': '#E0242D',
          success: '#22C55E',
          warning: '#F59E0B',
          pending: '#E5E7EB',
          draft: '#667F00',
          sent: '#F7FAEB',
          declined: '#FFEAEB',
          'light-green-bg': '#F7FAEB',
          olive: '#667F00',
          'trend-up': '#377F00',
          'trend-down': '#FB2C36',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
      },
      fontSize: {
        'heading-lg': ['28px', { lineHeight: '1.3' }],
        'heading-md': ['24px', { lineHeight: '1.35' }],
        'heading-sm': ['18px', { lineHeight: '1.4' }],
        body: ['14px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.5' }],
        label: ['12px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        card: '16px',
        button: '14px',
        input: '8px',
        badge: '10px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.06)',
        button: '0 2px 6px rgba(102, 127, 0, 0.25)',
        modal: '0 10px 40px rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        'sidebar': '260px',
        'header': '64px',
      },
    },
  },
  plugins: [],
};

export default config;
