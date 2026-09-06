const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
    console.log(`[license-server] MpxHR License Server listening on http://localhost:${env.port}`);
});
