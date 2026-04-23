import React, { useState, useEffect } from 'react';
import { fetchGuests, saveGuest, deleteGuest, fetchSecurityTasks, toggleSecurityTask, fetchPublicSatpams } from '../api/api';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const Keamanan = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddGuest, setShowAddGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null); // id of guest being edited
  const [confirmDeleteGuest, setConfirmDeleteGuest] = useState(null); // guest object to delete
  const [newGuest, setNewGuest] = useState({ 
    nama: '', kendaraan: '', tujuan: '', kategori: 'Teman', kategoriLain: '', tanpaKendaraan: false 
  });
  const { user } = useAuth();
  const canManage = user?.role === 'pengurus' || user?.role === 'superadmin' || user?.role === 'satpam';
  
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(MONTHS[now.getMonth()]);
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  
  const years = [];
  for(let y = 2024; y <= now.getFullYear() + 1; y++) years.push(String(y));
  
  const [petugas, setPetugas] = useState([]);

  const [checklist, setChecklist] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const guestData = await fetchGuests();
      const taskData = await fetchSecurityTasks();
      const satpamData = await fetchPublicSatpams();
      setLogs(guestData);
      setChecklist(taskData);
      setPetugas(satpamData || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = async (id) => {
    if (!canManage) return; // Warga cannot toggle tasks
    const item = checklist.find(c => c.id === id);
    if (!item) return;
    
    setChecklist(checklist.map(c => c.id === id ? { ...c, done: !c.done } : c));
    
    try {
      await toggleSecurityTask(id, !item.done);
    } catch (err) {
      console.error("Failed to toggle task:", err);
      loadData(); 
    }
  };

  const formatWA = (num) => {
    if (!num) return "#";
    return `https://wa.me/${num.replace(/\D/g, '').replace(/^0/, '62')}`;
  };

  const formatGuestDate = (createdAt) => {
    if (!createdAt) return 'Baru Saja';
    const d = new Date(createdAt + ' UTC'); 
    const tgl = d.getDate();
    const bln = MONTHS[d.getMonth()];
    const jam = d.getHours().toString().padStart(2, '0');
    const mnt = d.getMinutes().toString().padStart(2, '0');
    return `${tgl} ${bln} · ${jam}:${mnt}`;
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    const finalKategori = newGuest.kategori === 'Lainnya' ? newGuest.kategoriLain : newGuest.kategori;
    
    const guestObj = {
      id: editingGuest || String(Date.now()),
      nama: newGuest.nama.toUpperCase(),
      kendaraan: newGuest.tanpaKendaraan ? 'PEJALAN KAKI' : newGuest.kendaraan.toUpperCase(),
      tujuan: newGuest.tujuan.toUpperCase(),
      jam: '00:00', // legacy field
      kategori: finalKategori || 'Lainnya'
    };

    try {
      const res = await saveGuest(guestObj);
      if (res.error) throw new Error("API Error");
      await loadData();
      setShowAddGuest(false);
      setEditingGuest(null);
      setNewGuest({ nama: '', kendaraan: '', tujuan: '', kategori: 'Teman', kategoriLain: '', tanpaKendaraan: false });
    } catch (err) {
      alert("Gagal menyimpan data tamu. Pastikan koneksi server menyala.");
    }
  };

  const openEditModal = (log) => {
    const isStandardKategori = ['Ojek Online', 'Teman', 'Keluarga', 'Antar Paket'].includes(log.kategori);
    const isWlk = log.kendaraan === 'PEJALAN KAKI';
    setEditingGuest(log.id);
    setNewGuest({
      nama: log.nama,
      kendaraan: isWlk ? '' : log.kendaraan,
      tujuan: log.tujuan,
      kategori: isStandardKategori ? log.kategori : 'Lainnya',
      kategoriLain: isStandardKategori ? '' : log.kategori,
      tanpaKendaraan: isWlk
    });
    setShowAddGuest(true);
  };

  const filteredLogs = logs.filter(log => {
    if (!log.created_at) return true;
    const d = new Date(log.created_at + ' UTC');
    const mMatch = filterMonth === 'Semua' || MONTHS[d.getMonth()] === filterMonth;
    const yMatch = filterYear === 'Semua' || String(d.getFullYear()) === filterYear;
    return mMatch && yMatch;
  });

  const confirmDeleteAction = async () => {
    try {
      await deleteGuest(confirmDeleteGuest.id);
      await loadData();
      setConfirmDeleteGuest(null);
    } catch (err) {
      alert("Gagal menghapus data tamu");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentHour = now.getHours();
  const activePetugas = petugas.filter(p => {
    if (p.start < p.end) return currentHour >= p.start && currentHour < p.end;
    return currentHour >= p.start || currentHour < p.end;
  });

  return (
    <div className="keamanan-container">
      <div className="k-hero">
        <div className="k-hero-content">
          <span className="k-tag">Kawasan Terpadu & Aman</span>
          <h1>Keamanan Lingkungan</h1>
          <p>Sistem keamanan terintegrasi untuk kenyamanan seluruh warga Perumahan Citragraha Tembung.</p>
          {user?.role === 'satpam' && (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'}}>
              <div className="satpam-status-badge">
                <span className="status-dot-pulse"></span>
                Petugas Sedang Bertugas: <strong>{user.nama}</strong>
              </div>
              <button 
                onClick={async () => {
                  if(window.confirm('Akhiri shift tugas Anda sekarang?')) {
                    const { updateDutyStatus } = await import('../api/api');
                    await updateDutyStatus(false, null);
                    window.location.reload();
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#fecaca',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '8px 20px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)'
                }}
              >
                🔴 Selesai Tugas
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="k-body">
        <div className="k-grid">
          <div className="k-col-left">
            <div className="k-card card-info-piket">
              <h3>👮 Info Keamanan & Piket</h3>
              <p>Pastikan poin rutin terverifikasi setiap shift.</p>
              <div className="checklist-wrap">
                {checklist.map(item => (
                  <div key={item.id} 
                    className={`check-item ${item.done ? 'is-done' : ''} ${!canManage ? 'is-readonly' : ''}`} 
                    onClick={() => toggleCheck(item.id)}
                  >
                    <div className="check-box">{item.done ? '✓' : ''}</div>
                    <span className="check-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="k-card card-satpam-list" style={{marginTop:'24px'}}>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'15px'}}>
                <h3 style={{margin:0, fontSize:'1.1rem', fontWeight:800}}>🚨 Kontak Satpam</h3>
                <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                   <span className="status-dot-pulse" style={{width:'8px', height:'8px', background:'#22c55e'}}></span>
                   <span style={{fontSize:'0.7rem', fontWeight:800, color:'#16a34a'}}>STAND BY</span>
                </div>
              </div>
              <p style={{fontSize:'0.8rem', color:'#64748b', marginBottom:'20px', fontWeight:500}}>Butuh bantuan keamanan? Klik tombol WhatsApp satpam dibawah ini.</p>
              
              <div className="petugas-wrap" style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                {petugas.length > 0 ? petugas.map(p => (
                  <div key={p.id} className="petugas-item" style={{display:'flex', alignItems:'center', gap:'16px', padding:'16px', border:'1px solid #f1f5f9', borderRadius:'16px', background:'#f8fafc'}}>
                    <div className="p-avatar" style={{width:'48px', height:'48px', borderRadius:'12px', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem'}}>👮</div>
                    <div className="p-info" style={{flex:1}}>
                      <div className="p-name" style={{fontWeight:800, color:'#1e293b', fontSize:'0.95rem'}}>{p.nama}</div>
                      <div className="p-role" style={{fontSize:'0.75rem', color:'#1a6b5c', fontWeight:700}}>{p.current_shift || 'Sedang Bertugas'}</div>
                    </div>
                    {p.wa ? (
                      <a href={formatWA(p.wa)} target="_blank" rel="noreferrer" className="p-wa-btn">
                        Hubungi WhatsApp
                      </a>
                    ) : (
                      <span style={{fontSize:'0.65rem', color:'#94a3b8', fontStyle:'italic'}}>No WA (-)</span>
                    )}
                  </div>
                )) : (
                  <p style={{fontSize:'0.85rem', color:'#94a3b8', fontStyle:'italic'}}>Belum tersedia petugas piket.</p>
                )}
              </div>
            </div>
          </div>

          <div className="k-col-right">
            <div className="k-card">
              <div className="card-header" style={{flexWrap: 'wrap', gap: '10px'}}>
                <div style={{display:'flex', alignItems:'center', gap: '8px'}}>
                  <h3>📖 Buku Tamu Terbaru</h3>
                  <select className="filter-month-sel" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                    <option value="Semua">Bulan</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="filter-month-sel" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                    <option value="Semua">Tahun</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{display:'flex', gap: '10px'}}>
                  <button className="btn-print-guest" onClick={handlePrint} title="Cetak ke PDF">🖨️ Cetak</button>
                  {canManage && <button className="btn-add-guest" onClick={() => setShowAddGuest(true)}>➕ Tambah Tamu</button>}
                </div>
              </div>
              <div className="print-only-header">
                <div style={{display:'flex', alignItems:'center', gap: '20px', marginBottom: '20px', borderBottom: '3px solid #1a6b5c', paddingBottom: '15px'}}>
                  <img src="/assets/Brand.png" alt="Logo" style={{width: '60px'}} />
                  <div>
                    <h2 style={{margin:0, color:'#1a6b5c', fontSize:'1.5rem'}}>LAPORAN BUKU TAMU</h2>
                    <p style={{margin:0, fontWeight:700, color:'#475569'}}>Perumahan Citragraha Tembung</p>
                    <p style={{margin:0, fontSize:'0.8rem', color:'#64748b'}}>Periode: {filterMonth === 'Semua' ? 'Seluruh Bulan' : filterMonth} {filterYear === 'Semua' ? 'Seluruh Tahun' : filterYear}</p>
                  </div>
                </div>
              </div>
              <div className="guest-table-wrap">
                <table className="guest-table">
                  <thead>
                    <tr>
                      <th>Nama / Kendaraan</th>
                      <th>Tujuan Rumah</th>
                      <th>Waktu</th>
                      <th>Kategori</th>
                      <th style={{ textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr><td colSpan={5} style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Belum ada tamu di bulan ini.</td></tr>
                    ) : (
                      filteredLogs.map(log => (
                        <tr key={log?.id}>
                          <td>
                            <div className="g-name">{log?.nama || 'TANPA NAMA'}</div>
                            <div className="g-meta">{log?.kendaraan || 'PEJALAN KAKI'}</div>
                          </td>
                          <td>{log?.tujuan || '-'}</td>
                          <td className="g-time">{formatGuestDate(log?.created_at)}</td>
                          <td>
                            <span className={`g-status ${String(log?.kategori || 'lainnya').toLowerCase().replace(/\s/g, '-')}`}>{log?.kategori || 'Lainnya'}</span>
                          </td>
                          {canManage && (
                            <td>
                              <div className="g-actions">
                                <button className="g-btn-edit" onClick={() => openEditModal(log)}>✏️</button>
                                <button className="g-btn-del" onClick={() => setConfirmDeleteGuest(log)}>🗑️</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddGuest && (
        <div className="modal-overlay" onClick={() => { setShowAddGuest(false); setEditingGuest(null); }}>
          <div className="modal-box guest-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">📑 Registrasi Tamu Baru</h3>
            <form onSubmit={handleAddGuest}>
              <div className="f-group">
                <label>Nama Tamu</label>
                <input required placeholder="Contoh: John Doe" value={newGuest.nama} onChange={e => setNewGuest({...newGuest, nama: e.target.value})} />
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>Nomor Kendaraan</label>
                  <input disabled={newGuest.tanpaKendaraan} placeholder={newGuest.tanpaKendaraan ? 'TIDAK ADA' : 'BK 1234 ABC'} value={newGuest.tanpaKendaraan ? '' : newGuest.kendaraan} onChange={e => setNewGuest({...newGuest, kendaraan: e.target.value})} />
                  <label className="f-check-label">
                    <input type="checkbox" className="f-check" checked={newGuest.tanpaKendaraan} onChange={e => setNewGuest({...newGuest, tanpaKendaraan: e.target.checked})} />
                    <span>Tanpa Kendaraan</span>
                  </label>
                </div>
                <div className="f-group">
                  <label>Tujuan Blok/Rumah</label>
                  <input required placeholder="Contoh: Blok A-01" value={newGuest.tujuan} onChange={e => setNewGuest({...newGuest, tujuan: e.target.value})} />
                </div>
              </div>
              <div className="f-group">
                <label>Kategori Tamu</label>
                <select className="f-select" value={newGuest.kategori} onChange={e => setNewGuest({...newGuest, kategori: e.target.value})}>
                  <option>Ojek Online</option>
                  <option>Teman</option>
                  <option>Keluarga</option>
                  <option>Antar Paket</option>
                  <option>Lainnya</option>
                </select>
              </div>
              {newGuest.kategori === 'Lainnya' && (
                <div className="f-group anim-fade-in">
                  <label>Keterangan Lainnya</label>
                  <input required placeholder="Sebutkan keperluan..." value={newGuest.kategoriLain} onChange={e => setNewGuest({...newGuest, kategoriLain: e.target.value})} />
                </div>
              )}
              <div className="modal-btns">
                <button type="submit" className="btn-save">Simpan Data</button>
                <button type="button" className="btn-cancel" onClick={() => { setShowAddGuest(false); setEditingGuest(null); }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteGuest && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteGuest(null)}>
          <div className="modal-box del-modal" onClick={e => e.stopPropagation()}>
            <span className="del-alert-icon">⚠️</span>
            <h4 className="del-title">Hapus Data Tamu?</h4>
            <p className="del-desc">Hapus data tamu <strong>{confirmDeleteGuest.nama}</strong>?</p>
            <div className="modal-btns">
              <button className="btn-confirm-del" onClick={confirmDeleteAction}>Ya, Hapus</button>
              <button className="btn-cancel" onClick={() => setConfirmDeleteGuest(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .keamanan-container { min-height: 100vh; background: #f8fafc; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .k-hero { 
          background: linear-gradient(rgba(26, 107, 92, 0.85), rgba(26, 107, 92, 0.95)), url('https://images.unsplash.com/photo-1558002038-1055907df827'); 
          background-size: cover; background-position: center; padding: 100px 24px; text-align: center; color: #ffffff !important; 
        }
        .k-tag { background: rgba(255,255,255,0.25); padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 800; color: #ffffff; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.3); }
        .k-hero h1 { font-size: 3.5rem; font-weight: 900; margin: 24px 0; color: #ffffff !important; text-shadow: 0 4px 15px rgba(0,0,0,0.4); letter-spacing: -1px; }
        .k-hero p { font-size: 1.25rem; font-weight: 600; color: #f0fdf4 !important; text-shadow: 0 2px 10px rgba(0,0,0,0.5); max-width: 700px; margin: 0 auto; line-height: 1.6; }

        .satpam-status-badge {
          margin-top: 30px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 12px 24px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          font-size: 1rem;
          color: white;
          font-weight: 600;
        }
        .satpam-status-badge strong { color: #fde68a; font-weight: 800; }
        .status-dot-pulse {
          width: 10px;
          height: 10px;
          background: #fde68a;
          border-radius: 50%;
          box-shadow: 0 0 0 rgba(253, 230, 138, 0.4);
          animation: statusPulse 2s infinite;
        }
        @keyframes statusPulse {
          0% { box-shadow: 0 0 0 0 rgba(253, 230, 138, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(253, 230, 138, 0); }
          100% { box-shadow: 0 0 0 0 rgba(253, 230, 138, 0); }
        }

        .k-body { max-width: 1200px; margin: -40px auto 0; padding: 0 24px; }
        .k-grid { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 24px; }
        .k-card { background: white; border-radius: 24px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .card-header h3 { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 0; }

        .badge-live { background: #fee2e2; color: #ef4444; font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; }
        .petugas-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 16px; background: #f8fafc; margin-bottom: 12px; border: 1px solid #f1f5f9; }
        .p-avatar { width: 48px; height: 48px; border-radius: 12px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .p-name { font-weight: 800; color: #1e293b; font-size: 0.95rem; }
        .p-role { font-size: 0.75rem; color: #1a6b5c; font-weight: 700; }
        .p-wa-btn { background: #25d366; color: white !important; padding: 8px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: 0.2s; box-shadow: 0 4px 10px rgba(37,211,102,0.2); }
        .p-wa-btn:hover { background: #128c7e; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(37,211,102,0.3); }
        .p-wa-btn svg { filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1)); }
        .p-call { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }

        .checklist-wrap { display: flex; flex-direction: column; gap: 12px; }
        .check-item { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 14px; background: #f8fafc; cursor: pointer; border: 1.5px solid #e2e8f0; transition: 0.2s; }
        .check-item.is-done { border-color: #1a6b5c; background: #f0f7f4; }
        .check-item.is-readonly { cursor: default; opacity: 0.8; }
        .check-box { width: 24px; height: 24px; border-radius: 8px; border: 2.5px solid #cbd5e0; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; background: white; }
        .is-done .check-box { background: #1a6b5c; border-color: #1a6b5c; }
        .check-label { font-size: 0.9rem; font-weight: 700; color: #475569; }
        .is-done .check-label { color: #1a6b5c; }

        .guest-table { width: 100%; border-collapse: collapse; }
        .guest-table th { text-align: left; padding: 12px; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; }
        .guest-table td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; }
        .g-name { font-weight: 800; color: #1e293b; font-size: 0.9rem; }
        .g-meta { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
        .g-time { font-size: 0.8rem; font-weight: 700; color: #64748b; }
        .g-status { padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 800; display: inline-block; }
        .ojek-online { background: #f0fdf4; color: #166534; }
        .keluarga { background: #eff6ff; color: #1e40af; }
        .teman { background: #fdf4ff; color: #86198f; }
        .antar-paket { background: #fff7ed; color: #9a3412; }
        .lainnya { background: #f1f5f9; color: #475569; }

        .filter-month-sel { background: #f1f5f9; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; font-weight: 700; font-size: 0.8rem; color: #475569; outline: none; }
        .btn-add-guest { background: #1a6b5c; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(26,107,92,0.25); }
        .btn-add-guest:hover { transform: translateY(-2px); background: #15574b; }

        .btn-print-guest { background: #ffffff; color: #1a6b5c; border: 2px solid #1a6b5c; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-print-guest:hover { background: #f0f7f4; }

        /* MODALS & FORMS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 3000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .modal-box { background: white; border-radius: 28px; width: 480px; padding: 36px; box-shadow: 0 25px 60px rgba(0,0,0,0.3); }
        .modal-title { font-size: 1.4rem; font-weight: 900; margin-bottom: 24px; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        
        .f-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .f-group label { font-size: 0.95rem; font-weight: 800; color: #1e293b; }
        .f-group input, .f-select { 
          padding: 16px; border: 2.5px solid #f1f5f9; border-radius: 14px; font-size: 0.95rem; width: 100%; box-sizing: border-box; 
          font-weight: 700; color: #1e293b; transition: 0.2s; outline: none; background: #f8fafc;
        }
        .f-group input::placeholder { color: #94a3b8; font-weight: 600; }
        .f-group input:focus, .f-select:focus { border-color: #1a6b5c; background: #ffffff; }

        .f-check-label { display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; margin-top: 5px; }
        .f-check-label span { font-size: 0.9rem; font-weight: 800; color: #475569; }
        .f-check { width: 22px !important; height: 22px !important; cursor: pointer; margin: 0 !important; accent-color: #1a6b5c; }
        
        .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: flex-start; }
        .modal-btns { display: flex; gap: 12px; margin-top: 15px; }
        
        .btn-save { flex: 2; background: #1a6b5c; color: white; border: none; padding: 16px; border-radius: 14px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .btn-save:hover { background: #15574b; transform: translateY(-2px); }
        .btn-cancel { flex: 1; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 14px; cursor: pointer; font-weight: 800; color: #64748b; padding: 16px; transition: 0.2s; }
        .btn-cancel:hover { background: #f1f5f9; }

        .g-actions { display: flex; gap: 8px; justify-content: center; }
        .g-btn-edit, .g-btn-del { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #f1f5f9; background: white; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
        .g-btn-edit:hover { background: #eff6ff; border-color: #bfdbfe; }
        .g-btn-del:hover { background: #fef2f2; border-color: #fecaca; }

        .del-modal { text-align: center; }
        .del-alert-icon { font-size: 3rem; margin-bottom: 20px; display: block; }
        .del-title { font-size: 1.5rem; font-weight: 900; color: #1e293b; margin: 0 0 10px; }
        .del-desc { color: #64748b; font-size: 1rem; line-height: 1.6; margin-bottom: 30px; font-weight: 600; }
        .btn-confirm-del { 
          flex: 2; background: #dc2626; color: white; border: none; padding: 16px; border-radius: 14px; 
          font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; 
        }
        .btn-confirm-del:hover { background: #b91c1c; transform: translateY(-2px); }

        .print-only-header { display: none; }

        @media print {
          @page { size: landscape; margin: 1cm; }
          body * { visibility: hidden; }
          .keamanan-container, .keamanan-container * { background: white !important; -webkit-print-color-adjust: exact; }
          .k-col-right, .k-col-right * { visibility: visible; }
          .k-col-right { position: absolute; left: 0; top: 0; width: 100%; }
          .k-hero, .k-col-left, .btn-add-guest, .btn-print-guest, .filter-month-sel, .g-actions, .k-card { visibility: hidden; border: none; box-shadow: none; margin: 0; padding: 0; }
          .k-card { visibility: visible; }
          .guest-table-wrap { visibility: visible; }
          .guest-table { visibility: visible; width: 100%; border: 1px solid #e2e8f0; }
          .guest-table th, .guest-table td { visibility: visible; border: 1px solid #e2e8f0; padding: 10px; }
          .print-only-header { display: block !important; visibility: visible !important; }
          .print-only-header * { visibility: visible !important; }
          .g-status { border: 1px solid #ddd !important; }
          
          /* Force hide specific components */
          .Navbar, .Navbar *, footer, footer * { display: none !important; }
          button { display: none !important; }
        }
      `}} />
    </div>
  );
};

export default Keamanan;
