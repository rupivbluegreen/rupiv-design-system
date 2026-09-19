import type { LabelMap } from "../labels";

/**
 * English defaults for the display components: Alert, AvatarGroup, Tag, Stepper, Skeleton and DescriptionList.
 * Keys are "<component>.<name>"; values are strings with {name} placeholders or functions. Counts are passed as
 * numbers, so an application can write a plural function (Arabic has six forms) for any label that takes `{n}`.
 * The other display components (Badge, Card, EmptyState, Kbd, Layout, Progress, Section, Stat, Timeline, Accordion,
 * Tile, TaskList) show only the text they are given, or numbers formatted for the provider's language.
 */
export const DISPLAY_LABELS = {
  // Alert: the dismiss button (its accessible name, then its tooltip)
  "alert.dismiss": "Dismiss",

  // AvatarGroup: the accessible name of the "+N" bubble; {n} is how many people are not shown
  "avatar.more": "{n} more",

  // Tag: the remove button. {name} is the tag text; the plain form is used when the tag content is not text
  "tag.remove": "Remove {name}",
  "tag.removeGeneric": "Remove",

  // Stepper: read after the name of a finished step
  "stepper.completed": "(completed)",

  // Skeleton and SkeletonText with `announce`: text only a screen reader gets
  "skeleton.loading": "Loading",

  // DescriptionList: shown for a value that is empty. An application may pass "Not set".
  "descriptionList.empty": "—",
} as const satisfies LabelMap;
