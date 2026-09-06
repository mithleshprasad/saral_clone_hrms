const genericService = require('./genericService');
const LeaveType = require('../models/LeaveType.model');

module.exports = genericService(LeaveType, 'Leave type');
