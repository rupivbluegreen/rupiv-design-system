// CSS rules for the design system: tokens only, logical properties only.
// Same rules as the consuming application, plus value rules the logical-css plugin does not cover.
// Not extending stylelint-config-standard on purpose: it adds stylistic warnings the source does not follow.
// CSS Modules are used throughout, so :global, :local and composes are allowed.

// One CSS value token: a run of non-space characters, or a function call with up to two levels of parentheses.
const T = String.raw`(?:[^\s()]|\((?:[^()]|\([^()]*\))*\))+`;

// margin, padding and inset written with four values (top right bottom left) are physical.
const FOUR_VALUES = new RegExp(`^${T}\\s+${T}\\s+${T}\\s+${T}$`);

// A box shadow is `none`, or a comma-separated list of shadow and focus-ring tokens.
const SHADOW_TOKEN = String.raw`var\(--(?:shadow|focus-ring)[\w-]*\)`;
const NOT_A_SHADOW_TOKEN = new RegExp(`^(?!none$)(?!${SHADOW_TOKEN}(?:\\s*,\\s*${SHADOW_TOKEN})*$).+`);

const config = {
  extends: ['stylelint-plugin-logical-css/configs/recommended'],
  ignoreFiles: ['legacy/**', '**/node_modules/**', 'dist/**', 'coverage/**'],
  rules: {
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],

    // no raw colours (tokens.css is exempt, see overrides)
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/'],

    // no physical direction
    'property-disallowed-list': [
      'left',
      'right',
      '/^(margin|padding|scroll-margin|scroll-padding)-(left|right)$/',
      '/^border-(left|right)(-|$)/',
      '/^border-(top|bottom)-(left|right)-radius$/',
    ],
    'declaration-property-value-disallowed-list': {
      'text-align': ['/^(left|right)$/'],
      float: ['/^(left|right)$/'],
      clear: ['/^(left|right)$/'],
      // four-value shorthands are physical (top right bottom left); use two values or the logical longhands
      margin: [FOUR_VALUES],
      padding: [FOUR_VALUES],
      inset: [FOUR_VALUES],
      // a literal horizontal slide does not flip in right-to-left; 0 and custom properties are allowed
      transform: [/translateX\((?!0\)|0px\)|var\()/i],
      // no pixel font sizes, no ad-hoc shadows (tokens or none only)
      'font-size': ['/px$/'],
      'box-shadow': [NOT_A_SHADOW_TOKEN],
      'text-shadow': [NOT_A_SHADOW_TOKEN],
    },
  },
  overrides: [
    {
      // The token file is where raw colours are defined.
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
      },
    },
  ],
};

export default config;
