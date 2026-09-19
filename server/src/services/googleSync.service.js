// Google Sheets sync — a company connects its own Google Sheet via a small Apps Script
// "gateway" deployed under their own Google account, instead of MpxHR doing OAuth with
// Google directly. No Google Cloud project, no app-verification wait, works the moment a
// company deploys their own script. MpxHR is just an HTTP client here.
const crypto = require('crypto');
const db = require('../config/db');
const GoogleSync = require('../models/GoogleSync.model');
const secureStore = require('../utils/secureStore');
const ApiError = require('../utils/ApiError');

function generateSecret() {
    return crypto.randomBytes(24).toString('hex');
}

// The full Apps Script source a company pastes into Extensions > Apps Script on their own
// Sheet. Kept as one readable template string so the settings screen can show/copy it
// verbatim — identical contract to what runExport/runImport below actually call.
function getAppsScriptTemplate(secret) {
    return `// MpxHR Sync Gateway -- paste this whole file into Extensions > Apps Script on the
// Google Sheet you want to connect, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone), and paste the resulting URL back into MpxHR.
// This script only ever runs with YOUR OWN Google permissions -- MpxHR never sees your
// Google login, only this URL and the secret code below.

const SECRET = "${secret}";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return json({ ok: false, error: "Invalid secret" });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    switch (body.action) {
      case "ping": return json(handlePing(ss));
      case "readRows": return json(handleReadRows(ss, body));
      case "overwriteSheet": return json(handleOverwriteSheet(ss, body));
      default: return json({ ok: false, error: "Unknown action: " + body.action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  return json({ ok: true, message: "MpxHR sync endpoint is running. Use POST." });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handlePing(ss) {
  const tabs = ss.getSheets().map(function (s) { return s.getName(); });
  return { ok: true, sheetName: ss.getName(), tabs: tabs };
}

function getTab(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Tab not found: " + name);
  return sheet;
}

function handleReadRows(ss, body) {
  const sheet = getTab(ss, body.tab);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return { ok: true, headers: [], rows: [] };
  const headers = values[0].map(function (h) { return String(h); });
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = values[i][j];
    obj.__row = i + 1;
    rows.push(obj);
  }
  return { ok: true, headers: headers, rows: rows };
}

function handleOverwriteSheet(ss, body) {
  let sheet = ss.getSheetByName(body.tab);
  if (!sheet) sheet = ss.insertSheet(body.tab);
  sheet.clearContents();
  const rows = body.rows || [];
  const all = [body.headers || []].concat(rows);
  if (all.length && all[0].length) {
    sheet.getRange(1, 1, all.length, all[0].length).setValues(all);
  }
  return { ok: true, rows: rows.length };
}
`;
}

// POSTs {action, secret, ...payload} to the company's deployed Web App URL and returns the
// parsed JSON body. Apps Script always answers HTTP 200 with an {ok:true|false} envelope, so
// a non-2xx or a non-JSON body means the URL itself is wrong (not deployed, deleted, etc).
async function callGateway(scriptUrl, secret, action, payload = {}) {
    if (!scriptUrl) throw ApiError.badRequest('No script URL configured for this connection.');
    let res;
    try {
        res = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, secret, ...payload }),
            redirect: 'follow',
        });
    } catch (e) {
        throw ApiError.badRequest('Could not reach that script URL: ' + e.message);
    }
    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw ApiError.badRequest(`Script URL did not return valid JSON (HTTP ${res.status}). Check it was deployed as "Anyone" and the URL was copied in full.`);
    }
    if (!data.ok) throw ApiError.badRequest(data.error || 'Unknown error from the sync gateway.');
    return data;
}

async function testConnection(scriptUrl, secret) {
    return callGateway(scriptUrl, secret, 'ping');
}

// ---- Syncable tables whitelist ----
// Deliberately not "any table in the database" — only ones simple/safe enough to round-trip
// through a spreadsheet without dragging in sensitive columns (password hashes, tokens,
// statutory master data, etc). companyFilter scopes export queries to the connection's own
// company; tables with no direct company_id column are scoped through their parent instead.
const SYNCABLE_TABLES = {
    employees: {
        label: 'Employees',
        columns: ['employee_code', 'first_name', 'last_name', 'email', 'phone', 'department_id', 'position_id', 'date_of_joining', 'status', 'base_salary', 'gender', 'dob', 'address', 'city', 'state', 'pan_number', 'uan', 'bank_name', 'account_number', 'ifsc_code'],
        required: ['first_name', 'last_name'],
        keyColumn: 'email',
        companyFilter: 'company_id = ?',
        injectCompanyId: true,
    },
    departments: {
        label: 'Departments',
        columns: ['name', 'description'],
        required: ['name'],
        keyColumn: 'name',
        companyFilter: 'company_id = ?',
        injectCompanyId: true,
    },
    positions: {
        label: 'Designations',
        columns: ['title', 'base_salary', 'department_id'],
        required: ['title'],
        keyColumn: 'title',
        companyFilter: 'department_id IN (SELECT id FROM departments WHERE company_id = ?)',
        injectCompanyId: false,
    },
    attendance: {
        label: 'Attendance',
        columns: ['employee_id', 'date', 'status', 'check_in_time', 'check_out_time'],
        required: ['employee_id', 'date'],
        keyColumn: null,
        companyFilter: 'employee_id IN (SELECT id FROM employees WHERE company_id = ?)',
        injectCompanyId: false,
    },
    loans: {
        label: 'Loans',
        columns: ['employee_id', 'loan_type', 'principal_amount', 'monthly_emi', 'start_date'],
        required: ['employee_id', 'principal_amount'],
        keyColumn: null,
        companyFilter: 'employee_id IN (SELECT id FROM employees WHERE company_id = ?)',
        injectCompanyId: false,
    },
    assets: {
        label: 'Assets',
        columns: ['name', 'serial_number', 'type', 'value'],
        required: ['name'],
        keyColumn: 'serial_number',
        companyFilter: 'company_id = ?',
        injectCompanyId: true,
    },
};

