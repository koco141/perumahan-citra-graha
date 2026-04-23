import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./server/citragraha.sqlite');

db.serialize(() => {
  db.run("DROP TABLE IF EXISTS warga");
  db.run("DROP TABLE IF EXISTS transactions");
  db.run("DROP TABLE IF EXISTS guests");
  db.run("DROP TABLE IF EXISTS security_tasks");
  db.run("DROP TABLE IF EXISTS news");
  db.run("DROP TABLE IF EXISTS pengurus");

  db.run(`CREATE TABLE warga (
    id TEXT PRIMARY KEY,
    blok TEXT,
    nomor TEXT,
    nama TEXT,
    bayar TEXT
  )`);

  db.run(`CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    tanggal TEXT,
    tipe TEXT,
    kategori TEXT,
    keterangan TEXT,
    jumlah INTEGER
  )`);

  db.run(`CREATE TABLE guests (
    id TEXT PRIMARY KEY,
    nama TEXT,
    kendaraan TEXT,
    tujuan TEXT,
    jam TEXT,
    kategori TEXT
  )`);

  db.run(`CREATE TABLE security_tasks (
    id INTEGER PRIMARY KEY,
    label TEXT,
    done INTEGER
  )`);

  db.run(`CREATE TABLE news (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    desc TEXT,
    img TEXT,
    date TEXT
  )`);

  db.run(`CREATE TABLE pengurus (
    id TEXT PRIMARY KEY,
    nama TEXT,
    jabatan TEXT,
    no TEXT
  )`);

  console.log("Database initialized with fresh schema.");
});
