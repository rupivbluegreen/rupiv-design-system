# A2 note: `FileDrop` limits and `FormFooter`

This branch is based on `187fe39` (the A1 branch). It adds two things that the second consuming application needs and
the package lacked. Both are listed under "Not done" in [`a1-adoption-note.md`](a1-adoption-note.md), section
4, which is left as it was written: those two items are done by this branch.

## What changes

| File | Change |
|---|---|
| `src/components/ui/file-drop.tsx`, `file-drop.module.css` | `maxSize` (bytes) and `onReject`; a rejected file is not passed to `onFiles`; without `onReject` a message under the drop area; types `FileRejection` and `FileRejectReason` |
| `src/components/ui/form-footer.tsx`, `form-footer.module.css` | new component `FormFooter`: a sticky action bar with a status at the inline start, actions at the inline end, and an unsaved-changes status that is announced |
| `src/components/ui/index.ts` | one line: `export * from "./form-footer"` (the `FileDrop` types come with `export * from "./file-drop"`) |
| `src/provider/label-sets/data.ts` | six new English labels: `fileDrop.rejectType`, `fileDrop.rejectSize`, `fileDrop.dismiss`, `formFooter.label`, `formFooter.unsaved`, `formFooter.clean` |
| `src/components/ui/file-drop.test.tsx`, `form-footer.test.tsx`, `data-form.contract.test.ts`, `src/provider/label-sets/data.test.ts`, `test/data-labels.ts` | tests in English and Arabic (`renderBoth`, `renderIn`), the CSS text checked for the sticky bar, and the stand-in Arabic labels for the six keys |
| `docs/design-system.md` | the `FileDrop` entry, a new `FormFooter` entry, and the form page pattern |

The components' behaviour is in [`design-system.md`](design-system.md), section 8, "Forms". In short:

- `FileDrop` rejects a file whose type does not match `accept` (`"type"`) or whose size is above `maxSize` (`"size"`),
  from a drop and from the file picker. The valid files of a batch still go through. With `onReject` the application
  says what to show; without it the component shows a `role="alert"` message with a Dismiss button.
- `FormFooter` is `<div role="group">` named by `label` or by `formFooter.label`. `dirty` shows "Unsaved changes"; a
  status region that is always in the page changes its text when `dirty` flips, so it is announced.

## Breaking changes

None to the API: every prop is optional and added, and `FormFooter` is a new export. Nothing is renamed or removed, and
a call that gives neither `maxSize` nor `onReject` compiles and behaves as before, with one exception.

**Behaviour change.** A file of the wrong type used to be dropped with no message. It is now rejected out loud: the
component shows its own message, or calls `onReject`. A screen that used `accept` will therefore show a message it did
not show before, and it needs the two `fileDrop.reject*` labels, and `fileDrop.dismiss`, in its language (English
defaults ship; a key with no label in the application's language falls back to English, never to the key).

A consumer that gives its own labels adds six keys: the three `fileDrop` keys above and the three `formFooter` keys.

## What this does not prove

- jsdom has no layout and no style sheets. The tests prove the markup order, the roles, the names, the live region,
  the keyboard and the CSS text (`position: sticky`, `inset-block-end: 0`, `margin-inline-*: auto`, nothing reversed).
  They do not prove that the bar sticks to the bottom of a scroll container, that in Arabic the status is at the right
  edge and the primary action at the left edge, how the message looks, or that nothing overflows at 390px. That is
  screenshots in the consuming application, in English and Arabic.
- They do not prove what a screen reader says. They prove that a `role="alert"` is inserted again for each rejection
  and that one `role="status"` element stays in the page while its text changes.
- The Arabic in `test/data-labels.ts` is a stand-in draft, not reviewed text.

## Left as it is

`README.md` (its Status paragraph) and section 4 of `a1-adoption-note.md` still say that `FileDrop` has no reject
callback and that there is no `FormFooter`. Both statements are out of date once this branch is merged; the owner
decides when to change them.
