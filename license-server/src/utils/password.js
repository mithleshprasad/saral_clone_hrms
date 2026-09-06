const crypto = require('crypto');

const KEY_LEN = 64;

function hashPassword(plain) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(plain), salt, KEY_LEN).toString('hex');
    return `scrypt:${salt}:${hash}`;
}

function isHashed(stored) {
    return typeof stored === 'string' && stored.startsWith('scrypt:');
}

function verifyPassword(plain, stored) {
    if (!isHashed(stored)) return false;
    const [, salt, hash] = stored.split(':');
    const candidate = crypto.scryptSync(String(plain), salt, KEY_LEN);
    const expected = Buffer.from(hash, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
}

module.exports = { hashPassword, isHashed, verifyPassword };
