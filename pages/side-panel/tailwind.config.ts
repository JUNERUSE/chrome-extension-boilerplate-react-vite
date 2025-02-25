import baseConfig from '@extension/tailwindcss-config';
import { heroui } from '@heroui/theme';
import type { Config } from 'tailwindcss';

export default {
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  plugins: [heroui()],
} as Config;
