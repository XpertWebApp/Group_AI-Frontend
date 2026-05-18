import type { Config } from 'tailwindcss';

/*
 * ═══════════════════════════════════════════════════════════
 *  SETT Hub Brand Theme — based on Brand Guidelines v1.0
 *  Source: SETT-Hub-Brand-Guidelines-v2.pdf (March 2026)
 * ═══════════════════════════════════════════════════════════
 *
 *  Color Palette
 *  ─────────────
 *  SETT Green     #AAC737  — Primary accent: CTAs, highlights, headings, links, active states
 *  SETT Navy      #071c42  — Primary dark bg, header bars, hero sections, text on light bg
 *  SETT Grey      #686868  — Body text, secondary labels, borders, muted elements
 *  White          #FFFFFF  — Text on dark bg, page backgrounds (light theme)
 *  Green Dark     #7a9420  — Hover states, pressed states, depth accents
 *  Green Light    #c8e050  — Gradient highlights, decorative lines, subtle accents
 *  Black          #0a0a0a  — High-contrast banners, overlay text, footer backgrounds
 *
 *  Typography: Montserrat (Google Fonts)
 *  Fallback: Arial, Helvetica, sans-serif
 *
 *  Color Rules
 *  ─────────────
 *  Dark pages:       Navy bg (#071c42) + white text + green accents
 *  Light pages:      White bg + navy text + green accents
 *  CTAs/Buttons:     Always #AAC737 green with dark text (#071c42) or white text
 *  Forbidden colors: Never use purple, orange, or red (except error states)
 *
 *  CSS Variables:
 *  --sett-green: #AAC737; --sett-navy: #071c42; --sett-grey: #686868;
 *  --sett-white: #ffffff; --sett-black: #0a0a0a; --sett-green-dark: #7a9420;
 *  --sett-green-light: #c8e050;
 */

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Brand Colors ── */
      colors: {
        sett: {
          // Core brand palette (from guidelines §2)
          green: '#AAC737',
          navy: '#071c42',
          grey: '#686868',
          black: '#0a0a0a',
          'green-dark': '#7a9420',
          'green-light': '#c8e050',

          // Semantic aliases (mapped to brand palette)
          primary: '#AAC737',           // SETT Green — CTAs, highlights, active states
          'primary-hover': '#7a9420',   // Green Dark — hover/pressed states
          'primary-active': '#7a9420',  // Green Dark — active/pressed
          'primary-dark': '#667F00',    // Deep olive — sidebar active

          sidebar: '#071c42',           // SETT Navy — sidebar bg
          'sidebar-active': '#667F00',  // Deep olive — active nav item
          'sidebar-border': '#14284C',  // Slightly lighter navy — sidebar dividers

          background: '#F8F9FB',        // Light page background
          card: '#FFFFFF',              // Card/panel background
          border: '#E0E0E0',           // Card borders (guidelines §5.3)
          'border-light': '#E6EAF0',    // Lighter border variant
          fill: '#F8F9FA',             // Alternating table row bg (guidelines §5.2)

          // Text hierarchy
          'text-primary': '#071c42',    // SETT Navy — headings, primary text
          'text-secondary': '#686868',  // SETT Grey — body text, secondary labels
          'text-accent': '#A3A3A3',     // Light grey — muted/placeholder text
          'text-muted': '#686868',      // SETT Grey — muted elements

          // Status colors
          destructive: '#CC3333',       // Error red (guidelines §5.5)
          'destructive-hover': '#B02D2D',
          success: '#AAC737',           // Use brand green for success
          warning: '#F59E0B',

          // Status badge backgrounds
          pending: '#E5E7EB',
          draft: '#667F00',
          sent: '#F7FAEB',
          declined: '#FFEAEB',
          'light-green-bg': '#F5F9E8',  // Selected/active row bg (guidelines §5.2)

          olive: '#667F00',
          'trend-up': '#AAC737',        // Use brand green for positive trends
          'trend-down': '#CC3333',      // Use error red for negative trends

          // Table specific (guidelines §5.2)
          'table-header': '#071c42',    // Navy header bg
          'table-alt-row': '#F8F9FA',   // Alternating row bg
          'table-border': '#E0E0E0',    // Table borders
          'table-kpi': '#AAC737',       // KPIs and totals
        },
      },

      /* ── Typography (guidelines §3) ── */
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        montserrat: ['var(--font-montserrat)', 'Arial', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        // Page Title (H1): weight 800, 28–36px
        'heading-lg': ['32px', { lineHeight: '1.3', fontWeight: '800' }],
        // Section Title (H2): weight 800, 22–28px
        'heading-md': ['24px', { lineHeight: '1.35', fontWeight: '800' }],
        // Subsection (H3): weight 700, 18–22px
        'heading-sm': ['18px', { lineHeight: '1.4', fontWeight: '700' }],
        // Body Text: weight 400, 14–16px
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        // Subtitle / Light: weight 300, 14–18px
        subtitle: ['16px', { lineHeight: '1.5', fontWeight: '300', letterSpacing: '0.05em' }],
        // Caption / small text: 12px
        caption: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        // Labels / Tags: weight 600, 11–13px, UPPERCASE
        label: ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.1em' }],
        // CTA Button: weight 700, 14px, UPPERCASE
        'cta': ['14px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.08em' }],
        // Table Header: weight 600–700, 12–14px
        'table-head': ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        // Table Body: weight 400, 12–14px
        'table-body': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        // Footer / Legal: weight 400, 10–12px
        footer: ['11px', { lineHeight: '1.5', fontWeight: '400' }],
      },

      /* ── Border Radius (guidelines §5.3: cards 8px) ── */
      borderRadius: {
        card: '8px',
        button: '4px',       // CTA buttons (guidelines §5.1)
        input: '4px',        // Form inputs (guidelines §5.5)
        badge: '10px',
        panel: '14px',       // Larger panels
      },

      /* ── Shadows (guidelines §5.3: subtle shadow) ── */
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        button: '0 2px 6px rgba(102, 127, 0, 0.25)',
        modal: '0 10px 40px rgba(0, 0, 0, 0.12)',
        'input-focus': '0 0 0 3px rgba(170, 199, 55, 0.15)',  // Form input focus (guidelines §5.5)
      },

      /* ── Spacing ── */
      spacing: {
        sidebar: '250px',           // Expanded sidebar width (guidelines §5.4: 240–280px)
        'sidebar-collapsed': '72px', // Collapsed icon-rail width
        header: '68px',              // Header height
      },

      /* ── Motion tokens (reusable across pages) ──
       * Use these instead of magic cubic-bezier strings so timing stays
       * consistent across the product. */
      transitionTimingFunction: {
        'sett-out':    'cubic-bezier(0.22, 1, 0.36, 1)',     // smooth deceleration — default for one-way reveals
        'sett-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',     // symmetric — two-way state changes (sidebar width)
        'sett-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // gentle overshoot — delightful micro-moments
      },
      transitionDuration: {
        '180': '180ms',
        '280': '280ms',
        '320': '320ms',
        '420': '420ms',
      },
      keyframes: {
        'fade-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(-4px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'tooltip-in': {
          '0%':   { opacity: '0', transform: 'translateX(-6px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },
      animation: {
        'fade-in-right': 'fade-in-right 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'tooltip-in':    'tooltip-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
