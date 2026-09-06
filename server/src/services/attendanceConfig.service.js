const genericService = require('./genericService');
const AttendanceConfig = require('../models/AttendanceConfig.model');

module.exports = genericService(AttendanceConfig, 'Attendance configuration');
