const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',                   // your DB username
  host: 'localhost',
  database: 'trapiche_profiling',     // your DB name
  password: '12345',          // your DB password
  port: 5433                          // your DB port
});

module.exports = pool;