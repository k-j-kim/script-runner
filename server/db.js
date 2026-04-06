import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'scripts.sqlite'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('scheduled', 'test')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    exit_code INTEGER,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    stream TEXT NOT NULL CHECK(stream IN ('stdout', 'stderr')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_runs_script_id ON runs(script_id);
  CREATE INDEX IF NOT EXISTS idx_logs_run_id ON logs(run_id);
`);

// Prepared statements for scripts
export const scriptsDb = {
  getAll: db.prepare('SELECT * FROM scripts ORDER BY created_at DESC'),

  getById: db.prepare('SELECT * FROM scripts WHERE id = ?'),

  getEnabled: db.prepare('SELECT * FROM scripts WHERE enabled = 1'),

  create: db.prepare(`
    INSERT INTO scripts (name, filename, cron_expression, enabled)
    VALUES (?, ?, ?, ?)
  `),

  update: db.prepare(`
    UPDATE scripts
    SET name = ?, filename = ?, cron_expression = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateMetadata: db.prepare(`
    UPDATE scripts
    SET name = ?, cron_expression = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  delete: db.prepare('DELETE FROM scripts WHERE id = ?')
};

// Prepared statements for runs
export const runsDb = {
  getById: db.prepare('SELECT * FROM runs WHERE id = ?'),

  getByScriptId: db.prepare(`
    SELECT * FROM runs
    WHERE script_id = ?
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `),

  countByScriptId: db.prepare('SELECT COUNT(*) as count FROM runs WHERE script_id = ?'),

  getLastByScriptId: db.prepare(`
    SELECT * FROM runs
    WHERE script_id = ?
    ORDER BY started_at DESC
    LIMIT 1
  `),

  create: db.prepare(`
    INSERT INTO runs (script_id, type, started_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `),

  finish: db.prepare(`
    UPDATE runs
    SET finished_at = CURRENT_TIMESTAMP, exit_code = ?
    WHERE id = ?
  `)
};

// Prepared statements for logs
export const logsDb = {
  getByRunId: db.prepare(`
    SELECT * FROM logs
    WHERE run_id = ?
    ORDER BY created_at ASC
  `),

  create: db.prepare(`
    INSERT INTO logs (run_id, stream, content, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `)
};

export default db;
