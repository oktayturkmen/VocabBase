const tokens = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: tokens.colors.primary,
          foreground: tokens.colors.primaryForeground,
        },
        background: tokens.colors.background,
        foreground: tokens.colors.foreground,
        card: {
          DEFAULT: tokens.colors.card,
          foreground: tokens.colors.cardForeground,
        },
        muted: {
          DEFAULT: tokens.colors.muted,
          foreground: tokens.colors.mutedForeground,
        },
        border: tokens.colors.border,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        tabBar: tokens.colors.tabBar,
        'tab-bar-active': tokens.colors.tabBarActive,
        'tab-bar-inactive': tokens.colors.tabBarInactive,
        quizBackground: tokens.colors.quizBackground,
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
    },
  },
  plugins: [],
};
