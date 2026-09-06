const genericController = require('./genericController');
const leaveTypeService = require('../services/leaveType.service');

module.exports = genericController(leaveTypeService);
