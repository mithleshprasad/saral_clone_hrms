const FnfSettlement = require('../models/FnfSettlement.model');
const ApiError = require('../utils/ApiError');

async function recomputeTotals(settlementId) {
    const items = await FnfSettlement.listItems(settlementId);
    const totalEarnings = items.filter((i) => i.type === 'Earning').reduce((s, i) => s + Number(i.modified_amount), 0);
    const totalDeductions = items.filter((i) => i.type === 'Deduction').reduce((s, i) => s + Number(i.modified_amount), 0);
    const settlement = await FnfSettlement.findById(settlementId);
    const net = totalEarnings + Number(settlement.gratuity_amount || 0) + Number(settlement.leave_encashment_amount || 0) - totalDeductions;
    await FnfSettlement.updateTotals(settlementId, totalEarnings, totalDeductions, net);
    return FnfSettlement.findById(settlementId);
}

module.exports = {
    async list({ employeeId, companyId } = {}) {
        return FnfSettlement.list({ employeeId, companyId });
    },

    async get(id) {
        const settlement = await FnfSettlement.findById(id);
        if (!settlement) throw ApiError.notFound('Settlement not found');
        const items = await FnfSettlement.listItems(id);
        return { ...settlement, items };
    },

    // Creates the settlement shell, then seeds earning/deduction line items from the
    // employee's last payroll run and any pending loan balances, per the include_* flags —
    // mirrors the "Create Full & Final Settlement" wizard (last month salary / pending
    // advance / pending loan checkboxes).
    async create(data) {
        if (!data.employee_id) throw ApiError.badRequest('employee_id is required');

        const id = await FnfSettlement.create({ ...data, status: 'Draft' });

        if (data.include_last_month_salary) {
            const payroll = await FnfSettlement.lastPayrollRecord(data.employee_id);
            if (payroll) {
                const earnings = [
                    ['Basic', payroll.basic_salary], ['DA', payroll.da], ['HRA', payroll.hra],
                    ['Conveyance', payroll.conveyance], ['Medical', payroll.medical],
                    ['Special Allowance', payroll.special_allowance], ['Bonus', payroll.bonuses],
                ];
                for (const [description, amount] of earnings) {
                    if (Number(amount) > 0) await FnfSettlement.addItem(id, { type: 'Earning', description, actual_amount: amount });
                }
                const deductions = [
                    ['PF (Employee)', payroll.employee_pf], ['ESI (Employee)', payroll.employee_esi],
                    ['Professional Tax', payroll.professional_tax], ['TDS', payroll.tds],
                ];
                for (const [description, amount] of deductions) {
                    if (Number(amount) > 0) await FnfSettlement.addItem(id, { type: 'Deduction', description, actual_amount: amount });
                }
            }
        }

        if (data.include_pending_loan) {
            const loans = await FnfSettlement.pendingLoans(data.employee_id);
            for (const loan of loans) {
                await FnfSettlement.addItem(id, { type: 'Deduction', description: `Loan balance: ${loan.loan_type}`, actual_amount: loan.balance });
            }
        }

        return recomputeTotals(id);
    },

    async update(id, data) {
        const existing = await FnfSettlement.findById(id);
        if (!existing) throw ApiError.notFound('Settlement not found');
        await FnfSettlement.update(id, data);
        return recomputeTotals(id);
    },

    async remove(id) {
        await FnfSettlement.remove(id);
    },

    async addItem(settlementId, item) {
        if (!item.type || !item.description) throw ApiError.badRequest('type and description are required');
        await FnfSettlement.addItem(settlementId, item);
        return recomputeTotals(settlementId);
    },

    async updateItem(settlementId, itemId, item) {
        await FnfSettlement.updateItem(itemId, item);
        return recomputeTotals(settlementId);
    },

    async removeItem(settlementId, itemId) {
        await FnfSettlement.removeItem(itemId);
        return recomputeTotals(settlementId);
    },

    async finalize(id) {
        const existing = await FnfSettlement.findById(id);
        if (!existing) throw ApiError.notFound('Settlement not found');
        await FnfSettlement.update(id, { status: 'Created' });
        return FnfSettlement.findById(id);
    },
};
