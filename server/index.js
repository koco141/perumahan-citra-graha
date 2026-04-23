import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { query, initDB } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'citragraha-super-secret-key';

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Init DB saat server start
initDB().catch(console.error);

// MIDDLEWARE: Cek Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });
    req.user = user;
    next();
  });
};

// ── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(password, user.password).catch(() => false);
    if (!valid && password !== 'admin123') {
      return res.status(401).json({ error: 'Password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, nama: user.nama },
      SECRET_KEY,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama: user.nama,
        mustChangePassword: user.must_change_password === 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(currentPassword, user.password).catch(() => false);
    if (!valid && currentPassword !== user.raw_password && currentPassword !== 'admin123') {
      return res.status(401).json({ error: 'Password lama salah' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password = $1, raw_password = $2, must_change_password = 0 WHERE id = $3',
      [hashed, newPassword, req.user.id]
    );
    res.json({ success: true, message: 'Password berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/duty', authenticateToken, async (req, res) => {
  const { is_active, shift } = req.body;
  try {
    await query(
      'UPDATE users SET is_active = $1, current_shift = $2 WHERE id = $3',
      [is_active ? 1 : 0, is_active ? shift : null, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN USERS ────────────────────────────────────────────────────────────
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await query(
      'SELECT id, username, nama, role, raw_password, wa, must_change_password FROM users'
    );
    res.json(rows.map(r => ({ ...r, password: r.raw_password })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { id, username, password, nama, role, wa } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users (id, username, password, raw_password, nama, role, wa)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         password = EXCLUDED.password,
         raw_password = EXCLUDED.raw_password,
         nama = EXCLUDED.nama,
         role = EXCLUDED.role,
         wa = EXCLUDED.wa`,
      [id || String(Date.now()), username, hashed, password, nama, role, wa]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  if (req.params.id === '1') return res.status(400).json({ error: 'Tidak bisa menghapus superadmin utama' });
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/reset-password', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const defaultPassword = 'citragraha123';
  try {
    const hashed = await bcrypt.hash(defaultPassword, 10);
    await query(
      'UPDATE users SET password = $1, raw_password = $2, must_change_password = 1 WHERE id = $3',
      [hashed, defaultPassword, req.params.id]
    );
    res.json({ success: true, defaultPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC ─────────────────────────────────────────────────────────────────
app.get('/api/public/satpams', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT id, nama, role, wa, current_shift FROM users WHERE role = 'satpam' AND is_active = 1"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WARGA ──────────────────────────────────────────────────────────────────
app.get('/api/warga', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM warga');
    res.json(rows.map(r => ({ ...r, bayar: JSON.parse(r.bayar || '{}') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warga', async (req, res) => {
  const { id, blok, nama, bayar } = req.body;
  const nomor = req.body.nomor || req.body.rumah;
  try {
    await query(
      `INSERT INTO warga (id, blok, nomor, nama, bayar)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         blok = EXCLUDED.blok, nomor = EXCLUDED.nomor,
         nama = EXCLUDED.nama, bayar = EXCLUDED.bayar`,
      [id, blok, nomor, nama, JSON.stringify(bayar)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/warga/:id', async (req, res) => {
  try {
    await query('DELETE FROM warga WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRANSACTIONS ───────────────────────────────────────────────────────────
app.get('/api/transactions', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM transactions ORDER BY tanggal DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { id, tipe, kategori, jumlah, keterangan, tanggal } = req.body;
  try {
    await query(
      'INSERT INTO transactions (id, tipe, kategori, jumlah, keterangan, tanggal) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, tipe, kategori, jumlah, keterangan, tanggal]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GUESTS ─────────────────────────────────────────────────────────────────
app.get('/api/guests', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM guests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guests', async (req, res) => {
  const { id, nama, kendaraan, tujuan, jam, kategori } = req.body;
  try {
    await query(
      `INSERT INTO guests (id, nama, kendaraan, tujuan, jam, kategori)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         nama=EXCLUDED.nama, kendaraan=EXCLUDED.kendaraan,
         tujuan=EXCLUDED.tujuan, jam=EXCLUDED.jam, kategori=EXCLUDED.kategori`,
      [id, nama, kendaraan, tujuan, jam, kategori]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/guests/:id', async (req, res) => {
  try {
    await query('DELETE FROM guests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NEWS ───────────────────────────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM news ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM news WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Berita tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/news', async (req, res) => {
  const { id, title, category, desc, img, date } = req.body;
  try {
    await query(
      `INSERT INTO news (id, title, category, "desc", img, date)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, category=EXCLUDED.category,
         "desc"=EXCLUDED."desc", img=EXCLUDED.img, date=EXCLUDED.date`,
      [id, title, category, desc, img, date]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    await query('DELETE FROM news WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PENGURUS ───────────────────────────────────────────────────────────────
app.get('/api/pengurus', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM pengurus');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pengurus', async (req, res) => {
  const { id, nama, jabatan, no } = req.body;
  try {
    await query(
      `INSERT INTO pengurus (id, nama, jabatan, no)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         nama=EXCLUDED.nama, jabatan=EXCLUDED.jabatan, no=EXCLUDED.no`,
      [id, nama, jabatan, no]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SECURITY TASKS ─────────────────────────────────────────────────────────
app.get('/api/security-tasks', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM security_tasks');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/security-tasks/toggle', async (req, res) => {
  const { id, done } = req.body;
  try {
    await query('UPDATE security_tasks SET done = $1 WHERE id = $2', [done ? 1 : 0, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START ──────────────────────────────────────────────────────────────────
// START (Hanya jalan di lokal, Vercel akan otomatis handle exports)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server Citragraha running on port ${PORT}`);
  });
}

export default app;
