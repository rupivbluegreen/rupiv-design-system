import type { ReactNode } from 'react';
import './data-table.css';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  align?: 'start' | 'end';
  render: (row: Row) => ReactNode;
}

export interface DataTableProps<Row> {
  caption: string;
  columns: Array<DataTableColumn<Row>>;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
}

/** A dense data table: sticky header, tabular numerics right-aligned, hover highlight, no fabricated pagination or sort — the caller owns those. */
export function DataTable<Row>({ caption, columns, rows, rowKey }: DataTableProps<Row>) {
  return (
    <div className="omni-data-table-scroll">
      <table className="omni-data-table">
        <caption className="omni-data-table-caption">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" data-align={column.align ?? 'start'}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-align={column.align ?? 'start'}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
