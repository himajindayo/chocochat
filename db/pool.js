'use strict';
const { Pool } = require('pg');

function parsePositiveInt(value, fallback) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}

function getPoolConfig() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL が未設定です');
    }
    const useSsl = process.env.DATABASE_SSL === 'true';
    return {
        connectionString,
        connectionTimeoutMillis: parsePositiveInt(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 5_000),
        idleTimeoutMillis: parsePositiveInt(process.env.PGPOOL_IDLE_TIMEOUT_MS, 10_000),
        max: parsePositiveInt(process.env.PGPOOL_MAX, 20),
        query_timeout: parsePositiveInt(process.env.PGPOOL_QUERY_TIMEOUT_MS, 10_000),
        ssl: useSsl,
    };
}
function createPool() {
    return new Pool(getPoolConfig());
}
module.exports = {
    createPool,
};
