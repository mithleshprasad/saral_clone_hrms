const genericService = require('./genericService');
const Department = require('../models/Department.model');

module.exports = genericService(Department, 'Department');
