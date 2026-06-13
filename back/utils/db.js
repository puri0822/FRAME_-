const mysql = require("mysql2/promise");
require("dotenv").config();

const DB_CONFIG = {
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:      { rejectUnauthorized: false },
};

async function getConnection() {
  return mysql.createConnection(DB_CONFIG);
}

module.exports = { getConnection };
