import type { Config } from 'tailwindcss'

// Tailwind v4: design-tokens definieras i src/app/globals.css via @theme.
// Se docs/sites/bilar-design-tokens.md för fullständig spec.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
}

export default config
