const env = require('../config/env');
const db = require('../config/db');

const isLive = !!env.sms.apiUrl;

/**
 * @param {{ to: string, message: string, template?: string, employeeId?: number }} opts
 */
async function send({ to, message, template, employeeId }) {
    if (!to) return { sent: false, reason: 'No recipient number' };

    let status = isLive ? 'Sent' : 'Logged';
    let error = null;

    if (isLive) {
        try {
            const res = await fetch(env.sms.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(env.sms.apiKey ? { Authorization: `Bearer ${env.sms.apiKey}` } : {}),
                },
                body: JSON.stringify({ to, message, sender: env.sms.sender }),
            });
            if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
        } catch (err) {
            status = 'Failed';
            error = err.message;
            console.error(`[sms] Failed to send to ${to}:`, err.message);
        }
    } else {
        console.log(`[sms] SMS_API_URL not configured — logged instead of sent. To: ${to} | ${message}`);
    }

    await db.run(
        'INSERT INTO sms_log (to_number, message, template, employee_id, status, error) VALUES (?,?,?,?,?,?)',
        [to, message, template || null, employeeId || null, status, error]
    );

    return { sent: status !== 'Failed', status };
}

module.exports = { send, isLive };
