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
          primary: '#6DBE22',
          'primary-hover': '#5da81c',
          'primary-active': '#4d9217',
          sidebar: '#1A2D46',
          'sidebar-active': '#6DBE22',
          background: '#F8F8F8',
          card: '#FFFFFF',
          border: '#E0E0E0',
          'text-primary': '#1A1A1A',
          'text-secondary': '#6B7280',
          'text-muted': '#9CA3AF',
          destructive: '#DC2626',
          'destructive-hover': '#B91C1C',
          success: '#22C55E',
          warning: '#F59E0B',
          pending: '#E5E7EB',
          draft: '#9CA3AF',
          sent: '#D1FAE5',
          declined: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
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
        button: '12px',
        input: '8px',
        badge: '6px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.06)',
        button: '0 2px 6px rgba(109, 190, 34, 0.25)',
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
