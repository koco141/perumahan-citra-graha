import db from './db.js';

db.serialize(() => {
  // Seed Warga
  db.run(`INSERT OR IGNORE INTO warga (id, blok, nomor, nama, bayar) VALUES 
    ('1', 'A', '01', 'BUDI SANTOSO', '${JSON.stringify({ [new Date().getFullYear()]: Array(12).fill(false) })}'),
    ('2', 'B', '05', 'SITI AMINAH', '${JSON.stringify({ [new Date().getFullYear()]: Array(12).fill(false) })}')
  `);

  // Seed News
  db.run(`INSERT OR IGNORE INTO news (id, title, category, desc, img, date) VALUES 
    ('1', 'Kerja Bakti Minggu Ini', 'Kegiatan', 'Diharapkan seluruh warga berkumpul di balai warga jam 08:00.', 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=1000', '16 April 2026')
  `);

  // Seed Pengurus
  db.run(`INSERT OR IGNORE INTO pengurus (id, nama, jabatan, no) VALUES 
    ('1', 'Suryo', 'Ketua Perumahan', '08123456789'),
    ('2', 'Budi', 'Sekretaris', '08123456790')
  `);
  
  console.log("Database seeded successfully.");
});
