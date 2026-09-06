const nodemailer = require('nodemailer');
const env = require('../config/env');
const db = require('../config/db');

// Real SMTP if configured; otherwise a JSON transport that never touches the network and
// just hands the composed message back — lets "send an email" work end-to-end in dev/demo
// environments without silently pretending mail went out. Built once and reused (creating
// a transporter per-send is wasteful and, for real SMTP, re-negotiates a connection every time).
const transporter = env.smtp.host
    ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
    : nodemailer.createTransport({ jsonTransport: true });

const isLive = !!env.smtp.host;

/**
 * @param {{ to: string, subject: string, html: string, template?: string, employeeId?: number }} opts
 */
async function send({ to, subject, html, template, employeeId }) {
    if (!to) return { sent: false, reason: 'No recipient address' };

    let status = isLive ? 'Sent' : 'Logged';
    let error = null;

    try {
        await transporter.sendMail({ from: env.smtp.from, to, subject, html });
        if (!isLive) {
            console.log(`[mailer] SMTP not configured — logged instead of sent. To: ${to} | Subject: ${subject}`);
        }
    } catch (err) {
        status = 'Failed';
        error = err.message;
        console.error(`[mailer] Failed to send to ${to}:`, err.message);
    }

    await db.run(
        'INSERT INTO email_log (to_address, subject, template, employee_id, status, error) VALUES (?,?,?,?,?,?)',
        [to, subject, template || null, employeeId || null, status, error]
    );

    return { sent: status !== 'Failed', status };
}

module.exports = { send, isLive };
