const ApiError = require('../utils/ApiError');

// ESS routes operate on "my own records" — the JWT must belong to a user linked to an
// employee record (users.employee_id), otherwise there's no "self" to scope queries to.
module.exports = function requireEmployeeLink(req, res, next) {
    if (!req.user?.employeeId) {
        return next(ApiError.forbidden('This account is not linked to an employee record'));
    }
    next();
};
