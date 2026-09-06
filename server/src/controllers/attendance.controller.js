const attendanceService = require('../services/attendance.service');

module.exports = {
    list: async (req, res) => {
        res.json(await attendanceService.list(req.query));
    },
    create: async (req, res) => {
        res.status(201).json(await attendanceService.create(req.body || {}));
    },
    upsertManual: async (req, res) => {
        res.status(201).json(await attendanceService.upsertManual(req.body || {}));
    },
    bulk: async (req, res) => {
        const rows = Array.isArray(req.body) ? req.body : (req.body?.rows || []);
        res.json(await attendanceService.bulkUpsert(rows));
    },
    punchImport: async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file)' });
        res.json(await attendanceService.punchImport(req.file.buffer, { companyId: req.body.companyId }));
    },
    update: async (req, res) => {
        res.json(await attendanceService.update(req.params.id, req.body || {}));
    },
    remove: async (req, res) => {
        await attendanceService.remove(req.params.id);
        res.status(204).end();
    },
    checkIn: async (req, res) => {
        res.status(201).json(await attendanceService.checkIn(req.params.employeeId));
    },
    checkOut: async (req, res) => {
        res.json(await attendanceService.checkOut(req.params.employeeId));
    },
};
