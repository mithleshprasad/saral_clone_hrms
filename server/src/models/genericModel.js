const db = require('../config/db');

/**
 * Data-access factory for simple lookup tables (one auto-increment id, a flat list of
 * writable columns, optionally scoped by a single filter column like company_id).
 * Table/column names below are hardcoded per-caller in each resource's model file —
 * never derived from request input — so string interpolation here is safe.
 */
function genericModel(table, fields, { orderBy = 'id', filterColumn = null } = {}) {
    return {
        table,
        fields,
        filterColumn,

        async findAll(filterValue) {
            if (filterColumn && filterValue !== undefined && filterValue !== null && filterValue !== '') {
                return db.all(`SELECT * FROM ${table} WHERE ${filterColumn} = ? ORDER BY ${orderBy}`, [filterValue]);
            }
            return db.all(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
        },

        async findById(id) {
            return db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        },

        async create(data) {
            const values = fields.map((f) => (data[f] !== undefined ? data[f] : null));
            const { insertId } = await db.run(
                `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
                values
            );
            return this.findById(insertId);
        },

        async update(id, data) {
            const updates = fields.filter((f) => f in data);
            if (updates.length === 0) return this.findById(id);
            await db.run(
                `UPDATE ${table} SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
                [...updates.map((f) => data[f]), id]
            );
            return this.findById(id);
        },

        async remove(id) {
            await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
        },
    };
}

module.exports = genericModel;
