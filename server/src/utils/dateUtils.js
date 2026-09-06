// `new Date().toISOString().split('T')[0]` converts to UTC before taking the calendar date —
// on a UTC+ server (e.g. IST, UTC+5:30) that silently rolls the date back to "yesterday" for
// the first 5.5 hours of every local day. Use local calendar fields instead. Same bug class
// already fixed in attendance.service.js's punch importer and shiftRoster.service.js's
// date-range expansion — pulled out here since it kept recurring across services.
function todayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

module.exports = { todayLocal };
