const genericService = require('./genericService');
const Holiday = require('../models/Holiday.model');

module.exports = genericService(Holiday, 'Holiday');
