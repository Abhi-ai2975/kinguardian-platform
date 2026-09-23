import { COLORS } from './colors';

export const THEME = {
  colors: COLORS,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999
  },
  typography: {
    // iOS Native Typography Tokens
    headingLarge: 'text-3xl font-bold tracking-tight text-black',
    headingMedium: 'text-lg font-bold tracking-tight text-black',
    headingSmall: 'text-sm font-semibold text-neutral-900',
    bodyText: 'text-sm text-neutral-800 leading-relaxed',
    bodySubdued: 'text-xs text-neutral-500 leading-normal',
    telemetryVal: 'text-3xl font-bold text-black tracking-tight',

    // Parent Mode (Elderly-Friendly Native) Typography Tokens
    parentHeading: 'text-3xl font-extrabold tracking-tight text-black text-center',
    parentLabel: 'text-lg font-bold text-black',
    parentBody: 'text-base font-semibold text-neutral-700 leading-relaxed',
    parentButtonText: 'text-lg font-semibold tracking-wide text-white'
  },
  shadows: {
    light: 'shadow-sm shadow-neutral-200/50',
    medium: 'shadow shadow-neutral-200/70',
    premium: 'shadow-md shadow-neutral-300/30'
  }
};
