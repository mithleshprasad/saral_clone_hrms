// Encrypts small secrets (Google Sheet sync shared-secrets) before they're written to the
// database as TEXT. AES-256-GCM keyed off ENCRYPTION_KEY — unlike password.js's one-way
// scrypt hash, this has to be reversible: the plaintext secret is what's actually POSTed to
// the customer's Apps Script gateway on every sync.
const crypto = require('crypto');
const env = require('../config/env');

// Any passphrase-shaped string works for ENCRYPTION_KEY, same DX as JWT_SECRET — scrypt
// stretches it into a real 32-byte AES-256 key rather than requiring the admin to generate
// and paste a precise hex key.
function deriveKey() {
    return crypto.scryptSync(env.encryptionKey, 'mpxhr-secure-store', 32);
}

function encrypt(plainText) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return 'enc:' + Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(stored) {
    if (!stored) return stored;
    if (!stored.startsWith('enc:')) return stored; // legacy/unrecognized — treat as already-plain
    const buf = Buffer.from(stored.slice('enc:'.length), 'base64');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
