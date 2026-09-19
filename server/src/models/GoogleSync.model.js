const db = require('../config/db');

function parseConnection(row) {
    if (!row) return row;
    return { ...row, tabs: JSON.parse(row.tabs || '[]') };
}

function parseMapping(row) {
    if (!row) return row;
    return { ...row, column_mapping: JSON.parse(row.column_mapping || '{}') };
}

const MAPPING_WITH_CONNECTION = `
    SELECT m.*, c.name AS connection_name, c.script_url, c.secret, c.company_id
    FROM google_sync_mappings m
    JOIN google_sheet_connections c ON m.connection_id = c.id`;

module.exports = {
    // ---- Connections ----
    async createConnection({ companyId, name, scriptUrl, encryptedSecret, tabs }) {
        const { insertId } = await db.run(
            'INSERT INTO google_sheet_connections (company_id, name, script_url, secret, tabs) VALUES (?, ?, ?, ?, ?)',
            [companyId, name, scriptUrl, encryptedSecret, JSON.stringify(tabs || [])]
        );
        return this.findConnectionById(insertId);
    },

    async findConnectionsByCompany(companyId) {
        const rows = await db.all(
            'SELECT id, name, script_url, tabs, company_id, created_at FROM google_sheet_connections WHERE company_id = ? ORDER BY id DESC',
            [companyId]
        );
        return rows.map(parseConnection);
    },

    async findConnectionById(id) {
        return parseConnection(await db.get('SELECT * FROM google_sheet_connections WHERE id = ?', [id]));
    },

    async updateConnectionTabs(id, tabs) {
        await db.run('UPDATE google_sheet_connections SET tabs = ? WHERE id = ?', [JSON.stringify(tabs || []), id]);
    },

    async deleteConnection(id) {
        return db.run('DELETE FROM google_sheet_connections WHERE id = ?', [id]);
    },

    // ---- Mappings ----
    async createMapping({ connectionId, tableName, sheetTab, direction, columnMapping }) {
        const { insertId } = await db.run(
            'INSERT INTO google_sync_mappings (connection_id, table_name, sheet_tab, direction, column_mapping) VALUES (?, ?, ?, ?, ?)',
            [connectionId, tableName, sheetTab, direction, JSON.stringify(columnMapping || {})]
        );
        return insertId;
    },

    async updateMapping(id, { connectionId, tableName, sheetTab, direction, columnMapping }) {
        await db.run(
            'UPDATE google_sync_mappings SET connection_id = ?, table_name = ?, sheet_tab = ?, direction = ?, column_mapping = ? WHERE id = ?',
            [connectionId, tableName, sheetTab, direction, JSON.stringify(columnMapping || {}), id]
        );
    },

    async findMappingsByCompany(companyId) {
        const rows = await db.all(`${MAPPING_WITH_CONNECTION} WHERE c.company_id = ? ORDER BY m.id DESC`, [companyId]);
        return rows.map(parseMapping);
    },

    // Includes the connection's script_url/secret/company_id — runSync needs those to
    // actually call the gateway, not just the mapping's own columns.
    async findMappingById(id) {
        return parseMapping(await db.get(`${MAPPING_WITH_CONNECTION} WHERE m.id = ?`, [id]));
    },

    async deleteMapping(id) {
        return db.run('DELETE FROM google_sync_mappings WHERE id = ?', [id]);
    },

    async logSync(mappingId, direction, status, rowsCount, message) {
        await db.run(
            'INSERT INTO google_sync_log (mapping_id, direction, status, rows_count, message) VALUES (?, ?, ?, ?, ?)',
            [mappingId, direction, status, rowsCount || 0, message || null]
        );
        await db.run('UPDATE google_sync_mappings SET last_synced_at = NOW(), last_status = ? WHERE id = ?', [status, mappingId]);
    },

    // ---- Review queue ----
    async queueReviewRow({ mappingId, dedupeKey, rowData }) {
        // Relies on uq_gsync_queue_dedupe (mapping_id, dedupe_key) — a duplicate throws
        // ER_DUP_ENTRY, which the caller treats as "already queued", not an error.
        return db.run(
            "INSERT INTO google_sync_review_queue (mapping_id, dedupe_key, row_data, status) VALUES (?, ?, ?, 'Pending')",
            [mappingId, dedupeKey, JSON.stringify(rowData)]
        );
    },

    async findReviewQueue(companyId, mappingId) {
        const params = [companyId];
        let where = "WHERE c.company_id = ? AND q.status = 'Pending'";
        if (mappingId) { where += ' AND q.mapping_id = ?'; params.push(mappingId); }
        const rows = await db.all(
            `SELECT q.*, m.table_name, m.sheet_tab
             FROM google_sync_review_queue q
             JOIN google_sync_mappings m ON q.mapping_id = m.id
             JOIN google_sheet_connections c ON m.connection_id = c.id
             ${where}
             ORDER BY q.id ASC`,
            params
        );
        return rows.map((r) => ({ ...r, row_data: JSON.parse(r.row_data) }));
    },

    async findReviewItemById(id) {
        return db.get(
            `SELECT q.*, m.table_name
             FROM google_sync_review_queue q
             JOIN google_sync_mappings m ON q.mapping_id = m.id
             WHERE q.id = ?`,
            [id]
        );
    },

    async resolveReviewItem(id, status, resultMessage) {
        await db.run(
            "UPDATE google_sync_review_queue SET status = ?, result_message = ?, reviewed_at = NOW() WHERE id = ?",
            [status, resultMessage || null, id]
        );
    },
};
