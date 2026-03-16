const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../splitstack.db')

const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Create tables ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    location    TEXT    DEFAULT '',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    initials    TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id     INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description  TEXT    NOT NULL,
    amount       REAL    NOT NULL,
    category     TEXT    DEFAULT 'Other',
    paid_by      INTEGER NOT NULL REFERENCES members(id),
    split_method TEXT    DEFAULT 'Equal',
    created_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expense_splits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount_owed REAL    NOT NULL
  );
`)

console.log('Database ready at', DB_PATH)

module.exports = db
