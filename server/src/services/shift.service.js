const genericService = require('./genericService');
const Shift = require('../models/Shift.model');

module.exports = genericService(Shift, 'Shift');
