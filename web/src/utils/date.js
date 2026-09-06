// `new Date().toISOString().split('T')[0]` converts to UTC before taking the calendar date —
// for a browser in IST (UTC+5:30, the overwhelmingly likely timezone for this app's users),
// that silently shows "yesterday" as today's default for the first 5.5 hours of every local
// day. Use local calendar fields instead — same fix as the server-side date bugs this session.
export function todayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
