const mysql = require("mysql2/promise");
const dbConfig = require("./db.config");

const DB_CONFIG = {
  ...dbConfig,
  ssl: { rejectUnauthorized: false },
};

async function getConnection() {
  return mysql.createConnection(DB_CONFIG);
}

module.exports = { getConnection };
