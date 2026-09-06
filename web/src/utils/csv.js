// Client-side CSV export — takes rows already available in the browser (report results,
// an employee list) and triggers a download with no backend round-trip. Values are quoted
// and internal quotes escaped per RFC 4180 so commas/quotes/newlines in the data don't
// corrupt the column layout.
function escapeCsvValue(value) {
    const s = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function rowsToCsv(rows, columns) {
    const cols = columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
    const header = cols.map(escapeCsvValue).join(',');
    const lines = rows.map((row) => cols.map((c) => escapeCsvValue(row[c])).join(','));
    return [header, ...lines].join('\r\n');
}

export function downloadCsv(filename, rows, columns) {
    const csv = rowsToCsv(rows, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
