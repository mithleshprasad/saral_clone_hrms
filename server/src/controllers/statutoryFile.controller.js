const service = require('../services/statutoryFile.service');

function send(res, { filename, content }, contentType) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
}

module.exports = {
    musterRollData: async (req, res) => {
        const { companyId, year, month } = req.query;
        res.json(await service.generateMusterRollData({ companyId, year, month }));
    },
    musterRoll: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateMusterRoll({ companyId, year, month }), 'text/csv');
    },
    pfEcr: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generatePfEcr({ companyId, year, month }), 'text/plain');
    },
    esiReturn: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateEsiReturn({ companyId, year, month }), 'text/csv');
    },
    ptRegister: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generatePtRegister({ companyId, year, month }), 'text/csv');
    },
    lwfRegister: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateLwfRegister({ companyId, year, month }), 'text/csv');
    },
    bonusRegister: async (req, res) => {
        const { companyId, financialYear, bonusPercent } = req.query;
        send(res, await service.generateBonusRegister({ companyId, financialYear, bonusPercent }), 'text/csv');
    },
    gratuityRegister: async (req, res) => {
        const { companyId, asOfDate } = req.query;
        send(res, await service.generateGratuityRegister({ companyId, asOfDate }), 'text/csv');
    },
    form24Q: async (req, res) => {
        const { companyId, financialYear, quarter } = req.query;
        send(res, await service.generateForm24Q({ companyId, financialYear, quarter }), 'text/csv');
    },
    form24QNsdl: async (req, res) => {
        const { companyId, financialYear, quarter, bsrCode, challanNumber, challanDate, challanAmount } = req.query;
        send(res, await service.generateForm24QNsdl({ companyId, financialYear, quarter, bsrCode, challanNumber, challanDate, challanAmount }), 'text/plain');
    },
    form3A: async (req, res) => {
        const { companyId, financialYear } = req.query;
        send(res, await service.generateForm3A({ companyId, financialYear }), 'text/csv');
    },
    form5: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateForm5({ companyId, year, month }), 'text/csv');
    },
    form10: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateForm10({ companyId, year, month }), 'text/csv');
    },
    bankFileSbi: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateBankFileSbi({ companyId, year, month }), 'text/csv');
    },
    bankFileHdfc: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateBankFileHdfc({ companyId, year, month }), 'text/csv');
    },
    bankFileIcici: async (req, res) => {
        const { companyId, year, month } = req.query;
        send(res, await service.generateBankFileIcici({ companyId, year, month }), 'text/csv');
    },
};
