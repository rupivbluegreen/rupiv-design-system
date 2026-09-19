import type { LabelMap } from "../labels";

/** English defaults for the overlays components. Keys are "<component>.<name>"; values are strings with {name} placeholders or functions. */
export const OVERLAY_LABELS = {
  // Combobox
  "combobox.placeholder": "Select…",
  "combobox.empty": "No matches",
  "combobox.show": "Show options",
  "combobox.hide": "Hide options",
  // Drawer and Modal: the close button in the header
  "drawer.close": "Close",
  "modal.close": "Close",
  // TabLinks: the name of the navigation landmark when the application gives none
  "tabs.sections": "Sections",
  // Toast: the live region and the dismiss button of each toast (its accessible name, then its tooltip)
  "toast.region": "Notifications",
  "toast.dismiss": "Dismiss notification",
  "toast.dismissTitle": "Dismiss",
} as const satisfies LabelMap;
