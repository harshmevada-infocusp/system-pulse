import logger from "../logger/logger";

const path = require("path");
const Database = require("better-sqlite3");

let db;

export function initDB() {
  const dbPath = path.join(__dirname, "app.db");

  logger.info(`Initializing database at ${dbPath}`);
  db = new Database(dbPath);
  db.prepare(
    "CREATE TABLE IF NOT EXISTS system_metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, cpu REAL, ram REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)",
  ).run();

  return db;
}

export function insertMetrics({ db, cpu, ram }) {
  const stmt = db.prepare(
    "INSERT INTO system_metrics (cpu, ram) VALUES (?, ?)",
  );
  stmt.run(cpu, ram);
}

export function getRecentMetrics({ db, limit = 100 }) {
  const stmt = db.prepare(
    "SELECT * FROM system_metrics ORDER BY timestamp DESC LIMIT ?",
  );
  return stmt.all(limit);
}
