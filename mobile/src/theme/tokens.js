export const COLORS = {
  // ── Brand Primary: Corporate Blue & Dark Palette ─────────────────
  primary: '#1268D9',        // Primary Blue Accent
  primaryDark: '#082B52',    // Dark Blue
  primaryDeep: '#061225',    // Deep Navy
  primaryMedium: '#1268D9',  // Medium Vibrant Blue
  primaryLight: '#2F8BFF',   // Bright Blue
  primarySoft: '#1597E5',    // Logo Light Blue
  primaryPale: '#D3E7FA',    // Tinted highlight fill
  primaryGhost: '#EBF4FC',   // Light background tint

  // ── Hero Gradient ──────────────────────────────────────────────
  heroGradient: ['#082B52', '#1268D9', '#2F8BFF'],
  heroDarkGradient: ['#061225', '#082B52', '#1268D9'],

  // ── Dark Slate / Navy Tokens ───────────────────────────────────
  mainDark: '#071A2F',       // Main Dark
  deepNavy: '#061225',       // Deep Navy
  darkNavy: '#071A2F',       // Dark Navy
  charcoalNavy: '#101827',   // Charcoal Navy
  sidebarDark: '#050F1F',    // Sidebar Dark
  cardDark: '#0D1B2E',       // Card Dark
  borderDark: '#1C3554',     // Border Dark
  slateHeader: '#1E293B',    // Navy slate dark surface
  slateBorder: '#1C3554',    // Dark surface border
  slateMuted: '#94A3B8',     // Secondary text on slate bg

  // ── Neutral Surfaces & Cards ──────────────────────────────────
  background: '#F4F7FB',     // Clean slate neutral app background
  backgroundCool: '#EBF4FC', // Subtle card container background
  white: '#ffffff',
  whiteText: '#F8FAFC',      // White Text
  card: '#ffffff',
  border: '#E2E8F0',         // Subtle card divider

  // ── Text Color Tokens ──────────────────────────────────────────
  text: {
    dark: '#071A2F',         // Main dark headings
    primary: '#101827',      // Charcoal navy body text
    muted: '#94A3B8',        // Muted text
    light: '#94A3B8',        // Disabled / placeholder text
    onDark: '#F8FAFC',       // White text on dark hero cards
    onPrimary: '#FFFFFF',    // Text on primary blue buttons
  },

  // ── Semantic Status Colors ───────────────────────────────────
  success: '#10B981',
  successBg: '#ECFDF5',
  info: '#2875BD',
  infoBg: '#EBF4FC',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',

  // ── Priority Colors ──────────────────────────────────────────
  priority: {
    high: {
      text: '#EF4444',
      bg: '#FEE2E2'
    },
    medium: {
      text: '#F59E0B',
      bg: '#FEF3C7'
    },
    low: {
      text: '#10B981',
      bg: '#ECFDF5'
    }
  },

  // ── Task / Project Status Colors ─────────────────────────────
  status: {
    backlog:      { text: '#64748B', bg: '#F1F5F9' },
    todo:         { text: '#475569', bg: '#E2E8F0' },
    planning:     { text: '#8B5CF6', bg: '#F5F3FF' },
    'in-progress':{ text: '#3B82F6', bg: '#EFF6FF' },
    review:       { text: '#8B5CF6', bg: '#F5F3FF' },
    testing:      { text: '#F97316', bg: '#FFEDD5' },
    completed:    { text: '#10B981', bg: '#ECFDF5' },
    blocked:      { text: '#EF4444', bg: '#FEE2E2' },
    'on-hold':    { text: '#94A3B8', bg: '#F1F5F9' },
    cancelled:    { text: '#64748B', bg: '#E2E8F0' }
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const SHADOWS = {
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  }
};

export const ROUNDING = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999
};

export const FONTS = {
  body: 'Rubik-Regular',
  bodyMedium: 'Rubik-Medium',
  bodySemiBold: 'Rubik-SemiBold',
  bodyBold: 'Rubik-Bold',
  bodyLight: 'Rubik-Light',
  display: 'Outfit-Regular',
  displayMedium: 'Outfit-Medium',
  displaySemiBold: 'Outfit-SemiBold',
  displayBold: 'Outfit-Bold',
};

