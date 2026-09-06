const db = require('../config/db');

function parsePlan(row) {
    if (!row) return row;
    return { ...row, features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features };
}

module.exports = {
    async findAll() {
        const rows = await db.all('SELECT * FROM license_plans ORDER BY id');
        return rows.map(parsePlan);
    },

    async findById(id) {
        return parsePlan(await db.get('SELECT * FROM license_plans WHERE id = ?', [id]));
    },

    async findByName(name) {
        return parsePlan(await db.get('SELECT * FROM license_plans WHERE name = ?', [name]));
    },

    async create({ name, max_companies, max_employees, monthly_price_inr, features, price_notes }) {
        const { insertId } = await db.run(
            'INSERT INTO license_plans (name, max_companies, max_employees, monthly_price_inr, features, price_notes) VALUES (?, ?, ?, ?, ?, ?)',
            [name, max_companies ?? null, max_employees ?? null, monthly_price_inr ?? null, JSON.stringify(features || []), price_notes ?? null]
        );
        return this.findById(insertId);
    },

    async update(id, { name, max_companies, max_employees, monthly_price_inr, features, price_notes }) {
        await db.run(
            'UPDATE license_plans SET name = ?, max_companies = ?, max_employees = ?, monthly_price_inr = ?, features = ?, price_notes = ? WHERE id = ?',
            [name, max_companies ?? null, max_employees ?? null, monthly_price_inr ?? null, JSON.stringify(features || []), price_notes ?? null, id]
        );
        return this.findById(id);
    },

    async remove(id) {
        return db.run('DELETE FROM license_plans WHERE id = ?', [id]);
    },
};
