// Simple CSV exporter utility with safe escaping and Excel-friendly BOM
// Usage:
// exportToCsv('file.csv', [
//   { label: 'Nombre', value: (row) => row.name },
//   { label: 'Fecha', value: (row) => row.date },
// ], rows)

export type CsvColumn<T> = {
  label: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCsv(v: unknown): string {
  const s = v == null ? '' : String(v);
  // If value contains quotes, commas or newlines, wrap in quotes and escape quotes
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]) {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const lines = data.map((row) => columns.map((c) => escapeCsv(c.value(row))).join(','));
  const csv = [header, ...lines].join('\r\n');
  // Prepend BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
