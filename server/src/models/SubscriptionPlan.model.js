const genericModel = require('./genericModel');

module.exports = genericModel(
    'subscription_plans',
    ['name', 'code', 'price_per_month', 'price_per_year', 'max_employees', 'max_companies', 'features', 'is_active'],
    { orderBy: 'price_per_month' }
);
