import React, { useState, useEffect } from 'react';
import { fetchNews, saveNews, deleteNews, getRelativeTime } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Berita = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('Semua');
  const categories = ['Semua', 'Pengumuman', 'Kegiatan', 'Warga'];

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDelModalOpen, setIsDelModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [stats, setStats] = useState({ totalViews: 0, topNews: [], catStats: {} });
  const canManage = user?.role === 'pengurus' || user?.role === 'superadmin';
  const [formData, setFormData] = useState({ title: '', category: 'Pengumuman', desc: '', img: '', author: '', imgCaption: '' });
  const [error, setError] = useState('');

  const calculateStats = (newsData) => {
    const total = newsData.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const sorted = [...newsData].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const catMap = {};
    newsData.forEach(item => {
      catMap[item.category] = (catMap[item.category] || 0) + (item.views || 0);
    });
    setStats({ totalViews: total, topNews: sorted, catStats: catMap });
  };

  // ── PERSISTENCE: API ───────────────────────────────────────────────────────
  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await fetchNews();
      setNews(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error("Load failed:", err);
      setError("Gagal memuat berita");
    } finally {
      setLoading(false);
    }
  };



  const filteredNews = activeFilter === 'Semua' 
    ? news 
    : news.filter(item => item.category === activeFilter);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setError('⚠️ Ukuran foto terlalu besar! Maksimal 1 MB agar sistem tetap ringan.');
        e.target.value = ''; // Reset input
        setFormData({ ...formData, img: '' });
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, img: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: '', category: 'Pengumuman', desc: '', img: '', author: user?.nama || '', imgCaption: '' });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({ 
      title: item.title, 
      category: item.category, 
      desc: item.desc, 
      img: item.img,
      author: item.author || '',
      imgCaption: item.img_caption || item.imgCaption || ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const confirmDelete = (id) => {
    setItemToDelete(id);
    setIsDelModalOpen(true);
  };

  const openDetail = (item) => {
    navigate(`/berita/${item.id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteNews(itemToDelete);
      await loadNews();
      setIsDelModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      setError("Gagal menghapus berita");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.desc || !formData.img || !formData.author || !formData.imgCaption) {
      setError('Semua field wajib diisi, termasuk Penulis dan Keterangan Gambar!');
      return;
    }

    const newsData = {
      id: editingId || String(Date.now()),
      ...formData,
      date: new Date().toISOString()
    };

    try {
      const res = await saveNews(newsData);
      if (res.error) throw new Error("API error");
      await loadNews();
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ title: '', category: 'Pengumuman', desc: '', img: '', author: '', imgCaption: '' });
      setError('');
    } catch (err) {
      setError("Gagal menyimpan berita. Periksa koneksi server.");
    }
  };

  return (
    <div className="berita-container">
      {/* HEADER SECTION */}
      <div className="b-header">
        <div className="b-header-overlay"></div>
        <div className="b-header-content">
          <span className="b-badge">Info & Kabar Terkini</span>
          <h1>Berita & Pengumuman</h1>
          <p>Informasi terbaru dari lingkungan Perumahan Citragraha Tembung untuk seluruh warga.</p>
        </div>
      </div>

      <div className="b-body">
        {/* FILTERS & ADMIN ACTIONS */}
        <div className="b-filters-row">
          <div className="b-filters">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`b-filter-btn ${activeFilter === cat ? 'active' : ''}`}
                onClick={() => setActiveFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {canManage && (
            <div className="b-admin-btns">
              <button className="btn-add-news-small" onClick={openAddModal}>+ Tambah Berita</button>
              <button className="btn-stats-news-small" onClick={() => setIsStatsModalOpen(true)}>📊 Analisis Engagement</button>
            </div>
          )}
        </div>

        {/* NEWS GRID */}
        <div className="b-grid">
          {filteredNews.map(item => (
            <div key={item.id} className="news-card">
              <div className="nc-img-wrap">
                <div className="nc-img" style={{backgroundImage: `url(${item.img})`}}></div>
                <span className={`nc-cat ${item.category.toLowerCase()}`}>{item.category}</span>
                <div className="nc-stats-badge">
                  <span>❤️ {item.likes || 0}</span>
                  <span>💬 {item.comment_count || 0}</span>
                  {canManage && <span>👁️ {item.views || 0}</span>}
                </div>
              </div>
              <div className="nc-content">
                <span className="nc-date">📅 {getRelativeTime(item.date)}</span>
                <h3 className="nc-title">{item.title}</h3>
                <p className="nc-desc">{item.desc}</p>
                <div className="nc-footer">
                  <button className="nc-btn" onClick={() => openDetail(item)}>Baca Selengkapnya →</button>
                  {canManage && (
                    <div className="nc-actions">
                      <button className="nc-edit" onClick={() => openEditModal(item)}>✏️</button>
                      <button className="nc-del" onClick={() => confirmDelete(item.id)}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filteredNews.length === 0 && (
          <div className="b-empty">
            <div className="be-icon">📝</div>
            <h3>Belum ada berita</h3>
            <p>Tidak ada berita dalam kategori "{activeFilter}" saat ini.</p>
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="b-modal-overlay">
          <div className="b-modal">
            <div className="bm-header">
              <h2>Tambah Berita Baru</h2>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="bm-form">
              {error && <div className="bm-error">{error}</div>}
              
              <div className="form-group">
                <label>Judul Berita</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Kerja Bakti Blok A"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Pengumuman">Pengumuman</option>
                    <option value="Kegiatan">Kegiatan</option>
                    <option value="Warga">Warga</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gambar Berita</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  <small style={{color: '#64748b', fontSize: '0.7rem', marginTop: '4px', fontWeight: 600}}>* Maksimal 1 MB (PNG/JPG)</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Penulis / Penyusun</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Tim Citragraha"
                    value={formData.author}
                    onChange={e => setFormData({...formData, author: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Keterangan Gambar (Caption)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Ilustrasi kegiatan warga"
                    value={formData.imgCaption}
                    onChange={e => setFormData({...formData, imgCaption: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Isi Singkat / Deskripsi</label>
                <textarea 
                  rows="4" 
                  placeholder="Jelaskan detail pengumuman atau berita..."
                  value={formData.desc}
                  onChange={e => setFormData({...formData, desc: e.target.value})}
                ></textarea>
              </div>

              <div className="bm-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn-save">Simpan Berita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDelModalOpen && (
        <div className="b-modal-overlay">
          <div className="b-modal del-modal">
            <div className="dm-icon">⚠️</div>
            <h2>Hapus Berita?</h2>
            <p>Berita yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?</p>
            <div className="dm-actions">
              <button className="btn-cancel" onClick={() => setIsDelModalOpen(false)}>Batal</button>
              <button className="btn-del-confirm" onClick={handleDelete}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {isStatsModalOpen && (
        <div className="b-modal-overlay">
          <div className="b-modal stats-modal">
            <div className="bm-header">
              <h2>📊 Analisis Engagement</h2>
              <button onClick={() => setIsStatsModalOpen(false)}>✕</button>
            </div>
            
            <div className="stats-summary">
              <div className="stat-card">
                <span className="stat-label">Total Views</span>
                <span className="stat-value">{stats.totalViews}</span>
                <span className="stat-sub">Seluruh Berita</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Rata-rata</span>
                <span className="stat-value">{news.length > 0 ? Math.round(stats.totalViews / news.length) : 0}</span>
                <span className="stat-sub">Views / Post</span>
              </div>
            </div>

            <div className="stats-section">
              <h3>📈 Top 5 Berita Terpopuler</h3>
              <div className="top-news-list">
                {stats.topNews.map((n, i) => (
                  <div key={n.id} className="top-news-item">
                    <span className="tn-rank">#{i+1}</span>
                    <div className="tn-info">
                      <span className="tn-title">{n.title}</span>
                      <span className="tn-meta">{n.category} • {getRelativeTime(n.date)}</span>
                    </div>
                    <span className="tn-views">{n.views || 0} views</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="stats-section">
              <h3>📂 Engagement per Kategori</h3>
              <div className="cat-stats-grid">
                {Object.entries(stats.catStats).map(([cat, v]) => (
                  <div key={cat} className="cat-stat-bar-wrap">
                    <div className="cs-label">
                      <span>{cat}</span>
                      <span>{v} views</span>
                    </div>
                    <div className="cs-bar-bg">
                      <div className="cs-bar-fill" style={{ width: `${stats.totalViews > 0 ? (v / stats.totalViews) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bm-actions">
              <button className="btn-save" style={{ width: '100%' }} onClick={() => setIsStatsModalOpen(false)}>Selesai</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .berita-container { min-height: 100vh; background: #f8fafc; padding-bottom: 80px; }
        
        .btn-stats-news { margin-top: 24px; background: rgba(255,255,255,0.2); color: white; padding: 12px 28px; border-radius: 12px; border: 2px solid white; font-size: 1rem; font-weight: 800; cursor: pointer; transition: 0.2s; backdrop-filter: blur(10px); }
        .btn-stats-news:hover { background: white; color: #1a6b5c; transform: scale(1.05); }

        .nc-stats-badge { 
          position: absolute; 
          top: 16px; 
          right: 16px; 
          background: rgba(0,0,0,0.6); 
          color: white; 
          padding: 6px 12px; 
          border-radius: 12px; 
          font-size: 0.7rem; 
          font-weight: 700; 
          backdrop-filter: blur(8px); 
          display: flex;
          gap: 10px;
          align-items: center;
          z-index: 2;
        }
        .nc-stats-badge span { display: flex; align-items: center; gap: 4px; }

        .stats-modal { max-width: 700px; max-height: 90vh; overflow-y: auto; }
        .stats-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f1f5f9; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-label { display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
        .stat-value { display: block; font-size: 2.5rem; font-weight: 900; color: #1a6b5c; line-height: 1; }
        .stat-sub { font-size: 0.75rem; color: #94a3b8; font-weight: 600; margin-top: 4px; display: block; }

        .stats-section { margin-bottom: 30px; }
        .stats-section h3 { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        
        .top-news-list { display: flex; flex-direction: column; gap: 12px; }
        .top-news-item { display: flex; align-items: center; gap: 15px; padding: 12px; background: white; border: 1px solid #f1f5f9; border-radius: 12px; }
        .tn-rank { font-weight: 900; color: #cbd5e1; font-size: 1.2rem; min-width: 30px; }
        .tn-info { flex-grow: 1; display: flex; flex-direction: column; }
        .tn-title { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .tn-meta { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
        .tn-views { font-weight: 800; color: #1a6b5c; font-size: 0.85rem; background: #e8f8f6; padding: 4px 8px; border-radius: 6px; }

        .cat-stats-grid { display: flex; flex-direction: column; gap: 12px; }
        .cat-stat-bar-wrap { width: 100%; }
        .cs-label { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px; }
        .cs-bar-bg { height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
        .cs-bar-fill { height: 100%; background: linear-gradient(90deg, #1a6b5c, #2dd4bf); border-radius: 5px; transition: width 1s ease-out; }
        
        .b-header {
          height: 400px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a6b5c;
          background-image: url('https://images.unsplash.com/photo-1504711432869-e74e83881c9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
          background-size: cover;
          background-position: center;
          color: white;
          text-align: center;
        }
        .b-header-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(26,107,92,0.7), rgba(26,107,92,0.9)); }
        .b-header-content { position: relative; z-index: 10; max-width: 800px; padding: 0 24px; }
        .b-badge { background: #ffd700; color: #1a6b5c; padding: 6px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; display: inline-block; }
        .b-header h1 { font-size: 3.5rem; font-weight: 900; margin: 10px 0; letter-spacing: -1.5px; color: #ffffff; text-shadow: 0 4px 10px rgba(0,0,0,0.4); }
        .b-header p { font-size: 1.2rem; opacity: 1; font-weight: 600; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }

        .b-body { max-width: 1200px; margin: -50px auto 0; position: relative; z-index: 20; padding: 0 24px; }
        
        .b-filters-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; gap: 20px; flex-wrap: wrap; }
        .b-filters { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none; }
        .b-filter-btn { padding: 12px 24px; background: white; border: 1px solid #e2e8f0; border-radius: 14px; font-size: 0.9rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .b-filter-btn:hover { border-color: #1a6b5c; color: #1a6b5c; transform: translateY(-2px); }
        .b-filter-btn.active { background: #1a6b5c; color: white; border-color: #1a6b5c; box-shadow: 0 10px 20px rgba(26,107,92,0.2); }

        .b-admin-btns { display: flex; gap: 10px; align-items: center; }
        .btn-add-news-small { background: #1a6b5c; color: white; padding: 10px 20px; border-radius: 12px; border: none; font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(26,107,92,0.2); }
        .btn-add-news-small:hover { transform: translateY(-2px); background: #145248; }
        .btn-stats-news-small { background: white; color: #1a6b5c; padding: 10px 20px; border-radius: 12px; border: 2px solid #1a6b5c; font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-stats-news-small:hover { background: #f0fdfa; transform: translateY(-2px); }

        .b-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 32px; }
        
        .news-card { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; transition: all 0.3s; display: flex; flex-direction: column; }
        .news-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: #1a6b5c; }
        
        .nc-img-wrap { height: 220px; overflow: hidden; position: relative; }
        .nc-img { width: 100%; height: 100%; background-size: cover; background-position: center; transition: transform 0.5s; }
        .news-card:hover .nc-img { transform: scale(1.1); }
        .nc-cat { position: absolute; top: 16px; left: 16px; padding: 6px 14px; border-radius: 10px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: white; z-index: 2; }
        .nc-cat.pengumuman { background: #ef4444; }
        .nc-cat.kegiatan { background: #3b82f6; }
        .nc-cat.warga { background: #10b981; }

        .nc-content { padding: 24px; flex-grow: 1; display: flex; flex-direction: column; }
        .nc-date { font-size: 0.75rem; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 12px; }
        .nc-title { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .nc-desc { font-size: 0.9rem; color: #64748b; margin: 0 0 20px 0; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1; }
        
        .nc-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .nc-btn { padding: 0; background: none; border: none; color: #1a6b5c; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; width: fit-content; transition: 0.2s; }
        .nc-btn:hover { gap: 8px; }
        
        .nc-actions { display: flex; gap: 8px; }
        .nc-edit { background: #e8f8f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #1a6b5c; font-size: 0.9rem; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .nc-edit:hover { background: #1a6b5c; color: white; }
        .nc-del { background: #fee2e2; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #ef4444; font-size: 0.9rem; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .nc-del:hover { background: #ef4444; color: white; }

        /* MODAL */
        .b-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .b-modal { background: white; width: 100%; max-width: 600px; border-radius: 24px; padding: 32px; box-shadow: 0 25px 50px rgba(0,0,0,0.2); animation: modalIn 0.3s ease-out; }
        @keyframes modalIn { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .bm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .bm-header h2 { font-size: 1.5rem; font-weight: 900; color: #1a6b5c; margin: 0; }
        .bm-header button { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-weight: 700; color: #64748b; }
        
        .bm-form { display: flex; flex-direction: column; gap: 20px; }
        .bm-error { background: #fee2e2; color: #ef4444; padding: 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 0.85rem; font-weight: 700; color: #4a5568; }
        .form-group input, .form-group select, .form-group textarea { padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-family: inherit; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #1a6b5c; box-shadow: 0 0 0 3px rgba(26,107,92,0.1); }
        
        .form-row { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; }
        
        .bm-actions { display: flex; gap: 12px; margin-top: 10px; }
        .btn-cancel { flex: 1; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; color: #64748b; cursor: pointer; }
        .btn-save { flex: 2; padding: 14px; border-radius: 12px; border: none; background: #1a6b5c; color: white; font-weight: 800; cursor: pointer; }
        .btn-save:hover { background: #145248; }

        /* DELETE CONFIRM MODAL */
        .del-modal { max-width: 400px; text-align: center; }
        .dm-icon { font-size: 3rem; margin-bottom: 16px; }
        .del-modal h2 { color: #991b1b; }
        .del-modal p { color: #64748b; font-weight: 600; margin-bottom: 24px; }
        .dm-actions { display: flex; gap: 12px; }
        .btn-del-confirm { flex: 1; padding: 14px; border-radius: 12px; border: none; background: #dc2626; color: white; font-weight: 800; cursor: pointer; }
        .btn-del-confirm:hover { background: #b91c1c; }

        .b-empty { text-align: center; padding: 80px 20px; background: white; border-radius: 24px; border: 2px dashed #e2e8f0; }

        .b-empty { text-align: center; padding: 80px 20px; background: white; border-radius: 24px; border: 2px dashed #e2e8f0; }
        .be-icon { font-size: 3rem; margin-bottom: 16px; }
        .b-empty h3 { color: #1e293b; font-weight: 800; margin-bottom: 8px; }
        .b-empty p { color: #94a3b8; font-weight: 600; }

        @media (max-width: 860px) {
          .b-header h1 { font-size: 2.5rem; }
          .b-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
};

export default Berita;
