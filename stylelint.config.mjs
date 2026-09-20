// CSS rules for the design system: tokens only, logical properties only.
// The logical-css plugin covers properties, keywords and units; the value rules below cover what the plugin does
// not (shorthands, transforms, positions, shadows, fonts). A consuming application can copy these value rules.
// Not extending stylelint-config-standard on purpose: it adds stylistic warnings the source does not follow.
// CSS Modules are used throughout, so :global, :local and composes are allowed.
//
// What these rules cannot see: physical direction written outside the declarations listed here (an SVG `x`
// attribute, `clip-path: inset()`, `matrix()`), a physical value built inside a custom property, and anything
// decided at run time. jsdom cannot show that right-to-left looks right; screenshots in an application can.

// One CSS value token: a run of non-space characters, or a function call with up to two levels of parentheses.
const T = String.raw`(?:[^\s()]|\((?:[^()]|\([^()]*\))*\))+`;
// The same, but a top-level slash ends the token (border-radius writes horizontal / vertical radii).
const TN = String.raw`(?:[^\s()/]|\((?:[^()]|\([^()]*\))*\))+`;

// margin, padding, inset, scroll-margin, scroll-padding and the border-width, -style and -color shorthands written
// with four values (top right bottom left) are physical. Two values (block inline) or three (top inline bottom) are not.
const FOUR_VALUES = new RegExp(`^${T}\\s+${T}\\s+${T}\\s+${T}$`);

// border-radius lists the corners top-left, top-right, bottom-right, bottom-left. It is direction-safe only when the
// right corners equal the left ones (`a`, `a a`, `a a a`, `a a c c`); the optional `/ ...` half is checked the same way.
// `n` is the number of capture groups used before this half, so the back references point at the right group.
const symmetricCorners = (n) =>
  `(?:${TN}|(${TN})\\s+\\${n + 1}|(${TN})\\s+\\${n + 2}\\s+\\${n + 2}|(${TN})\\s+\\${n + 3}\\s+(${TN})\\s+\\${n + 4})`;
const ASYMMETRIC_RADIUS = new RegExp(`^(?!${symmetricCorners(0)}(?:\\s*/\\s*${symmetricCorners(4)})?$).+`);

// A horizontal offset that follows the direction: zero, or driven by a custom property (var(), or calc() with a
// var() in it, such as calc(14px * var(--rd-dir))). A literal offset or a percentage does not flip in right-to-left.
// -50% is not allowed either: with logical insets it centres wrongly in right-to-left, so scale it by --rd-dir.
const ZERO = String.raw`0(?:\.0+)?(?:px|%|rem|em)?(?=[\s,)]|$)`;
const CALC_WITH_VAR = String.raw`calc\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*?var\(`;
const DIRECTIONAL_X = `(?:${ZERO}|var\\(|${CALC_WITH_VAR})`;
// transform: translate(x, y), translateX(x) and translate3d(x, y, z) with a literal x.
const LITERAL_TRANSLATE_FN = new RegExp(`(?<![\\w-])translate(?:x|3d)?\\(\\s*(?!${DIRECTIONAL_X})`, 'i');
// The translate property is `x [y [z]]`, or a CSS-wide keyword.
const LITERAL_TRANSLATE_PROP = new RegExp(`^(?!(?:none|initial|inherit|unset|revert(?:-layer)?)$|${DIRECTIONAL_X}).+`, 'i');

// left and right as keywords in a position, origin or gradient direction are physical (`right center`, `to left`).
// A custom property or a file name that only contains the word (`--left`, `left.svg`) is not a keyword.
const PHYSICAL_KEYWORD = /(?<![\w./-])(?:left|right)(?![\w./-])/i;

// A font shorthand carrying a pixel or point size (`14px/1.4 family`). A px line height after the slash is allowed.
const FONT_SHORTHAND_PX_SIZE = /(?:^|\s)[+-]?(?:\d+\.?\d*|\.\d+)(?:px|pt)(?:\/\S*)?(?=\s|$)/i;

// A box or text shadow is `none`, or a comma-separated list of shadow and focus-ring tokens.
const SHADOW_TOKEN = String.raw`var\(--(?:shadow|focus-ring)[\w-]*\)`;
const NOT_A_SHADOW_TOKEN = new RegExp(`^(?!none$)(?!${SHADOW_TOKEN}(?:\\s*,\\s*${SHADOW_TOKEN})*$).+`, 'i');
// drop-shadow() in a filter takes one shadow: only a shadow token is allowed in it.
const DROP_SHADOW_NOT_A_TOKEN = new RegExp(`drop-shadow\\(\\s*(?!${SHADOW_TOKEN}\\s*\\))`, 'i');

const config = {
  extends: ['stylelint-plugin-logical-css/configs/recommended'],
  ignoreFiles: ['legacy/**', '**/node_modules/**', 'dist/**', 'coverage/**'],
  rules: {
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],

    // no raw colours (tokens.css is exempt, see overrides); function names are matched in any case (RGB(), Hsl())
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/i],

    // no physical direction
    'property-disallowed-list': [
      'left',
      'right',
      '/^(margin|padding|scroll-margin|scroll-padding)-(left|right)$/',
      '/^border-(left|right)(-|$)/',
      '/^border-(top|bottom)-(left|right)-radius$/',
    ],
    'declaration-property-value-disallowed-list': {
      'text-align': ['/^(?:-(?:webkit|moz)-)?(?:left|right)$/i'],
      float: ['/^(left|right)$/i'],
      clear: ['/^(left|right)$/i'],
      // four-value shorthands are physical (top right bottom left); use two values or the logical longhands
      '/^(?:margin|padding|inset|scroll-margin|scroll-padding|border-width|border-style|border-color)$/i': [FOUR_VALUES],
      // a radius that differs left to right does not flip; use border-start-start-radius and the other logical longhands
      'border-radius': [ASYMMETRIC_RADIUS],
      // a literal horizontal slide does not flip in right-to-left; 0 and custom properties are allowed
      '/^(?:-webkit-|-ms-)?transform$/i': [LITERAL_TRANSLATE_FN],
      translate: [LITERAL_TRANSLATE_PROP],
      // left and right keywords in positions, origins and gradient directions
      '/^(?:-webkit-)?(?:background|mask)(?:-(?:image|position|position-x))?$/i': [PHYSICAL_KEYWORD],
      '/^(?:background-position-x|object-position|transform-origin|perspective-origin|text-underline-position)$/i': [
        PHYSICAL_KEYWORD,
      ],
      // no pixel or point font sizes, in font-size or in the font shorthand
      'font-size': ['/(?:px|pt)$/i'],
      font: [FONT_SHORTHAND_PX_SIZE],
      // no ad-hoc shadows (tokens or none only)
      '/^(?:-webkit-|-moz-)?box-shadow$/i': [NOT_A_SHADOW_TOKEN],
      'text-shadow': [NOT_A_SHADOW_TOKEN],
      '/^(?:-webkit-)?(?:backdrop-)?filter$/i': [DROP_SHADOW_NOT_A_TOKEN],
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
