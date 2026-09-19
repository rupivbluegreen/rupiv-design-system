import type { LabelMap } from "../labels";

/**
 * English defaults for the data and form components: DataTable, Pagination, FilterBar, FileDrop, QuantityInput,
 * SearchInput, Field, Breadcrumbs and PageHeader. Keys are "<component>.<name>"; values are strings with {name}
 * placeholders or functions. Counts are passed as numbers, so an application can write a plural function
 * (Arabic has six forms) for any label that takes `{n}`.
 */
export const DATA_LABELS = {
  // DataTable
  "dataTable.bulkActions": "Bulk actions",
  "dataTable.selectAllRows": "Select all rows on this page",
  "dataTable.deselectAllRows": "Deselect all rows on this page",
  "dataTable.selectedCount": "{n} selected",
  "dataTable.clearSelection": "Clear",
  "dataTable.selectRow": "Select row {id}",
  "dataTable.emptyTitle": "No records found",
  "dataTable.emptyDescription": "Try adjusting your search or filters.",

  // Pagination (numbers arrive already formatted for the locale)
  "pagination.label": "Pagination",
  "pagination.range": "{from} to {to} of {total}",
  "pagination.pageOf": "Page {page} of {pages}",
  "pagination.compact": "{page} / {pages}",
  "pagination.pageSize": "Rows per page",
  "pagination.previous": "Previous page",
  "pagination.next": "Next page",
  "pagination.goToPage": "Page {page}",

  // FilterBar and FilterChip
  "filterBar.filteredBy": "Filtered by",
  "filterBar.removeFilter": "Remove filter {label}",
  "filterBar.clearAll": "Clear all",
  "filterBar.clearFilter": "Clear",

  // FileDrop (sizes arrive already formatted for the locale)
  "fileDrop.dropToUpload": "Drop to upload",
  "fileDrop.promptOne": "Drag a file here or",
  "fileDrop.promptMany": "Drag files here or",
  "fileDrop.browse": "browse",
  "fileDrop.selectedFiles": "Selected files",
  "fileDrop.remove": "Remove {name}",
  "fileDrop.sizeBytes": "{size} B",
  "fileDrop.sizeKb": "{size} KB",
  "fileDrop.sizeMb": "{size} MB",

  // QuantityInput
  "quantityInput.decrease": "Decrease",
  "quantityInput.increase": "Increase",

  // SearchInput
  "searchInput.placeholder": "Search",
  "searchInput.clear": "Clear search",

  // Field
  "field.optional": "(optional)",

  // Breadcrumbs and PageHeader
  "breadcrumbs.label": "Breadcrumb",
  "pageHeader.back": "Back",
} as const satisfies LabelMap;
