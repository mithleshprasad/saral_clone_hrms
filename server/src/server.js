const app = require('./app');
const env = require('./config/env');
const licenseGuard = require('./services/licenseGuard.service');

app.listen(env.port, () => {
    console.log(`[server] MpxHR API listening on http://localhost:${env.port}`);
    licenseGuard.startPeriodicCheckIn();
});
