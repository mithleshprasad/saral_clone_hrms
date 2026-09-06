const genericController = require('./genericController');
const attendanceConfigService = require('../services/attendanceConfig.service');

module.exports = genericController(attendanceConfigService);
