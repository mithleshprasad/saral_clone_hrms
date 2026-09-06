const genericController = require('./genericController');
const shiftService = require('../services/shift.service');

module.exports = genericController(shiftService);
