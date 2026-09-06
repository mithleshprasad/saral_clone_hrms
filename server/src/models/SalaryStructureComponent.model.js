const db = require('../config/db');

const FIELDS = [
    'structure_id', 'salary_head_id', 'print_name', 'valid_from', 'valid_to',
    'calc_basis', 'calc_type', 'calc_value', 'formula',
    'consider_for_pf', 'consider_for_esi', 'consider_for_pt', 'round_off', 'display_order', 'remarks',
];

const SalaryStructureComponent = {
    async listByStructure(structureId) {
        return db.all(
            `SELECT sc.*, sh.name as salary_head_name, sh.code as salary_head_code, sh.type as salary_head_type
             FROM salary_structure_components sc
             JOIN salary_heads sh ON sc.salary_head_id = sh.id
             WHERE sc.structure_id = ?
             ORDER BY sc.display_order, sc.id`,
            [structureId]
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM salary_structure_components WHERE id = ?', [id]);
    },

    async create(data) {
        const values = FIELDS.map((f) => (data[f] !== undefined ? data[f] : null));
        const { insertId } = await db.run(
            `INSERT INTO salary_structure_components (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`,
            values
        );
        return this.findById(insertId);
    },

    async update(id, data) {
        const updates = FIELDS.filter((f) => f in data);
        if (updates.length === 0) return this.findById(id);
        await db.run(
            `UPDATE salary_structure_components SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
            [...updates.map((f) => data[f]), id]
        );
        return this.findById(id);
    },

    async remove(id) {
        await db.run('DELETE FROM salary_structure_components WHERE id = ?', [id]);
    },
};

module.exports = SalaryStructureComponent;
