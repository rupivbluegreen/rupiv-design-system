import * as ui from './index';

// The barrel and every internal import are extensionless, so both Vite and
// Next.js (Turbopack included) can resolve them without an extension alias.
describe('@omniappsuiux/ui-react barrel', () => {
  it.each([
    'Card',
    'Stack',
    'Inline',
    'Button',
    'IconButton',
    'StatusBadge',
    'MetricDelta',
    'Skeleton',
    'SkeletonText',
    'KPICard',
    'AIInsightCard',
    'EmptyState',
    'PageHeader',
    'AppShell',
    'DataTable',
    'Field',
    'Input',
    'Textarea',
    'Select',
    'Checkbox',
    'RadioGroup',
    'Switch',
  ])('exports %s', (name) => {
    expect(typeof (ui as Record<string, unknown>)[name]).toMatch(
      /function|object/,
    );
  });
});
