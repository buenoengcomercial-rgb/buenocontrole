import * as XLSX from 'xlsx';

export type XlsxCell = string | number | null | undefined;
export type XlsxRow = XlsxCell[];

// Brazilian number format: renders as 1.234,56 on pt-BR Excel installations.
const BR_NUMBER_FORMAT = '#,##0.00';
const BR_INT_FORMAT = '#,##0';

/**
 * Export a 2D array of rows to an .xlsx file.
 * Numeric cells keep their numeric type and receive Brazilian number formatting
 * (comma as decimal separator, dot as thousands separator when opened in pt-BR Excel).
 */
export function exportRowsToXlsx(opts: {
  filename: string;
  sheetName?: string;
  rows: XlsxRow[];
  numberFormat?: string;
}) {
  const { filename, sheetName = 'Planilha', rows, numberFormat = BR_NUMBER_FORMAT } = opts;
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => (c === null || c === undefined ? '' : c))));
  const ref = ws['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = numberFormat;
        }
      }
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Convenience helper for exporting an array of objects. Header row comes from the first object's keys.
 */
export function exportObjectsToXlsx(opts: {
  filename: string;
  sheetName?: string;
  data: Record<string, XlsxCell>[];
}) {
  const { filename, sheetName, data } = opts;
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows: XlsxRow[] = [headers, ...data.map(row => headers.map(h => row[h] ?? ''))];
  exportRowsToXlsx({ filename, sheetName, rows });
}
