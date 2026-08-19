export const COLORS = {
  // ── Nextact Brand Primary: Vibrant Electric Orange ─────────────
  primary: '#F97316',        // Electric Orange primary action / active state
  primaryDark: '#EA580C',    // Orange Dark: hover / pressed state
  primaryDeep: '#EA580C',    // Deepest Orange accent
  primaryMedium: '#FF6B00',  // Medium Vibrant Orange
  primaryLight: '#FF8C38',   // Light Accent Orange
  primarySoft: '#FDBA74',    // Soft border / highlight
  primaryPale: '#FFEDD5',    // Tinted highlight fill
  primaryGhost: '#FFF7ED',   // Light background tint

  // ── Nextact Dark Slate / Navy Hero Tokens ──────────────────────
  darkNavy: '#0F172A',       // Nextact dark hero card / header navy
  slateHeader: '#1E293B',    // Navy slate dark surface
  slateBorder: '#334155',    // Dark surface border
  slateMuted: '#64748B',     // Secondary text on slate bg

  // ── Neutral Surfaces & Cards ──────────────────────────────────
  background: '#F8FAFC',     // Clean slate neutral app background
  backgroundCool: '#F1F5F9', // Subtle card container background
  white: '#ffffff',
  card: '#ffffff',
  border: '#F1F5F9',         // Subtle card divider

  // ── Text Color Tokens ──────────────────────────────────────────
  text: {
    dark: '#0F172A',         // Slate dark headings
    primary: '#1E293B',      // Dark slate body text
    muted: '#64748B',        // Muted secondary caption text
    light: '#94A3B8',        // Disabled / placeholder text
    onDark: '#FFFFFF',       // Text on dark navy hero cards
    onPrimary: '#FFFFFF',    // Text on primary orange buttons
  },

  // ── Semantic Status Colors ───────────────────────────────────
  success: '#10B981',
  successBg: '#ECFDF5',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
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