function getSyncableTables() {
    return Object.entries(SYNCABLE_TABLES).map(([table, cfg]) => ({ table, label: cfg.label, columns: cfg.columns, required: cfg.required }));
}

// ---- Connection CRUD ----

async function addConnection({ companyId, name, scriptUrl, secret }) {
    if (!companyId) throw ApiError.badRequest('companyId is required');
    const info = await testConnection(scriptUrl, secret);
    const encryptedSecret = secureStore.encrypt(secret);
    const conn = await GoogleSync.createConnection({ companyId, name: name || info.sheetName, scriptUrl, encryptedSecret, tabs: info.tabs });
    return { ...conn, secret: undefined };
}

async function listConnections(companyId) {
    return GoogleSync.findConnectionsByCompany(companyId);
}

async function getConnectionWithSecret(id) {
    const row = await GoogleSync.findConnectionById(id);
    if (!row) throw ApiError.notFound('Connection not found');
    return { ...row, secret: secureStore.decrypt(row.secret) };
}

async function getTabHeaders(connectionId, tab) {
    const conn = await getConnectionWithSecret(connectionId);
    const { headers } = await callGateway(conn.script_url, conn.secret, 'readRows', { tab });
    return headers;
}

async function refreshConnectionTabs(id) {
    const conn = await getConnectionWithSecret(id);
    const info = await testConnection(conn.script_url, conn.secret);
    await GoogleSync.updateConnectionTabs(id, info.tabs);
    return info.tabs;
}

async function deleteConnection(id) {
    return GoogleSync.deleteConnection(id);
}

// ---- Mappings ----

async function saveMapping({ id, connectionId, tableName, sheetTab, direction, columnMapping }) {
    if (!SYNCABLE_TABLES[tableName]) throw ApiError.badRequest('That table is not available for sync.');
    if (!['export', 'import'].includes(direction)) throw ApiError.badRequest('Direction must be export or import.');
    if (id) {
        await GoogleSync.updateMapping(id, { connectionId, tableName, sheetTab, direction, columnMapping });
        return id;
    }
    return GoogleSync.createMapping({ connectionId, tableName, sheetTab, direction, columnMapping });
}

async function listMappings(companyId) {
    const rows = await GoogleSync.findMappingsByCompany(companyId);
    return rows.map((r) => ({ ...r, secret: undefined, tableLabel: (SYNCABLE_TABLES[r.table_name] || {}).label || r.table_name }));
}

async function deleteMapping(id) {
    return GoogleSync.deleteMapping(id);
}

// ---- Export: DB table -> Sheet (full overwrite of that tab each run; the Sheet is a copy) ----

