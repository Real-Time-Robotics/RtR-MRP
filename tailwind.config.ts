import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	// Add custom xs breakpoint for mobile
  	screens: {
  		'xs': '480px',
  		'sm': '640px',
  		'md': '768px',
  		'lg': '1024px',
  		'xl': '1280px',
  		'2xl': '1536px',
  	},
  	extend: {
  		colors: {
  			// Shadcn UI Variables (preserved)
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				50: '#f0fdf4',
  				100: '#dcfce7',
  				200: '#bbf7d0',
  				300: '#86efac',
  				400: '#3ecf8e',
  				500: '#30a46c',
  				600: '#249163',
  				700: '#1a7f4f',
  				800: '#166534',
  				900: '#14532d',
  				950: '#052e16',
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',

  			// Chart colors (extended)
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				'6': 'hsl(var(--chart-6))',
  				blue: '#30a46c',
  				green: '#10B981',
  				yellow: '#F59E0B',
  				red: '#EF4444',
  				purple: '#8B5CF6',
  				cyan: '#06B6D4',
  				pink: '#EC4899',
  				teal: '#14B8A6',
  				orange: '#F97316',
  				indigo: '#6366F1',
  			},

  			// Excel-like UI System Colors
  			excel: {
  				primary: 'var(--excel-primary)',
  				'primary-hover': 'var(--excel-primary-hover)',
  				'primary-dark': 'var(--excel-primary-dark)',
  				'primary-light': 'var(--excel-primary-light)',
  				'primary-lighter': 'var(--excel-primary-lighter)',
  				'header-bg': 'var(--excel-header-bg)',
  				'row-number-bg': 'var(--excel-row-number-bg)',
  				'cell-bg': 'var(--excel-cell-bg)',
  				border: 'var(--excel-border)',
  				'border-light': 'var(--excel-border-light)',
  				selection: 'var(--excel-selection)',
  				'selection-border': 'var(--excel-selection-border)',
  				'header-text': 'var(--excel-header-text)',
  				'cell-text': 'var(--excel-cell-text)',
  				'row-number-text': 'var(--excel-row-number-text)',
  				// Static colors (for when CSS vars don't work)
  				green: '#217346',
  				'green-light': '#E2EFDA',
  				'green-dark': '#70AD47',
  			},

  			// Industrial Precision Design System
  			steel: {
  				dark: '#1A1D23',
  				DEFAULT: '#1A1D23',
  			},
  			gunmetal: {
  				DEFAULT: '#2D3139',
  				light: '#363B44',
  			},
  			industrial: {
  				slate: '#3D4450',
  				'slate-light': '#4A5568',
  			},
  			production: {
  				green: '#22C55E',
  				'green-dim': 'rgba(34, 197, 94, 0.2)',
  			},
  			alert: {
  				amber: '#F59E0B',
  				'amber-dim': 'rgba(245, 158, 11, 0.2)',
  			},
  			urgent: {
  				red: '#EF4444',
  				'red-dim': 'rgba(239, 68, 68, 0.2)',
  			},
  			'info-cyan': {
  				DEFAULT: '#249163',
  				dim: 'rgba(36, 145, 99, 0.25)',
  			},
  			mrp: {
  				'text-primary': '#F4F4F5',
  				'text-secondary': '#A1A1AA',
  				'text-muted': '#71717A',
  				'text-disabled': '#52525B',
  				'border': '#3D4450',
  				'border-light': '#52525B',
  				'border-focus': '#249163',
  			},

  			// Semantic colors (extended)
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))',
  				50: '#ECFDF5',
  				100: '#D1FAE5',
  				200: '#A7F3D0',
  				300: '#6EE7B7',
  				400: '#34D399',
  				500: '#10B981',
  				600: '#059669',
  				700: '#047857',
  				800: '#065F46',
  				900: '#064E3B',
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))',
  				50: '#FFFBEB',
  				100: '#FEF3C7',
  				200: '#FDE68A',
  				300: '#FCD34D',
  				400: '#FBBF24',
  				500: '#F59E0B',
  				600: '#D97706',
  				700: '#B45309',
  				800: '#92400E',
  				900: '#78350F',
  			},
  			danger: {
  				50: '#FEF2F2',
  				100: '#FEE2E2',
  				200: '#FECACA',
  				300: '#FCA5A5',
  				400: '#F87171',
  				500: '#EF4444',
  				600: '#DC2626',
  				700: '#B91C1C',
  				800: '#991B1B',
  				900: '#7F1D1D',
  			},
  			info: {
  				50: '#EFF6FF',
  				100: '#DBEAFE',
  				200: '#BFDBFE',
  				300: '#93C5FD',
  				400: '#60A5FA',
  				500: '#3B82F6',
  				600: '#2563EB',
  				700: '#1D4ED8',
  				800: '#1E40AF',
  				900: '#1E3A8A',
  			},

  			// Navy (Sidebar/Headers)
  			navy: {
  				50: '#F8FAFC',
  				100: '#F1F5F9',
  				200: '#E2E8F0',
  				300: '#CBD5E1',
  				400: '#94A3B8',
  				500: '#64748B',
  				600: '#475569',
  				700: '#334155',
  				800: '#1E293B',
  				900: '#0F172A',
  				950: '#020617',
  			},
  		},

  		// Extended Typography (Industrial Precision)
  		fontFamily: {
  			sans: ['var(--font-be-vietnam-pro)', 'var(--font-ibm-plex-sans)', 'var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  			mono: ['var(--font-ibm-plex-mono)', 'var(--font-jetbrains-mono)', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
  			display: ['var(--font-jetbrains-mono)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
  		},
  		fontSize: {
  			'display-xl': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
  			'display-lg': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '700' }],
  			'heading-1': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '700' }],
  			'heading-2': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '700' }],
  			'heading-3': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0', fontWeight: '600' }],
  			'heading-4': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '600' }],
  			'body-lg': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '500' }],
  			'body': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '500' }],
  			'body-sm': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0', fontWeight: '500' }],
  			'caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: '600' }],
  			'overline': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.05em', fontWeight: '700' }],
  		},

  		// Extended Spacing
  		spacing: {
  			'4.5': '1.125rem',
  			'5.5': '1.375rem',
  			'6.5': '1.625rem',
  			'7.5': '1.875rem',
  			'13': '3.25rem',
  			'15': '3.75rem',
  			'17': '4.25rem',
  			'18': '4.5rem',
  			'19': '4.75rem',
  			'21': '5.25rem',
  			'22': '5.5rem',
  		},

  		// Extended Border Radius - Prismy Rounded
  		borderRadius: {
  			none: '0',
  			sm: '4px',
  			DEFAULT: '6px',
  			md: '8px',
  			lg: '12px',
  			xl: '16px',
  			'2xl': '20px',
  			'3xl': '24px',
  			full: '9999px',
  		},

  		// Extended Shadows
  		boxShadow: {
  			'xs': '0 1px 2px 0 rgb(0 0 0 / 0.08)',
  			'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.08)',
  			'card-hover': '0 10px 20px -3px rgb(0 0 0 / 0.15), 0 4px 8px -2px rgb(0 0 0 / 0.1)',
  			'primary': '0 4px 14px 0 rgb(48 164 108 / 0.4)',
  			'success': '0 4px 14px 0 rgb(5 150 105 / 0.4)',
  			'warning': '0 4px 14px 0 rgb(217 119 6 / 0.4)',
  			'danger': '0 4px 14px 0 rgb(220 38 38 / 0.4)',
  		},

  		// Z-Index Scale
  		zIndex: {
  			'dropdown': '1000',
  			'sticky': '1100',
  			'banner': '1200',
  			'overlay': '1300',
  			'modal': '1400',
  			'popover': '1500',
  			'toast': '1700',
  			'tooltip': '1800',
  			'command': '1900',
  		},

  		// Extended Transitions
  		transitionDuration: {
  			'fast': '100ms',
  			'normal': '200ms',
  			'slow': '300ms',
  			'slower': '500ms',
  		},
  		transitionTimingFunction: {
  			'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  			'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  			'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  			'snappy': 'cubic-bezier(0.2, 0, 0, 1)',
  		},

  		// Extended Animations
  		animation: {
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-out': 'fade-out 0.2s ease-out',
  			'fade-in-up': 'fade-in-up 0.3s ease-out',
  			'fade-in-down': 'fade-in-down 0.3s ease-out',
  			'fade-in-left': 'fade-in-left 0.3s ease-out',
  			'fade-in-right': 'fade-in-right 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'scale-out': 'scale-out 0.2s ease-out',
  			'scale-in-bounce': 'scale-in-bounce 0.5s ease-out',
  			'slide-in-top': 'slide-in-top 0.3s ease-out',
  			'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
  			'slide-in-left': 'slide-in-left 0.3s ease-out',
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  			'ripple': 'ripple 0.6s linear',
  			'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
  			'pulse-scale': 'pulse-scale 2s ease-in-out infinite',
  			'shake': 'shake 0.5s ease-in-out',
  			'bounce-subtle': 'bounce-subtle 1s infinite',
  			'spin-slow': 'spin-slow 3s linear infinite',
  			'wiggle': 'wiggle 1s ease-in-out infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'glow': 'glow 2s ease-in-out infinite',
  			'shimmer': 'shimmer 1.5s ease-in-out infinite',
  			'progress-stripe': 'progress-stripe 1s linear infinite',
  			'page-enter': 'fade-in-up 0.3s ease-out',
  			'page-exit': 'fade-out 0.2s ease-out',
  			'modal-enter': 'scale-in 0.2s ease-out',
  			'modal-exit': 'scale-out 0.15s ease-out',
  			'backdrop-enter': 'fade-in 0.2s ease-out',
  			'backdrop-exit': 'fade-out 0.15s ease-out',
  			'dropdown-enter': 'fade-in-down 0.15s ease-out',
  			'dropdown-exit': 'fade-out 0.1s ease-out',
  			'toast-enter': 'slide-in-right 0.3s ease-out',
  			'toast-exit': 'fade-in-right 0.2s ease-out reverse',
  			'sidebar-enter': 'slide-in-left 0.3s ease-out',
  			'sidebar-exit': 'slide-in-left 0.2s ease-out reverse',
  		},
  		keyframes: {
  			'fade-in': {
  				from: { opacity: '0' },
  				to: { opacity: '1' },
  			},
  			'fade-out': {
  				from: { opacity: '1' },
  				to: { opacity: '0' },
  			},
  			'fade-in-up': {
  				from: { opacity: '0', transform: 'translateY(20px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'fade-in-down': {
  				from: { opacity: '0', transform: 'translateY(-20px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'fade-in-left': {
  				from: { opacity: '0', transform: 'translateX(20px)' },
  				to: { opacity: '1', transform: 'translateX(0)' },
  			},
  			'fade-in-right': {
  				from: { opacity: '0', transform: 'translateX(-20px)' },
  				to: { opacity: '1', transform: 'translateX(0)' },
  			},
  			'scale-in': {
  				from: { opacity: '0', transform: 'scale(0.95)' },
  				to: { opacity: '1', transform: 'scale(1)' },
  			},
  			'scale-out': {
  				from: { opacity: '1', transform: 'scale(1)' },
  				to: { opacity: '0', transform: 'scale(0.95)' },
  			},
  			'scale-in-bounce': {
  				'0%': { opacity: '0', transform: 'scale(0.3)' },
  				'50%': { transform: 'scale(1.05)' },
  				'70%': { transform: 'scale(0.9)' },
  				'100%': { opacity: '1', transform: 'scale(1)' },
  			},
  			'slide-in-top': {
  				from: { opacity: '0', transform: 'translateY(-100%)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'slide-in-bottom': {
  				from: { opacity: '0', transform: 'translateY(100%)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'slide-in-left': {
  				from: { opacity: '0', transform: 'translateX(-100%)' },
  				to: { opacity: '1', transform: 'translateX(0)' },
  			},
  			'slide-in-right': {
  				from: { opacity: '0', transform: 'translateX(100%)' },
  				to: { opacity: '1', transform: 'translateX(0)' },
  			},
  			'ripple': {
  				from: { transform: 'scale(0)', opacity: '1' },
  				to: { transform: 'scale(4)', opacity: '0' },
  			},
  			'pulse-soft': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' },
  			},
  			'pulse-scale': {
  				'0%, 100%': { transform: 'scale(1)' },
  				'50%': { transform: 'scale(1.05)' },
  			},
  			'shake': {
  				'0%, 100%': { transform: 'translateX(0)' },
  				'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
  				'20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  			},
  			'bounce-subtle': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-5px)' },
  			},
  			'spin-slow': {
  				from: { transform: 'rotate(0deg)' },
  				to: { transform: 'rotate(360deg)' },
  			},
  			'wiggle': {
  				'0%, 100%': { transform: 'rotate(0deg)' },
  				'25%': { transform: 'rotate(-5deg)' },
  				'75%': { transform: 'rotate(5deg)' },
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-10px)' },
  			},
  			'glow': {
  				'0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
  				'50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' },
  			},
  			'progress-stripe': {
  				'0%': { backgroundPosition: '1rem 0' },
  				'100%': { backgroundPosition: '0 0' },
  			},
  		},

  		// Layout
  		width: {
  			'sidebar': '220px',
  			'sidebar-collapsed': '48px',
  		},
  		height: {
  			'topbar': '48px',
  		},
  		maxWidth: {
  			'content': '1440px',
  			'8xl': '88rem',
  			'9xl': '96rem',
  		},
  		minHeight: {
  			'screen-content': 'calc(100vh - 48px)',
  		},

  		// Safe area insets for mobile devices (notch, home indicator)
  		padding: {
  			'safe': 'env(safe-area-inset-bottom)',
  			'safe-top': 'env(safe-area-inset-top)',
  			'safe-bottom': 'env(safe-area-inset-bottom)',
  			'safe-left': 'env(safe-area-inset-left)',
  			'safe-right': 'env(safe-area-inset-right)',
  		},
  		margin: {
  			'safe': 'env(safe-area-inset-bottom)',
  			'safe-top': 'env(safe-area-inset-top)',
  			'safe-bottom': 'env(safe-area-inset-bottom)',
  			'safe-left': 'env(safe-area-inset-left)',
  			'safe-right': 'env(safe-area-inset-right)',
  		},
  		inset: {
  			'safe-top': 'env(safe-area-inset-top)',
  			'safe-bottom': 'env(safe-area-inset-bottom)',
  			'safe-left': 'env(safe-area-inset-left)',
  			'safe-right': 'env(safe-area-inset-right)',
  		},

  		// Backgrounds
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
  			'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
