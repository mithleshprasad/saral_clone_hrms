const genericRouter = require('./genericRouter');
const leaveTypeController = require('../controllers/leaveType.controller');

module.exports = genericRouter(leaveTypeController);
