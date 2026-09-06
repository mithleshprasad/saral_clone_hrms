const genericController = require('./genericController');
const holidayService = require('../services/holiday.service');

module.exports = genericController(holidayService);
