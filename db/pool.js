'use strict';
const { Pool } = require('pg');
function getPoolConfig() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL が未設定です');
    }
    const useSsl = process.env.DATABASE_SSL === 'true';
    return {
        connectionString,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 10_000,
        max: 20,
        query_timeout: 10_000,
        ssl: useSsl,
    };
}
function createPool() {
    return new Pool(getPoolConfig());
}
module.exports = {
    createPool,
};
