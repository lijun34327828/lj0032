const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'club.db');
let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      gender TEXT,
      birth_date TEXT,
      join_date TEXT NOT NULL,
      level TEXT DEFAULT '普通',
      status TEXT DEFAULT '正常',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      route TEXT NOT NULL,
      distance REAL,
      difficulty TEXT DEFAULT '中等',
      max_participants INTEGER NOT NULL,
      current_participants INTEGER DEFAULT 0,
      gather_time TEXT NOT NULL,
      gather_place TEXT NOT NULL,
      fee REAL DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT '报名中',
      created_by TEXT,
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      register_time TEXT DEFAULT (datetime('now', 'localtime')),
      status TEXT DEFAULT '已报名',
      cancel_time TEXT,
      cancel_reason TEXT,
      UNIQUE(activity_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      activity_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      check_in_time TEXT DEFAULT (datetime('now', 'localtime')),
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      serial_no TEXT UNIQUE,
      purchase_date TEXT,
      purchase_price REAL,
      total_stock INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT '正常',
      hourly_rate REAL NOT NULL DEFAULT 0,
      daily_rate REAL NOT NULL DEFAULT 0,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      activity_id INTEGER,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      actual_return_time TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_type TEXT DEFAULT 'hour',
      unit_price REAL NOT NULL,
      total_fee REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT '已预约',
      overdue_fee REAL DEFAULT 0,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS damage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      rental_id INTEGER,
      member_id INTEGER,
      report_time TEXT DEFAULT (datetime('now', 'localtime')),
      description TEXT NOT NULL,
      severity TEXT DEFAULT '轻微',
      repair_cost REAL DEFAULT 0,
      status TEXT DEFAULT '待处理',
      handler TEXT,
      remark TEXT
    );
  `);

  saveDB();
  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

function rowToObject(row, columns) {
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

function run(sql, params = []) {
  db.run(sql, params);
  const lastId = query('SELECT last_insert_rowid() as id')[0].id;
  const changes = query('SELECT changes() as cnt')[0].cnt;
  saveDB();
  return { lastInsertRowid: lastId, changes: changes };
}

module.exports = {
  initDB,
  query,
  queryOne,
  run,
  saveDB
};
