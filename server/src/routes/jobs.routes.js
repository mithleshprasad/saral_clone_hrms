const genericRouter = require('./genericRouter');
const jobController = require('../controllers/job.controller');

module.exports = genericRouter(jobController);
