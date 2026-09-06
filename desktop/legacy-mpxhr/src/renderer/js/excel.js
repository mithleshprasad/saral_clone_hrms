
export function exportTableToExcel(tableId, filename = 'export.xlsx') {
    const table = document.getElementById(tableId);
    if (!table) {
        window.showToast("Table data not found!", 'error');
        return;
    }

    // Check if table has rows
    if (table.rows.length < 2) {
        window.showToast("No data to export", 'warning');
        return;
    }

    try {
        const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
        XLSX.writeFile(wb, filename);
        window.showToast("Export successful!", 'success');
    } catch (e) {
        console.error("Export Error:", e);
        window.showToast("Export failed: " + e.message, 'error');
    }
}
