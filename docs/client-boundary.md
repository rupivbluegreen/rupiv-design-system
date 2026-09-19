# Client boundary

The design system is TypeScript source with `"use client"` where a component holds state, reads the provider, or
touches the DOM. In a framework with Server Components (Next.js), that creates one rule to know.

## The rule

Props of a Client Component that cross from a Server Component must be plain data: strings, numbers, booleans,
arrays and objects of those, and React elements. **Functions cannot cross.**

`DataTable` takes functions (`cell`, `getRowId`, `rowHref`, `rowTone`, `sortValue`, `bulkActions`). So a page that is a
Server Component cannot render `<DataTable columns={...} />`: the build fails with "Functions cannot be passed directly
to Client Components". The same holds for anything given `onClick`, `onChange`, `onSelect`, `render` and similar.

Do this instead: write a small client file that receives the plain data and builds the columns, and render that from
the page.

```tsx
// orders-table.tsx
"use client";
import { DataTable, type Column } from "@rupiv/design-system";

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const columns: Column<OrderRow>[] = [{ key: "name", header: "Name", cell: (row) => row.name }];
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} rowHref={(row) => `/orders/${row.id}`} />;
}

// page.tsx (Server Component): passes data, not functions
export default async function Page() {
  return <OrdersTable rows={await loadOrders()} />;
}
```

## Components that read the provider

`Button`, `IconButton`, `Breadcrumbs`, `Stat`, `Menu`, `TabLinks` and `DataTable` read the provider (link component,
navigation, active path), so they are Client Components. A Server Component may still render them with plain props, for
example `<Button href="/orders">Orders</Button>`, `<Stat label="Open" value="42" href="/open" />` or a `PageHeader` with
`backHref`. Handlers (`onClick`) need a client file.

## The provider

`DesignSystemProvider` takes `locale`, `dir`, `labels`, `linkComponent`, `navigate` and `activePath`. Three of those are
functions, or contain them, so build them in a client file and keep the server layout to plain strings:

```tsx
// providers.tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DesignSystemProvider } from "@rupiv/design-system";

export function Providers({ locale, dir, children }: { locale: string; dir: "ltr" | "rtl"; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <DesignSystemProvider
      locale={locale}
      dir={dir}
      linkComponent={Link}
      navigate={(href) => router.push(href)}
      activePath={pathname}
    >
      {children}
    </DesignSystemProvider>
  );
}

// layout.tsx (Server Component): <Providers locale="ar" dir="rtl">{children}</Providers>
```

The package never imports `next/*`. Every hook works without a provider and returns the defaults: English, left to
right, a plain `<a>`, navigation by page load, no active path.
