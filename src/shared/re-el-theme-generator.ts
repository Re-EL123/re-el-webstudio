// re-el-theme-generator.ts — Re-EL WebStudio Theme & Tailwind Config Generator

export interface ReELPalette {
  navy: string;
  gold: string;
  darkGold: string;
  deepNavy: string;
  slateBlue: string;
  white: string;
  lightGrey: string;
  charcoal: string;
  orange: string;
  teal: string;
  purple: string;
}

export const REEL_PALETTE: ReELPalette = {
  navy: '#06124A',
  gold: '#FFD700',
  darkGold: '#D4AF00',
  deepNavy: '#020A2B',
  slateBlue: '#1E3A8A',
  white: '#FFFFFF',
  lightGrey: '#E5E7EB',
  charcoal: '#374151',
  orange: '#FF8C00',
  teal: '#00B894',
  purple: '#6A0DAD',
};

export function generateTailwindConfig(palette: ReELPalette = REEL_PALETTE): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'reel-navy': '${palette.navy}',
        'reel-gold': '${palette.gold}',
        'reel-dark-gold': '${palette.darkGold}',
        'reel-deep-navy': '${palette.deepNavy}',
        'reel-slate-blue': '${palette.slateBlue}',
        'reel-charcoal': '${palette.charcoal}',
        'reel-orange': '${palette.orange}',
        'reel-teal': '${palette.teal}',
        'reel-purple': '${palette.purple}',
      },
    },
  },
  plugins: [],
};
`;
}

export function generateCSSVariables(palette: ReELPalette = REEL_PALETTE): string {
  return `:root {
  --reel-navy: ${palette.navy};
  --reel-gold: ${palette.gold};
  --reel-dark-gold: ${palette.darkGold};
  --reel-deep-navy: ${palette.deepNavy};
  --reel-slate-blue: ${palette.slateBlue};
  --reel-white: ${palette.white};
  --reel-light-grey: ${palette.lightGrey};
  --reel-charcoal: ${palette.charcoal};
  --reel-orange: ${palette.orange};
  --reel-teal: ${palette.teal};
  --reel-purple: ${palette.purple};
}
`;
}
