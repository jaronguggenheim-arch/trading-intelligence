import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:        'rgb(var(--background) / <alpha-value>)',
        foreground:        'rgb(var(--foreground) / <alpha-value>)',
        card:              'rgb(var(--card) / <alpha-value>)',
        'card-border':     'rgb(var(--card-border))',
        'muted-foreground':'rgb(var(--muted) / <alpha-value>)',
        accent:            'rgb(var(--accent) / <alpha-value>)',
        'accent-foreground':'rgb(var(--foreground) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['DM Mono', 'Courier New', 'monospace'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
