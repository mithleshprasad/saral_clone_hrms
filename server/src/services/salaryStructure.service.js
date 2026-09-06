const genericService = require('./genericService');
const SalaryStructure = require('../models/SalaryStructure.model');
const Component = require('../models/SalaryStructureComponent.model');
const Employee = require('../models/Employee.model');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const base = genericService(SalaryStructure, 'Salary structure');

// Maps a salary head's name to the fixed employee column the payroll engine actually
// reads (base_salary/da_rate/hra_rate/...). Anything unrecognized (custom heads) is
// folded into special_allowance_fixed as a lumpsum, since the payroll engine works off
// those named columns rather than a fully dynamic component ledger.
function targetField(headName) {
    const n = (headName || '').toLowerCase();
    if (n.includes('basic')) return 'base_salary';
    if (n === 'da' || n.includes('dearness')) return 'da_rate';
    if (n === 'hra' || n.includes('house rent')) return 'hra_rate';
    if (n.includes('conveyance') || n.includes('transport')) return 'conveyance_allowance';
    if (n.includes('medical')) return 'medical_allowance';
    return 'special_allowance_fixed';
}

function componentAmount(component, employeeBasic) {
    if (component.calc_type === '% of Basic') {
        return Math.round((Number(employeeBasic) || 0) * (Number(component.calc_value) || 0) / 100);
    }
    return Number(component.calc_value) || 0;
}

module.exports = {
    ...base,

    async listComponents(structureId) {
        return Component.listByStructure(structureId);
    },

    async addComponent(structureId, data) {
        if (!data.salary_head_id) throw ApiError.badRequest('salary_head_id is required');
        return Component.create({ ...data, structure_id: structureId });
    },

    async updateComponent(id, data) {
        const existing = await Component.findById(id);
        if (!existing) throw ApiError.notFound('Salary structure component not found');
        return Component.update(id, data);
    },

    async removeComponent(id) {
        await Component.remove(id);
    },

    // Computes each component's amount against the employee's current Basic, then writes
    // the aggregated totals into the employee's salary fields (what the payroll engine
    // actually reads) and remembers which structure produced them.
    async applyToEmployee(structureId, employeeId) {
        const employee = await db.get('SELECT * FROM employees WHERE id = ?', [employeeId]);
        if (!employee) throw ApiError.notFound('Employee not found');

        const components = await Component.listByStructure(structureId);
        if (components.length === 0) throw ApiError.badRequest('This salary structure has no components to apply');

        const totals = { base_salary: 0, da_rate: 0, hra_rate: 0, conveyance_allowance: 0, medical_allowance: 0, special_allowance_fixed: 0 };
        // Basic must be resolved first since % of Basic components depend on it.
        const basicComponent = components.find((c) => targetField(c.salary_head_name) === 'base_salary');
        const basicAmount = basicComponent ? componentAmount(basicComponent, employee.base_salary) : Number(employee.base_salary) || 0;

        for (const c of components) {
            const field = targetField(c.salary_head_name);
            const amount = field === 'base_salary' ? basicAmount : componentAmount(c, basicAmount);
            totals[field] += amount;
        }

        await db.run(
            `UPDATE employees SET
                salary_structure_id = ?, base_salary = ?, da_rate = ?, hra_rate = ?,
                conveyance_allowance = ?, medical_allowance = ?, special_allowance_fixed = ?
             WHERE id = ?`,
            [structureId, totals.base_salary, totals.da_rate, totals.hra_rate, totals.conveyance_allowance, totals.medical_allowance, totals.special_allowance_fixed, employeeId]
        );

        return Employee.findById(employeeId);
    },
};
