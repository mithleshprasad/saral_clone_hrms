const genericRouter = require('./genericRouter');
const attendanceConfigController = require('../controllers/attendanceConfig.controller');

module.exports = genericRouter(attendanceConfigController);
