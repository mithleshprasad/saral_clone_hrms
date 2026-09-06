const db = require('../config/db');

function parseLicense(row) {
    if (!row) return row;
    const out = { ...row };
    if (out.features !== undefined && typeof out.features === 'string') out.features = JSON.parse(out.features);
    return out;
}

const SELECT_WITH_PLAN = `
    SELECT l.*, p.name AS plan_name, p.max_companies, p.max_employees, p.monthly_price_inr, p.features, p.price_notes AS plan_price_notes
    FROM licenses l JOIN license_plans p ON p.id = l.plan_id`;

module.exports = {
    async findAll() {
        const rows = await db.all(`${SELECT_WITH_PLAN} ORDER BY l.created_at DESC`);
        return rows.map(parseLicense);
    },

    async findById(id) {
        return parseLicense(await db.get(`${SELECT_WITH_PLAN} WHERE l.id = ?`, [id]));
    },

    async findByKey(licenseKey) {
        return parseLicense(await db.get(`${SELECT_WITH_PLAN} WHERE l.license_key = ?`, [licenseKey]));
    },

    async create({ client_name, contact_email, license_key, plan_id, issued_at, expires_at, notes }) {
        const { insertId } = await db.run(
            `INSERT INTO licenses (client_name, contact_email, license_key, plan_id, issued_at, expires_at, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [client_name, contact_email ?? null, license_key, plan_id, issued_at, expires_at, notes ?? null]
        );
        return this.findById(insertId);
    },

    async update(id, { client_name, contact_email, plan_id, expires_at, notes }) {
        await db.run(
            `UPDATE licenses SET client_name = ?, contact_email = ?, plan_id = ?, expires_at = ?, notes = ? WHERE id = ?`,
            [client_name, contact_email ?? null, plan_id, expires_at, notes ?? null, id]
        );
        return this.findById(id);
    },

    async setStatus(id, status) {
        await db.run('UPDATE licenses SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    },

    // Recording a payment both reactivates the license (undoing any Suspended/Revoked
    // state, same as the vendor deciding to let the client back in) and pushes expires_at
    // out in one step — this is what "recording a transaction" atomically does.
    async extendAndActivate(id, newExpiresAt) {
        await db.run("UPDATE licenses SET status = 'Active', expires_at = ? WHERE id = ?", [newExpiresAt, id]);
        return this.findById(id);
    },

    async recordCheckin(id, ip) {
        await db.run('UPDATE licenses SET last_checkin_at = NOW(), last_checkin_ip = ? WHERE id = ?', [ip ?? null, id]);
    },

    async remove(id) {
        return db.run('DELETE FROM licenses WHERE id = ?', [id]);
    },
};
