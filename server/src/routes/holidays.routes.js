const genericRouter = require('./genericRouter');
const holidayController = require('../controllers/holiday.controller');

module.exports = genericRouter(holidayController);
