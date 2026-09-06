const genericController = require('./genericController');
const subscriptionPlanService = require('../services/subscriptionPlan.service');

module.exports = genericController(subscriptionPlanService);
