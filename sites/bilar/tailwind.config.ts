import type { Config } from 'tailwindcss'

// Design-tokens — se docs/sites/bilar-design-tokens.md
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:        '#2563EB',
          'blue-hover': '#1D4ED8',
          'blue-light': '#EFF6FF',
          'blue-border': '#BFDBFE',
        },
        bg: {
          page:   '#F7F8FA',
          card:   '#FFFFFF',
          subtle: '#F8FAFC',
        },
        text: {
          primary:   '#0F172A',
          secondary: '#64748B',
          hint:      '#94A3B8',
        },
        border: {
          standard: '#E2E8F0',
          subtle:   '#F1F5F9',
        },
        success: {
          DEFAULT: '#16A34A',
          light:   '#F0FDF4',
        },
        warning: {
          DEFAULT: '#D97706',
          light:   '#FEF9C3',
        },
        danger: '#EF4444',
        sidebar: '#0F172A',
      },
    },
  },
}

export default config
