const genericRouter = require('./genericRouter');
const positionController = require('../controllers/position.controller');

module.exports = genericRouter(positionController);
