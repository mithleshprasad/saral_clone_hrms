const letterService = require('../services/letter.service');
const pdfService = require('../services/pdf.service');

module.exports = {
    types: (req, res) => {
        res.json(letterService.TYPES);
    },
    listByEmployee: async (req, res) => {
        res.json(await letterService.listByEmployee(req.params.employeeId));
    },
    generate: async (req, res) => {
        const result = await letterService.generate({ ...req.body, generated_by: req.user.id });
        res.status(201).json({ id: result.id, type: result.type });
    },
    download: async (req, res) => {
        const letter = await letterService.getById(req.params.id);
        pdfService.streamLetter(res, {
            title: `${letter.type} Letter`,
            content: letter.content,
            employee: letter.employee,
            company: letter.company,
        });
    },
};
