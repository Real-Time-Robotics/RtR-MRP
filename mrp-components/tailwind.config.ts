import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontFamily: {
      display: ['JetBrains Mono', 'monospace'],
      body: ['IBM Plex Sans', 'sans-serif'],
      mono: ['IBM Plex Mono', 'monospace'],
    },
    fontSize: {
      'xs': ['11px', { lineHeight: '1.4' }],
      'sm': ['12px', { lineHeight: '1.4' }],
      'base': ['13px', { lineHeight: '1.5' }],
      'md': ['14px', { lineHeight: '1.5' }],
      'lg': ['16px', { lineHeight: '1.5' }],
      'xl': ['20px', { lineHeight: '1.3' }],
      '2xl': ['24px', { lineHeight: '1.2' }],
      '3xl': ['28px', { lineHeight: '1.2' }],
    },
    extend: {
      colors: {
        'steel': {
          dark: '#1A1D23',
          DEFAULT: '#1A1D23',
        },
        'gunmetal': {
          DEFAULT: '#2D3139',
          light: '#363B44',
        },
        'slate': {
          DEFAULT: '#3D4450',
          light: '#4A5568',
        },
        'production': {
          green: '#22C55E',
          'green-dim': 'rgba(34, 197, 94, 0.2)',
        },
        'alert': {
          amber: '#F59E0B',
          'amber-dim': 'rgba(245, 158, 11, 0.2)',
        },
        'urgent': {
          red: '#EF4444',
          'red-dim': 'rgba(239, 68, 68, 0.2)',
        },
        'info': {
          cyan: '#06B6D4',
          'cyan-dim': 'rgba(6, 182, 212, 0.2)',
        },
        'chart': {
          blue: '#3B82F6',
          emerald: '#10B981',
          violet: '#8B5CF6',
          orange: '#F97316',
        },
        'mrp-text': {
          primary: '#F4F4F5',
          secondary: '#A1A1AA',
          muted: '#71717A',
          disabled: '#52525B',
        },
        'mrp-border': {
          DEFAULT: '#3D4450',
          light: '#52525B',
          focus: '#06B6D4',
        },
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      height: {
        'header': '48px',
        'toolbar': '40px',
        'statusbar': '24px',
        'row': '36px',
        'input': '32px',
        'btn': '32px',
        'btn-sm': '28px',
      },
      width: {
        'sidebar': '56px',
        'sidebar-expanded': '200px',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        DEFAULT: '0',
      },
      boxShadow: {
        'none': 'none',
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.2)',
        'dropdown': '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
      transitionDuration: {
        'fast': '100ms',
        'base': '150ms',
        'slow': '300ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-alert': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'pulse-alert': 'pulse-alert 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
