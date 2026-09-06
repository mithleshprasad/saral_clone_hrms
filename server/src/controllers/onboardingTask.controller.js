const genericController = require('./genericController');
const onboardingTaskService = require('../services/onboardingTask.service');

module.exports = {
    ...genericController(onboardingTaskService),
    toggle: async (req, res) => {
        res.json(await onboardingTaskService.toggle(req.params.id));
    },
};
