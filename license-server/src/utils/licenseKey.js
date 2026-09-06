const crypto = require('crypto');

// MPXHR-XXXX-XXXX-XXXX-XXXX — 16 random uppercase-hex characters grouped for readability,
// prefixed so a key is recognizable at a glance in logs/support tickets.
function generateLicenseKey() {
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16 hex chars
    const groups = raw.match(/.{1,4}/g);
    return `MPXHR-${groups.join('-')}`;
}

module.exports = { generateLicenseKey };