async function runExport(mapping) {
    const cfg = SYNCABLE_TABLES[mapping.table_name];
    if (!cfg) throw ApiError.badRequest('Unknown table: ' + mapping.table_name);
    const mapping_ = typeof mapping.column_mapping === 'string' ? JSON.parse(mapping.column_mapping) : mapping.column_mapping;

    const cols = cfg.columns;
    const sql = `SELECT ${cols.map((c) => `\`${c}\``).join(', ')} FROM ${mapping.table_name} WHERE ${cfg.companyFilter}`;
    const rows = await db.all(sql, [mapping.company_id]);
    const headers = cols.map((c) => (mapping_ && mapping_[c]) || c);
    const dataRows = rows.map((r) => cols.map((c) => (r[c] === null || r[c] === undefined) ? '' : r[c]));

    const secret = secureStore.decrypt(mapping.secret);
    await callGateway(mapping.script_url, secret, 'overwriteSheet', { tab: mapping.sheet_tab, headers, rows: dataRows });
    await GoogleSync.logSync(mapping.id, 'export', 'success', rows.length, null);
    return { success: true, rows: rows.length };
}

// ---- Import: Sheet -> Review Queue (never writes the target table directly) ----

async function runImport(mapping) {
    const cfg = SYNCABLE_TABLES[mapping.table_name];
    if (!cfg) throw ApiError.badRequest('Unknown table: ' + mapping.table_name);
    const mapping_ = typeof mapping.column_mapping === 'string' ? JSON.parse(mapping.column_mapping) : mapping.column_mapping;

    const secret = secureStore.decrypt(mapping.secret);
    const { headers, rows } = await callGateway(mapping.script_url, secret, 'readRows', { tab: mapping.sheet_tab });

    // column_mapping is {dbColumn: sheetHeader}; invert for quick lookup while walking sheet rows
    const dbColForHeader = {};
    for (const [dbCol, sheetHeader] of Object.entries(mapping_ || {})) {
        if (sheetHeader) dbColForHeader[sheetHeader] = dbCol;
    }
    // Any db column not explicitly mapped still gets a chance via an exact header-name match
    for (const dbCol of cfg.columns) {
        if (!Object.values(dbColForHeader).includes(dbCol) && headers.includes(dbCol)) dbColForHeader[dbCol] = dbCol;
    }

    let queued = 0, skipped = 0;
    for (const sheetRow of rows) {
        const candidate = {};
        for (const [sheetHeader, dbCol] of Object.entries(dbColForHeader)) {
            if (Object.prototype.hasOwnProperty.call(sheetRow, sheetHeader)) candidate[dbCol] = sheetRow[sheetHeader];
        }
        // A sheet can't be trusted to know its own company_id — force it from the
        // connection it was imported through, for any table that has that column directly.
        if (cfg.injectCompanyId) candidate.company_id = mapping.company_id;

        const missingRequired = cfg.required.some((r) => candidate[r] === undefined || candidate[r] === null || candidate[r] === '');
        if (missingRequired) { skipped++; continue; }

        const dedupeKey = cfg.keyColumn && candidate[cfg.keyColumn] ? String(candidate[cfg.keyColumn]) : ('row:' + sheetRow.__row);
        try {
            await GoogleSync.queueReviewRow({ mappingId: mapping.id, dedupeKey, rowData: candidate });
            queued++;
        } catch (e) {
            skipped++; // already queued before (unique index on mapping_id+dedupe_key) — not an error
        }
    }

    await GoogleSync.logSync(mapping.id, 'import', 'success', queued, `${queued} new row(s) queued for review, ${skipped} skipped/duplicate`);
    return { success: true, queued, skipped };
}

async function runSync(mappingId) {
    const mapping = await GoogleSync.findMappingById(mappingId);
    if (!mapping) throw ApiError.notFound('Sync mapping not found');
    try {
        if (mapping.direction === 'export') return await runExport(mapping);
        return await runImport(mapping);
    } catch (e) {
        await GoogleSync.logSync(mappingId, mapping.direction, 'error', 0, e.message);
        throw e;
    }
}

// ---- Review queue ----

async function getReviewQueue(companyId, mappingId) {
    const rows = await GoogleSync.findReviewQueue(companyId, mappingId);
    return rows.map((r) => ({ ...r, tableLabel: (SYNCABLE_TABLES[r.table_name] || {}).label || r.table_name }));
}

async function approveReviewItem(id) {
    const item = await GoogleSync.findReviewItemById(id);
    if (!item) throw ApiError.notFound('Review item not found');
    if (item.status !== 'Pending') throw ApiError.badRequest('This item was already reviewed.');

    const cfg = SYNCABLE_TABLES[item.table_name];
    if (!cfg) throw ApiError.badRequest('Unknown table for this review item.');
    const data = JSON.parse(item.row_data);

    const cols = [...cfg.columns, ...(cfg.injectCompanyId ? ['company_id'] : [])].filter((c) => Object.prototype.hasOwnProperty.call(data, c));
    const placeholders = cols.map(() => '?').join(',');
    const values = cols.map((c) => data[c]);

    let result;
    try {
        result = await db.run(`INSERT INTO ${item.table_name} (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${placeholders})`, values);
    } catch (e) {
        await GoogleSync.resolveReviewItem(id, 'Rejected', 'Insert failed: ' + e.message);
        throw ApiError.badRequest('Insert failed: ' + e.message);
    }
    await GoogleSync.resolveReviewItem(id, 'Approved', `Created ${item.table_name} #${result.insertId}`);
    return { success: true, insertedId: result.insertId };
}

async function rejectReviewItem(id) {
    return GoogleSync.resolveReviewItem(id, 'Rejected', null);
}

module.exports = {
    generateSecret, getAppsScriptTemplate, testConnection,
    addConnection, listConnections, refreshConnectionTabs, deleteConnection, getTabHeaders,
    getSyncableTables, saveMapping, listMappings, deleteMapping,
    runSync, getReviewQueue, approveReviewItem, rejectReviewItem,
};
