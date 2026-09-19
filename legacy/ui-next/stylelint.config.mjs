/**
 * Enforces the design system's CSS rules with Stylelint's core rules only:
 * tokens instead of raw colours, logical properties instead of left/right,
 * and rem (via the type-scale tokens) instead of px font sizes.
 *
 * `color-mix()` and `var()` stay allowed on purpose, so a colour can be derived
 * from a token without introducing a raw value.
 *
 * @type {import('stylelint').Config}
 */
export default {
  // Generated from tokens.json: it defines the raw colours, so it is exempt by definition.
  ignoreFiles: ['**/generated/**', '**/dist/**', '**/node_modules/**'],
  rules: {
    // No raw colours: every colour is a --tx-color-* token.
    'color-no-hex': true,
    'color-named': 'never',
    // A regular expression, so RGB() and Rgb() are caught too. color-mix() and var() are not listed.
    'function-disallowed-list': [
      '/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/i',
    ],

    // No physical horizontal properties: they do not flip under dir="rtl".
    // Use inset-inline-*, margin-inline-*, padding-inline-*, border-inline-*,
    // border-start-start-radius and friends instead.
    'property-disallowed-list': [
      '/^(left|right)$/i',
      '/^(margin|padding|scroll-margin|scroll-padding)-(left|right)$/i',
      '/^border-(left|right)(-|$)/i',
      '/^border-(top|bottom)-(left|right)-radius$/i',
    ],
    'declaration-property-value-disallowed-list': {
      // Use start / end.
      'text-align': ['/^(left|right)$/i'],
      float: ['/^(left|right)$/i'],
      clear: ['/^(left|right)$/i'],
      // Use a --tx-typography-size-* token (rem), so text follows the user's font setting.
      'font-size': ['/px$/i'],
    },
  },
};
