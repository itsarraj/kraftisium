/** Kraftisium product identity — keep in sync with app/constants/appIdentity.ts */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Kraftisium';
export const APP_TAGLINE = 'AI-powered job search';
/** Raw mark (transparent, 179×290) — header, footer, inline UI */
export const BRAND_MARK_PATH = '/brand-mark.svg';
/** Centered mark on square canvas (500×500) — app icons, press kit, favicons */
export const LOGO_PATH = '/logo.svg';
/** width / height of brand-mark.svg viewBox */
export const BRAND_MARK_ASPECT = 179 / 290;

/** Keep in sync with app/constants/brand.ts — chip 4 / control 8 / card 12 / panel 16 / sheet 24 */
export const brandColors = {
  bg: '#2b2b2b',
  surface: '#1a1a1a',
  surface2: '#333333',
  accent: '#fcc636',
  accentHover: '#e6b535',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  danger: '#f87171',
  success: '#4ade80',
} as const;
