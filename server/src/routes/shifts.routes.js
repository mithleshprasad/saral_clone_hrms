const genericRouter = require('./genericRouter');
const shiftController = require('../controllers/shift.controller');

module.exports = genericRouter(shiftController);
