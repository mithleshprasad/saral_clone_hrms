let current = null;

function set(user) {
    current = user ? { id: user.id, username: user.username, role: user.role, employee_id: user.employee_id } : null;
}

function get() {
    return current;
}

function clear() {
    current = null;
}

function isAdmin() {
    return !!current && String(current.role).toLowerCase() === 'admin';
}

module.exports = { set, get, clear, isAdmin };
