import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWarga, fetchNews, fetchPengurus, savePengurus, getRelativeTime } from '../api/api';
import { useAuth } from '../context/AuthContext';


const Home = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ warga: 0, berita: 0 });
  const [newsList, setNewsList] = useState([]);
  const [pengurusData, setPengurusData] = useState([]);
  const [showEditPengurus, setShowEditPengurus] = useState(false);
  const [editingPengurus, setEditingPengurus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const canManage = user?.role === 'pengurus' || user?.role === 'superadmin';




  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const wData = await fetchWarga();
      const nData = await fetchNews();
      const pData = await fetchPengurus();

      setCounts({ warga: wData.length, berita: nData.length });
      setNewsList(nData);

      const REQUIRED_JABATAN = [
        { id: '1', nama: 'SURYO', jabatan: 'Ketua Perumahan', no: '08123456789' },
        { id: '2', nama: 'BUDI', jabatan: 'Sekretaris', no: '08123456790' },
        { id: '3', nama: 'DEDI', jabatan: 'Bendahara', no: '087822595073' },
      ];

      let updatedPData = [...(pData || [])];
      let needsSave = false;

      for (const req of REQUIRED_JABATAN) {
        if (!updatedPData.find(p => p.jabatan === req.jabatan)) {
          await savePengurus(req);
          updatedPData.push(req);
          needsSave = true;
        }
      }

      if (needsSave) {
        const finalPData = await fetchPengurus();
        setPengurusData(finalPData);
      } else {
        setPengurusData(updatedPData);
      }
    } catch (err) {
      console.error("Home load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPengurus = (p) => {
    setEditingPengurus({ ...p });
    setShowEditPengurus(true);
  };

  const saveEditPengurus = async (e) => {
    e.preventDefault();
    try {
      await savePengurus(editingPengurus);
      await loadHomeData();
      setShowEditPengurus(false);
    } catch (err) {
      alert("Gagal update pengurus");
    }
  };

  const openNewsDetail = (item) => {
    navigate(`/berita/${item.id}`);
  };

  const beritaTerkini = newsList.slice(0, 3);

  return (
    <div className="page-wrapper">

      {/* ── HERO / SELAMAT DATANG (REDESIGNED) ────────────────────────── */}
      <section className="hero">
        <div className="hero-bg-overlay"></div>
        <div className="hero-container">
          <div className="hero-glass-card">
            <div className="hero-badge">🏘️ Portal Resmi Warga</div>
            <h1 className="hero-title">
              Selamat Datang di<br />
              <span className="hero-highlight">Perumahan Citragraha Tembung</span>
            </h1>
            <p className="hero-desc">
              Semua informasi perumahan ada di sini — keuangan, keamanan, dan berita terkini secara transparan dan akuntabel.
            </p>
            <div className="hero-actions">
              <a href="/rekapitulasi" className="hero-btn primary">
                📊 Lihat Keuangan
              </a>
              <a href="/berita" className="hero-btn video-btn">
                📰 Berita Terkini
              </a>
            </div>
          </div>
          <div className="hero-image-side">
            <img src="/assets/Home1.png" alt="Citragraha Home" className="floating-hero-img" />
          </div>
        </div>
      </section>

      {/* ── STATISTIK CEPAT ───────────────────────────────────────────── */}
      <section className="stat-row">
        <div className="stat-card clickable" onClick={() => navigate('/rekapitulasi')}>
          <div className="stat-icon"><img src="/assets/family.png" alt="KK Terdaftar" className="icon-img" /></div>
          <div className="stat-value">{counts.warga}</div>
          <div className="stat-label">Jumlah Keluarga Terdaftar</div>
        </div>
        <div className="stat-card clickable" onClick={() => navigate('/keamanan')}>
          <div className="stat-icon"><img src="/assets/Keamanan.png" alt="Keamanan" className="icon-img" /></div>
          <div className="stat-value">24/7</div>
          <div className="stat-label">Keamanan Siaga</div>
        </div>
        <div className="stat-card clickable" onClick={() => navigate('/berita')}>
          <div className="stat-icon"><img src="/assets/Berita terbaru.png" alt="Berita Terbaru" className="icon-img" /></div>
          <div className="stat-value">{counts.berita}</div>
          <div className="stat-label">Berita Terbaru</div>
        </div>
      </section>

      {/* ── BERITA TERKINI ────────────────────────────────────────────── */}
      <section className="section" id="berita">
        <div className="section-header-flex">
          <div className="section-header">
            <h2 className="section-title"><img src="/assets/Berita.png" alt="Berita" className="icon-img-title" /> Berita & Pengumuman</h2>
            <p className="section-sub">Informasi terbaru dari lingkungan Perumahan Citragraha Tembung</p>
          </div>
          <a href="/berita" className="btn-view-all">Lihat Semua →</a>
        </div>

        <div className="home-berita-grid">
          {beritaTerkini.length > 0 ? (
            beritaTerkini.map((item) => (
              <div key={item.id} className="h-news-card" onClick={() => openNewsDetail(item)} style={{cursor: 'pointer'}}>
                <div className="h-nc-img" style={{backgroundImage: `url(${item.img})`}}>
                  <span className={`h-nc-cat ${item.category.toLowerCase()}`}>{item.category}</span>
                </div>
                <div className="h-nc-content">
                  <span className="h-nc-date">📅 {getRelativeTime(item.date)}</span>
                  <h3 className="h-nc-title">{item.title}</h3>
                  <p className="h-nc-desc">{item.desc}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-news-empty">
              <div className="h-ne-icon">📰</div>
              <p>Belum ada berita terbaru saat ini.</p>
              {canManage && <a href="/berita" className="h-ne-link">Tambah Berita Pertama →</a>}
            </div>
          )}
        </div>
      </section>

      {/* ── GALERI VIDEO ──────────────────────────────────────────────── */}
      <section className="section" id="galeri-video">
        <div className="section-header">
          <h2 className="section-title"><img src="/assets/Home1.png" alt="Video" className="icon-img-title" style={{borderRadius: '8px'}} /> Profil Perumahan Citragraha</h2>
          <p className="section-sub">Tonton video profil dan suasana lingkungan di Perumahan Citragraha Tembung</p>
        </div>

        <div className="video-gallery-box">
          <div className="video-responsive-wrap">
            <iframe 
              src="https://www.youtube.com/embed/O-in_6kVYKI" 
              title="Video Profil Citragraha"
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      <section className="section" id="pengurus">
        <div className="section-header-flex">
          <div className="section-header">
            <h2 className="section-title"><img src="/assets/Telepon.png" alt="Telepon" className="icon-img-title" /> Hubungi Pengurus Perumahan</h2>
            <p className="section-sub">Butuh bantuan? Langsung hubungi WhatsApp pengurus Perumahan Citra Graha</p>
          </div>
        </div>

        <div className="pengurus-grid">
          {pengurusData.map((p) => (
            <div key={p.id} className="pengurus-card h-p-card">
              {canManage && <button className="h-p-edit" onClick={() => handleEditPengurus(p)} title="Edit Data">✏️</button>}
              <div className="pengurus-icon">
                <img src="/assets/Telepon.png" alt="Kontak" className="icon-img-pengurus" />
              </div>
              <div className="pengurus-info">
                <div className="pengurus-nama">{p.nama}</div>
                <div className="pengurus-jabatan">{p.jabatan}</div>
              </div>
              <a href={`https://wa.me/${p.no?.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="pengurus-wa-btn">
                Chat WhatsApp
              </a>
            </div>
          ))}
        </div>

        {showEditPengurus && editingPengurus && (
          <div className="modal-overlay" onClick={() => setShowEditPengurus(false)}>
            <div className="modal-box p-modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">✏️ Edit Data {editingPengurus.jabatan}</h3>
              <form onSubmit={saveEditPengurus} className="modal-form">
                <div className="f-group">
                  <label>Nama Lengkap</label>
                  <input type="text" placeholder="Masukkan nama..." required 
                    value={editingPengurus.nama} onChange={e => setEditingPengurus({...editingPengurus, nama: e.target.value})} />
                </div>
                <div className="f-group">
                  <label>No. WhatsApp</label>
                  <input type="text" placeholder="Masukkan nomor..." required 
                    value={editingPengurus.no} onChange={e => setEditingPengurus({...editingPengurus, no: e.target.value})} />
                </div>
                <div className="modal-btns">
                  <button type="submit" className="btn-save">✔ Simpan Perubahan</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowEditPengurus(false)}>Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      <section className="section" id="lokasi">
        <div className="section-header">
          <h2 className="section-title">📍 Lokasi Perumahan</h2>
          <p className="section-sub">Jl. Mesjid alfirdaus, perumahan citra graha, Bandar Khalipah, Kec. Percut Sei Tuan, Kabupaten Deli Serdang, Sumatera Utara 20371</p>
        </div>

        <div className="map-box">
          <a
            href="https://share.google/kni1HfCPYWJcH5uBy"
            target="_blank"
            rel="noopener noreferrer"
            className="map-btn"
          >
            🗺️ Buka di Google Maps
          </a>
          <div className="map-frame">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3981.996160163351!2d98.7516942!3d3.5884167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3031317585641753%3A0xc3f170af3669a915!2sPerumahan%20Citra%20Graha%20Tembung!5e0!3m2!1sid!2sid!4v1712800000000!5m2!1sid!2sid"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              title="Lokasi Perumahan Citragraha"
            ></iframe>
          </div>
        </div>
      </section>



      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-title">🏘️ Perumahan Citragraha Tembung</span>
            <p>Portal resmi warga Perumahan Citragraha Tembung</p>
            <p className="footer-tagline">Membangun harmoni, menjaga keamanan, dan mempererat silaturahmi antar warga secara transparan dan akuntabel.</p>
          </div>
          <div className="footer-links">
            <span className="footer-link-title">Halaman Cepat</span>
            <a href="/">🏠 Beranda</a>
            <a href="/rekapitulasi">📊 Keuangan</a>
            <a href="/keamanan">🛡️ Keamanan</a>
            <a href="/berita">📰 Berita</a>
          </div>
        </div>
        <div className="footer-bar">
          © 2026 Perumahan Citra Graha Tembung — Hak Cipta Dilindungi
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .page-wrapper { min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }

        /* ── HERO REDESIGNED ── */
        .hero {
          position: relative;
          min-height: 650px;
          display: flex;
          align-items: center;
          background: url('/assets/Home1.png') center/cover no-repeat;
          padding: 60px 24px;
          overflow: hidden;
        }
        .hero-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(26, 107, 92, 0.95) 0%, rgba(22, 78, 99, 0.8) 100%);
          z-index: 1;
        }
        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
          align-items: center;
          position: relative;
          z-index: 10;
        }
        .hero-glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 48px;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.8s ease-out;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        .hero-badge {
          display: inline-block;
          background: rgba(253, 230, 138, 0.2);
          color: #fde68a;
          padding: 8px 16px;
          border-radius: 100px;
          font-weight: 800;
          font-size: 0.85rem;
          margin-bottom: 24px;
          border: 1px solid rgba(253, 230, 138, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .hero-title {
          font-size: 3.5rem;
          font-weight: 900;
          color: white;
          line-height: 1.1;
          margin-bottom: 24px;
        }
        .hero-highlight { color: #fde68a; text-shadow: 0 0 20px rgba(253, 230, 138, 0.3); }
        .hero-desc {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.8;
          margin-bottom: 40px;
          max-width: 500px;
          font-weight: 500;
        }
        .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
        .hero-btn {
          padding: 18px 32px;
          border-radius: 16px;
          font-weight: 800;
          text-decoration: none;
          transition: 0.3s;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
        }
        .hero-btn.primary { background: white; color: #1a6b5c; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); }
        .hero-btn.primary:hover { transform: translateY(-3px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
        .hero-btn.video-btn { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); }
        .hero-btn.video-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-3px); }

        .hero-image-side { display: flex; justify-content: center; }
        .floating-hero-img { width: 100%; max-width: 450px; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4)); animation: float 6s ease-in-out infinite; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }

        /* ── STATS ── */
        .stat-row { display: flex; justify-content: center; gap: 24px; padding: 40px 24px; margin-top: -60px; position: relative; z-index: 20; max-width: 1200px; margin-left: auto; margin-right: auto; flex-wrap: wrap; }
        .stat-card { background: white; border-radius: 24px; padding: 32px 24px; width: 260px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; transition: 0.3s; }
        .stat-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.12); border-color: #1a6b5c; }
        .stat-card.clickable { cursor: pointer; }
        .icon-img { width: 56px; height: 56px; margin-bottom: 16px; }
        .stat-value { font-size: 1.8rem; font-weight: 900; color: #1a6b5c; margin-bottom: 4px; }
        .stat-label { font-size: 0.9rem; color: #64748b; font-weight: 700; }

        /* ── SECTIONS ── */
        .section { max-width: 1200px; margin: 0 auto; padding: 80px 24px; }
        .section-header-flex { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 48px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
        .section-title { font-size: 2.2rem; font-weight: 900; color: #1e293b; display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
        .icon-img-title { width: 44px; height: 44px; }
        .section-sub { font-size: 1.1rem; color: #64748b; font-weight: 500; }
        .btn-view-all { color: #1a6b5c; font-weight: 800; text-decoration: none; font-size: 1.1rem; transition: 0.2s; }
        .btn-view-all:hover { color: #15574b; transform: translateX(5px); }

        /* ── BERITA ── */
        .home-berita-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 32px; }
        .h-news-card { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; transition: 0.3s; }
        .h-news-card:hover { transform: translateY(-12px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); border-color: #1a6b5c; }
        .h-nc-img { height: 220px; background-size: cover; background-position: center; position: relative; }
        .h-nc-cat { position: absolute; top: 16px; left: 16px; padding: 6px 14px; border-radius: 10px; font-weight: 900; color: white; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }
        .h-nc-cat.pengumuman { background: #ef4444; }
        .h-nc-cat.kegiatan { background: #3b82f6; }
        .h-nc-cat.warga { background: #10b981; }
        .h-nc-content { padding: 32px; }
        .h-nc-date { font-size: 0.85rem; color: #94a3b8; font-weight: 800; display: block; margin-bottom: 12px; }
        .h-nc-title { font-size: 1.3rem; font-weight: 900; color: #1e293b; line-height: 1.4; margin-bottom: 12px; }
        .h-nc-desc { font-size: 1rem; color: #64748b; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        /* ── VIDEO GALLERY ── */
        .video-gallery-box {
          background: white;
          border-radius: 32px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          border: 1.5px solid #f1f5f9;
        }
        .video-responsive-wrap {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 */
          height: 0;
          overflow: hidden;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          background: #000;
        }
        .video-responsive-wrap iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* ── PENGURUS ── */
        .pengurus-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
        .pengurus-card { background: white; border-radius: 24px; padding: 40px 32px; text-align: center; border: 1.5px solid #f1f5f9; transition: 0.3s; position: relative; }
        .pengurus-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(26,107,92,0.1); border-color: #1a6b5c; }
        .pengurus-icon { margin-bottom: 24px; }
        .icon-img-pengurus { width: 80px; height: 80px; }
        .pengurus-nama { font-size: 1.3rem; font-weight: 900; color: #1e293b; margin-bottom: 6px; }
        .pengurus-jabatan { font-size: 0.95rem; font-weight: 700; color: #1a6b5c; }
        .pengurus-wa-btn { display: inline-block; background: #25d366; color: white; padding: 16px; border-radius: 16px; font-weight: 800; text-decoration: none; width: 100%; margin-top: 24px; transition: 0.3s; box-shadow: 0 8px 15px rgba(37,211,102,0.2); }
        .pengurus-wa-btn:hover { background: #128c7e; transform: scale(1.03); box-shadow: 0 12px 25px rgba(18,140,126,0.3); }

        /* EDIT BUTTON PRECISION */
        .h-p-edit { position: absolute; top: 16px; right: 16px; width: 34px; height: 34px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.9rem; transition: 0.3s; z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .h-p-edit:hover { background: #f8fafc; transform: scale(1.1); border-color: #1a6b5c; color: #1a6b5c; box-shadow: 0 10px 15px rgba(26,107,92,0.1); }

        /* ── MAP ── */
        .map-box { background: white; border-radius: 32px; overflow: hidden; height: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; position: relative; }
        .map-frame { width: 100%; height: 100%; }
        .map-btn { position: absolute; bottom: 24px; right: 24px; background: white; color: #1a6b5c; padding: 14px 24px; border-radius: 14px; text-decoration: none; font-weight: 800; z-index: 10; font-size: 0.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15); transition: 0.2s; }
        .map-btn:hover { background: #1a6b5c; color: white; transform: translateY(-5px); }

        /* ── FOOTER ── */
        .footer { background: #0f172a; color: white; padding: 100px 24px 40px; }
        .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; gap: 80px; flex-wrap: wrap; margin-bottom: 80px; }
        .footer-brand { flex: 1; max-width: 500px; }
        .footer-title { font-size: 1.5rem; font-weight: 900; margin-bottom: 24px; display: block; }
        .footer-tagline { font-size: 1.1rem; color: #94a3b8; line-height: 1.8; margin-top: 20px; font-weight: 500; font-style: italic; }
        .footer-links { display: flex; flex-direction: column; gap: 16px; }
        .footer-link-title { font-weight: 900; color: #1a6b5c; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; margin-bottom: 8px; }
        .footer-links a { color: #94a3b8; text-decoration: none; font-weight: 700; transition: 0.2s; }
        .footer-links a:hover { color: white; transform: translateX(5px); }
        .footer-bar { text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 40px; color: #475569; font-weight: 700; font-size: 0.9rem; }

        /* ── MODALS ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: white; border-radius: 32px; width: 440px; padding: 48px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .modal-title { font-size: 1.8rem; font-weight: 900; color: #1e293b; margin-bottom: 32px; text-align: center; }
        .f-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .f-group label { font-size: 0.8rem; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .f-group input { padding: 16px; border: 2.5px solid #f1f5f9; border-radius: 16px; font-weight: 700; font-size: 1rem; transition: 0.3s; outline: none; background: #f8fafc; }
        .f-group input:focus { border-color: #1a6b5c; box-shadow: 0 0 0 5px rgba(26,107,92,0.1); background: white; }
        .modal-btns { display: flex; gap: 12px; margin-top: 32px; }
        .btn-save { flex: 2; padding: 18px; border-radius: 16px; border: none; background: #1a6b5c; color: white; font-weight: 900; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 15px -3px rgba(26,107,92,0.3); }
        .btn-save:hover { transform: translateY(-3px); box-shadow: 0 20px 25px -5px rgba(26,107,92,0.4); }
        .btn-cancel { flex: 1; padding: 18px; border-radius: 16px; border: none; background: #f1f5f9; color: #64748b; font-weight: 800; cursor: pointer; }

        /* NEWS DETAIL */
        .news-detail-modal { width: 750px; padding: 0; overflow: hidden; }
        .dm-header { height: 350px; position: relative; }
        .dm-img { width: 100%; height: 100%; background-size: cover; background-position: center; }
        .dm-close { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,0.9); font-weight: 900; cursor: pointer; box-shadow: 0 10px 15px rgba(0,0,0,0.1); transition: 0.2s; }
        .dm-close:hover { transform: rotate(90deg); background: white; }
        .dm-body { padding: 48px; }
        .dm-title { font-size: 2.2rem; font-weight: 900; color: #1e293b; line-height: 1.2; margin: 20px 0; }
        .dm-content p { font-size: 1.15rem; line-height: 1.8; color: #475569; margin-bottom: 20px; font-weight: 500; }

        @media (max-width: 1024px) {
          .hero-container { grid-template-columns: 1fr; text-align: center; }
          .hero-glass-card { padding: 32px; }
          .hero-image-side { display: none; }
          .hero-title { font-size: 2.5rem; }
          .hero-actions { justify-content: center; }
          .hero-desc { margin-left: auto; margin-right: auto; }
        }
      `}} />
    </div>
  );
};

export default Home;
