const genericService = require('./genericService');
const SubscriptionPlan = require('../models/SubscriptionPlan.model');

module.exports = genericService(SubscriptionPlan, 'Subscription plan');
