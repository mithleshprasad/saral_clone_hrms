const fs = require('fs');
const path = require('path');

const MAX_LOG_BYTES = 5 * 1024 * 1024;
let logFilePath = null;
let initialized = false;

function timestamp() {
    return new Date().toISOString();
}

function writeLine(level, args) {
    if (!logFilePath) return;
    try {
        if (fs.existsSync(logFilePath) && fs.statSync(logFilePath).size > MAX_LOG_BYTES) {
            fs.renameSync(logFilePath, logFilePath + '.old');
        }
        const msg = args.map(a => {
            if (a instanceof Error) return a.stack || a.message;
            if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
            return String(a);
        }).join(' ');
        fs.appendFileSync(logFilePath, `[${timestamp()}] [${level}] ${msg}\n`);
    } catch (e) {
        // Never let logging crash the app
    }
}

function init(userDataPath) {
    if (initialized) return logFilePath;
    const logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    logFilePath = path.join(logsDir, 'app.log');
    initialized = true;

    const orig = { log: console.log, warn: console.warn, error: console.error };
    console.log = (...args) => { orig.log(...args); writeLine('INFO', args); };
    console.warn = (...args) => { orig.warn(...args); writeLine('WARN', args); };
    console.error = (...args) => { orig.error(...args); writeLine('ERROR', args); };

    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
    });
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
    });

    console.log('Logger initialized at', logFilePath);
    return logFilePath;
}

module.exports = { init, getLogFilePath: () => logFilePath };
