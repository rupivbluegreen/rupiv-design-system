// Under Vitest a CSS Module answers every class name with `_<name>_<hash>`, so a test can tell which class a
// component chose (a variant, a tone, a size) without the CSS being processed. This proves the choice, not how it looks.

/** True when `element` carries the CSS Module class `name`, for example `hasModuleClass(button, "danger")`. */
export function hasModuleClass(element: Element, name: string): boolean {
  return element.className
    .split(/\s+/)
    .some((className) => new RegExp(`^_${name}_[0-9a-f]+$`).test(className));
}
