const genericController = require('./genericController');
const jobService = require('../services/job.service');

module.exports = genericController(jobService);
