import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
});

// Helper: query wrapper
export const query = (text, params) => pool.query(text, params);

// Init semua tabel
export const initDB = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS warga (
      id TEXT PRIMARY KEY,
      blok TEXT,
      nomor TEXT,
      nama TEXT,
      bayar TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      tipe TEXT,
      kategori TEXT,
      jumlah INTEGER,
      keterangan TEXT,
      tanggal TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      nama TEXT,
      kendaraan TEXT,
      tujuan TEXT,
      jam TEXT,
      kategori TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      "desc" TEXT,
      img TEXT,
      date TEXT,
      author TEXT,
      img_caption TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0
    )
  `);

  await query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0`);

  await query(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      news_id TEXT,
      nama TEXT,
      content TEXT,
      date TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pengurus (
      id TEXT PRIMARY KEY,
      nama TEXT,
      jabatan TEXT,
      no TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS security_tasks (
      id SERIAL PRIMARY KEY,
      label TEXT,
      done INTEGER DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      raw_password TEXT,
      nama TEXT,
      role TEXT,
      wa TEXT,
      is_active INTEGER DEFAULT 0,
      current_shift TEXT,
      must_change_password INTEGER DEFAULT 0
    )
  `);

  // Default security tasks jika belum ada
  const { rows: tasks } = await query('SELECT COUNT(*) as count FROM security_tasks');
  if (parseInt(tasks[0].count) === 0) {
    await query(`INSERT INTO security_tasks (label, done) VALUES
      ('Pengecekan Gerbang Utama', 0),
      ('Patroli Keliling', 0),
      ('Pemantauan Lampu Jalan', 0)
    `);
  }

  // Default Super Admin jika belum ada
  const { rows: admins } = await query("SELECT * FROM users WHERE role = 'superadmin'");
  if (admins.length === 0) {
    import('bcryptjs').then(async ({ default: bcrypt }) => {
      const hashed = await bcrypt.hash('admin123', 10);
      await query(
        "INSERT INTO users (id, username, password, raw_password, nama, role) VALUES ($1, $2, $3, $4, $5, $6)",
        ['1', 'admin', hashed, 'admin123', 'Super Admin', 'superadmin']
      );
    });
  }

  console.log('[DB] PostgreSQL tables ready');
};

export default pool;
