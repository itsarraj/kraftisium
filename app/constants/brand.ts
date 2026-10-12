/** Kraftisium palette + radius scale (keep in sync with ui/src/constants/brand.ts).
 *  chip 4 / control 8 / card 12 / panel 16 / sheet 24
 *  Tailwind: rounded / rounded-lg / rounded-xl / rounded-2xl / rounded-3xl
 */
export const brand = {
  bg: '#2b2b2b',
  surface: '#1a1a1a',
  surface2: '#333333',
  accent: '#fcc636',
  accentHover: '#e6b535',
  border: 'rgba(255,255,255,0.1)',
  borderNested: 'rgba(255,255,255,0.05)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  danger: '#f87171',
  success: '#4ade80',
  radius: {
    chip: 4,
    control: 8,
    card: 12,
    panel: 16,
    sheet: 24,
  },
} as const;
