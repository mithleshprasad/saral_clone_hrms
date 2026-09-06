const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl: env.db.ssl,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
});

async function get(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows[0];
}

async function all(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

async function run(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
}

module.exports = { pool, get, all, run };
