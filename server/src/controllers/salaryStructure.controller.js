const genericController = require('./genericController');
const salaryStructureService = require('../services/salaryStructure.service');

module.exports = {
    ...genericController(salaryStructureService),

    listComponents: async (req, res) => {
        res.json(await salaryStructureService.listComponents(req.params.id));
    },
    addComponent: async (req, res) => {
        res.status(201).json(await salaryStructureService.addComponent(req.params.id, req.body || {}));
    },
    updateComponent: async (req, res) => {
        res.json(await salaryStructureService.updateComponent(req.params.componentId, req.body || {}));
    },
    removeComponent: async (req, res) => {
        await salaryStructureService.removeComponent(req.params.componentId);
        res.status(204).end();
    },
    applyToEmployee: async (req, res) => {
        res.json(await salaryStructureService.applyToEmployee(req.params.id, req.body?.employeeId));
    },
};
