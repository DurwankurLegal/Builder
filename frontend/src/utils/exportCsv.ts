/**
 * Client-side CSV export for record lists. Produces a real downloadable
 * .csv file (RFC-4180 quoting) so module "Export" buttons are functional
 * rather than placeholder toasts.
 */
export interface ExportColumn {
  key: string;
  label: string;
}

const escapeCell = (value: unknown): string => {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const exportToCsv = (
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[]
): number => {
  const header = columns.map(c => escapeCell(c.label)).join(',');
  const body = rows.map(row =>
    columns.map(c => escapeCell(row[c.key])).join(',')
  );
  const csv = [header, ...body].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
};
