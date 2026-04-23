import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { fetchAdminUsers, saveAdminUser, deleteAdminUser, fetchWarga, resetUserPassword } from '../api/api';

const SuperAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'confirm'
  const [importPendingData, setImportPendingData] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('semua');
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', nama: '', role: 'warga', wa: '' });
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [wargaData, setWargaData] = useState([]);
  const [selectedBlok, setSelectedBlok] = useState('');
  const [selectedNomor, setSelectedNomor] = useState('');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetDoneInfo, setResetDoneInfo] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState(null); // 'reset' | 'delete'
  const [bulkLoading, setBulkLoading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUsers();
    loadWarga();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchAdminUsers();
    setUsers(data || []);
    setSelectedIds([]); 
    setLoading(false);
  };

  const loadWarga = async () => {
    const data = await fetchWarga();
    setWargaData(data || []);
  };

  const handleRoleChange = (role) => {
    setForm({ ...form, role });
    if (role !== 'warga') {
        setSelectedBlok('');
        setSelectedNomor('');
        setForm(prev => ({ ...prev, username: '', nama: '' }));
    }
  };

  const handleHouseChange = (blok, nomor) => {
    setSelectedBlok(blok);
    setSelectedNomor(nomor);
    if (blok && nomor) {
        const resident = wargaData.find(w => w.blok === blok && w.nomor === nomor);
        const autoUser = `${blok}${nomor}`.replace(/\s/g, '');
        setForm(prev => ({
            ...prev,
            username: autoUser,
            nama: resident ? resident.nama : prev.nama
        }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    // Validasi duplikat username
    if (users.some(u => u.username.toLowerCase() === form.username.toLowerCase())) {
        setError(`Username @${form.username} sudah terdaftar di sistem!`);
        return;
    }

    const res = await saveAdminUser(form);
    if (res.success) {
      setShowModal(false);
      setForm({ username: '', password: '', nama: '', role: 'warga', wa: '' });
      setSelectedBlok('');
      setSelectedNomor('');
      loadUsers();
    } else {
      setError(res.error || 'Gagal membuat user');
    }
  };

  const handleDelete = async (user) => {
    if (user.id === '1' || user.username === 'admin') {
      alert("Tidak bisa menghapus akun Super Admin utama.");
      return;
    }
    if (window.confirm(`Hapus akun ${user.nama} (@${user.username}) selamanya?`)) {
      const res = await deleteAdminUser(user.id);
      if (res.success) loadUsers();
      else alert(res.error || 'Gagal hapus');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    for (const id of selectedIds) {
      const user = users.find(u => u.id === id);
      if (user?.username === 'admin') continue;
      await deleteAdminUser(id);
    }
    setBulkLoading(false);
    setShowBulkConfirm(false);
    setBulkAction(null);
    setSelectedIds([]);
    loadUsers();
  };

  const handleBulkReset = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    let count = 0;
    for (const id of selectedIds) {
      const user = users.find(u => u.id === id);
      if (user?.username === 'admin') continue;
      const res = await resetUserPassword(id);
      if (res.success) count++;
    }
    setBulkLoading(false);
    setShowBulkConfirm(false);
    setBulkAction(null);
    setSelectedIds([]);
    loadUsers();
    setImportSuccess(`Password ${count} akun berhasil direset ke sementara!`);
  };

  const toggleSelect = (id) => {
    const user = users.find(u => u.id === id);
    if (user?.username === 'admin') return; 
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const deletableUsers = filteredUsers.filter(u => u.username !== 'admin');
    if (selectedIds.length === deletableUsers.length && deletableUsers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableUsers.map(u => u.id));
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    const res = await resetUserPassword(resetTarget.id);
    setResetLoading(false);
    setShowResetConfirm(false);
    if (res.success) {
      setResetDoneInfo({ nama: resetTarget.nama, defaultPassword: res.defaultPassword });
    } else {
      alert(res.error || 'Gagal mereset password.');
    }
    setResetTarget(null);
    loadUsers();
  };

  const downloadUserTemplate = () => {
    const templateData = [
      { nama: 'BUDI SANTOSO',   username: 'A1',        password: '123456',    role: 'warga',      _keterangan: 'Role: warga / satpam / pengurus / superadmin' },
      { nama: 'SITI RAHAYU',   username: 'B2',        password: '123456',    role: 'warga',      _keterangan: 'Username warga = kode blok+nomor (A1, B2, dst)' },
      { nama: 'Ahmad Keamanan',username: 'keamanan2', password: 'satpam123', role: 'satpam',     _keterangan: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 48 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Import_Akun');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Akun.xlsx';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const parseImportFile = (file) => {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length === 0) return;
      setImportPendingData(data);
      setImportStep('confirm');
    };
    reader.readAsBinaryString(file);
  };

  const handleDropImport = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    parseImportFile(e.dataTransfer.files[0]);
  };

  const handleFileInputChange = (e) => {
    parseImportFile(e.target.files[0]);
    e.target.value = '';
  };

  const finalizeImport = async () => {
    if (!importPendingData) return;
    setImportLoading(true);
    let successCount = 0;
    for (const row of importPendingData) {
      const payload = {
        nama:     row.nama     || row.Nama     || '',
        username: row.username || row.Username || '',
        password: String(row.password || row.Password || '123456'),
        role:     (row.role || row.Role || 'warga').toLowerCase(),
      };
      if (payload.nama && payload.username) {
        const res = await saveAdminUser(payload);
        if (res.success) successCount++;
      }
    }
    setImportLoading(false);
    setImportSuccess(`Berhasil mengimpor ${successCount} akun baru!`);
    loadUsers();
    resetImportModal();
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportStep('upload');
    setImportPendingData(null);
    setImportFileName('');
    setIsDragOver(false);
  };

  const ROLE_CONFIG = [
    { key: 'semua',      label: 'Semua',      icon: '👥', color: '#1e293b' },
    { key: 'superadmin', label: 'Superadmin', icon: '🛡️', color: '#ef4444' },
    { key: 'pengurus',   label: 'Pengurus',   icon: '💼', color: '#22c55e' },
    { key: 'satpam',     label: 'Satpam',     icon: '👮', color: '#0284c7' },
    { key: 'warga',      label: 'Warga',      icon: '🏠', color: '#64748b' },
  ];

  const filteredUsers = users.filter(u => {
    const matchSearch =
      (u.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'semua' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Grouping: urutkan role sesuai ROLE_CONFIG
  const ROLE_ORDER = ['superadmin', 'pengurus', 'satpam', 'warga'];
  const groupedByRole = ROLE_ORDER
    .map(role => ({ role, list: filteredUsers.filter(u => u.role === role) }))
    .filter(g => g.list.length > 0);

  // Hitung per role untuk badge
  const roleCount = (role) => users.filter(u => u.role === role).length;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="ah-left">
          <h1>⚙️ Dashboard Super Admin</h1>
          <p>Manajemen akun sistem dan akses warga</p>
        </div>
        <div className="ah-actions">
           <button className="btn-import-user" onClick={() => { setShowImportModal(true); setImportStep('upload'); }}>
             📥 Impor Akun
           </button>
           <button className="btn-add-user" onClick={() => setShowModal(true)}>
             <span>+</span> Tambah Akun Baru
           </button>
        </div>
      </header>

      <section className="admin-controls">
         <div className="search-box-admin">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Cari nama atau username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
         </div>
         <div className="info-badge">Total: <strong>{users.length}</strong> Akun</div>
      </section>

      {/* ROLE FILTER TABS */}
      <div className="role-filter-tabs">
        {ROLE_CONFIG.map(r => (
          <button
            key={r.key}
            className={`rft-btn ${filterRole === r.key ? 'rft-active' : ''}`}
            style={filterRole === r.key ? { '--rft-color': r.color } : {}}
            onClick={() => { setFilterRole(r.key); setSelectedIds([]); }}
          >
            <span className="rft-icon">{r.icon}</span>
            <span className="rft-label">{r.label}</span>
            {r.key !== 'semua' && (
              <span className="rft-badge">{roleCount(r.key)}</span>
            )}
            {r.key === 'semua' && (
              <span className="rft-badge">{users.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bulk-action-bar">
          <div className="bab-left">
            <div className="bab-count-badge">{selectedIds.length}</div>
            <span className="bab-label">akun dipilih</span>
          </div>
          <div className="bab-actions">
            <button
              className="bab-btn bab-reset"
              onClick={() => { setBulkAction('reset'); setShowBulkConfirm(true); }}
            >
              🔄 Reset Password Terpilih
            </button>
            <button
              className="bab-btn bab-delete"
              onClick={() => { setBulkAction('delete'); setShowBulkConfirm(true); }}
            >
              🗑️ Hapus Terpilih
            </button>
            <button className="bab-btn bab-cancel" onClick={() => setSelectedIds([])}>
              ✕ Batal
            </button>
          </div>
        </div>
      )}

      <section className="admin-content">
        {loading ? (
          <div className="admin-loading-pulse"><div className="pulse-item"></div><p>Sinkronisasi data...</p></div>
        ) : (
          <div className="table-container-admin">
            {groupedByRole.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                🔍 Tidak ada akun yang cocok
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th width="40"><input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filteredUsers.filter(u => u.username !== 'admin').length} onChange={toggleSelectAll} /></th>
                    <th width="50">No</th>
                    <th>Nama Lengkap</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByRole.map(({ role, list }) => {
                    const cfg = ROLE_CONFIG.find(r => r.key === role) || {};
                    let globalIdx = filteredUsers.indexOf(list[0]);
                    return (
                      <React.Fragment key={role}>
                        {/* GROUP HEADER */}
                        <tr className="role-group-header">
                          <td colSpan={6}>
                            <div className="rgh-inner" style={{ '--rgh-color': cfg.color }}>
                              <span className="rgh-icon">{cfg.icon}</span>
                              <span className="rgh-label">{cfg.label}</span>
                              <span className="rgh-count">{list.length} akun</span>
                            </div>
                          </td>
                        </tr>
                        {/* ROWS */}
                        {list.map((u, i) => (
                          <tr key={u.id} className={selectedIds.includes(u.id) ? 'row-selected' : ''}>
                            <td className="center">{u.username !== 'admin' && <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />}</td>
                            <td className="center">{filteredUsers.indexOf(u) + 1}</td>
                            <td>
                              <div className="u-nama-cell">
                                <div className="u-avatar" style={{ background: cfg.color }}>{(u.nama || 'U').charAt(0).toUpperCase()}</div>
                                {u.nama}
                              </div>
                            </td>
                            <td className="u-username">@{u.username}</td>
                            <td><span className={`badge-role-table role-${u.role}`}>{u.role}</span></td>
                            <td className="center">
                              {u.username !== 'admin' && (
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button className="btn-reset-table" title="Reset password" onClick={() => { setResetTarget(u); setShowResetConfirm(true); }}>🔄 Reset</button>
                                  <button className="btn-del-table" onClick={() => handleDelete(u)}>🗑️ Hapus</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* MODAL KONFIRMASI BULK ACTION */}
      {showBulkConfirm && (
        <div className="modal-overlay" onClick={() => { setShowBulkConfirm(false); setBulkAction(null); }}>
          <div className="bulk-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className={`bcm-icon ${bulkAction === 'delete' ? 'bcm-red' : 'bcm-orange'}`}>
              {bulkAction === 'delete' ? '🗑️' : '🔄'}
            </div>
            <h3 className="bcm-title">
              {bulkAction === 'delete' ? 'Hapus Akun Terpilih?' : 'Reset Password Terpilih?'}
            </h3>
            <p className="bcm-msg">
              {bulkAction === 'delete'
                ? <><strong>{selectedIds.length} akun</strong> akan dihapus secara permanen dan tidak dapat dikembalikan.</>   
                : <><strong>{selectedIds.length} akun</strong> akan direset ke password sementara. Pengguna wajib mengganti password saat login berikutnya.</>  
              }
            </p>
            <div className="bcm-btns">
              <button
                className={`btn-bulk-confirm ${bulkAction === 'delete' ? 'bbc-red' : 'bbc-orange'}`}
                onClick={bulkAction === 'delete' ? handleBulkDelete : handleBulkReset}
                disabled={bulkLoading}
              >
                {bulkLoading
                  ? '⏳ Memproses...'
                  : bulkAction === 'delete' ? `🗑️ Ya, Hapus ${selectedIds.length} Akun` : `🔄 Ya, Reset ${selectedIds.length} Akun`
                }
              </button>
              <button className="btn-bulk-cancel" onClick={() => { setShowBulkConfirm(false); setBulkAction(null); }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET PASSWORD */}
      {showResetConfirm && resetTarget && (
        <div className="modal-overlay" onClick={() => { setShowResetConfirm(false); setResetTarget(null); }}>
          <div className="reset-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="rcm-icon">🔄</div>
            <h3 className="rcm-title">Reset Password?</h3>
            <p className="rcm-msg">
              Password akun <strong>{resetTarget.nama}</strong> (@{resetTarget.username}) akan direset ke password sementara.<br />
              <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Pengguna wajib mengganti password saat login berikutnya.</span>
            </p>
            <div className="rcm-btns">
              <button className="btn-do-reset" onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? '⏳ Mereset...' : '🔄 Ya, Reset Sekarang'}
              </button>
              <button className="btn-cancel-reset" onClick={() => { setShowResetConfirm(false); setResetTarget(null); }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP INFO PASSWORD SEMENTARA SETELAH RESET */}
      {resetDoneInfo && (
        <div className="modal-overlay" onClick={() => setResetDoneInfo(null)}>
          <div className="reset-done-modal" onClick={e => e.stopPropagation()}>
            <div className="rdm-icon">✅</div>
            <h3 className="rdm-title">Password Berhasil Direset!</h3>
            <p className="rdm-sub">Informasikan password sementara berikut kepada <strong>{resetDoneInfo.nama}</strong>:</p>
            <div className="rdm-pass-box">
              <span className="rdm-pass-label">Password Sementara</span>
              <code className="rdm-pass-value">{resetDoneInfo.defaultPassword}</code>
            </div>
            <p className="rdm-note">💡 Pengguna akan diminta membuat password baru saat pertama kali login.</p>
            <button className="btn-rdm-close" onClick={() => setResetDoneInfo(null)}>Mengerti, Tutup</button>
          </div>
        </div>
      )}

      {/* MODAL IMPORT AKUN */}
      {showImportModal && (
        <div className="modal-overlay" onClick={resetImportModal}>
          <div className="import-akun-modal" onClick={e => e.stopPropagation()}>
            <div className="iam-head">
              <h3 className="iam-title">📥 Import Akun Massal</h3>
              <button className="close-modal" onClick={resetImportModal}>✕</button>
            </div>

            {importStep === 'upload' ? (
              <div className="iam-body">
                {/* STEP 1 – Template */}
                <div className="iam-step">
                  <div className="iam-step-num">1</div>
                  <div className="iam-step-content">
                    <p className="iam-step-label">Unduh template Excel, isi data akun sesuai format, lalu upload.</p>
                    <button className="btn-dl-tpl" onClick={downloadUserTemplate}>
                      ⬇️ Unduh Template <code>.xlsx</code>
                    </button>
                    <div className="tpl-hint">
                      Kolom wajib: <strong>nama</strong>, <strong>username</strong>, <strong>password</strong>, <strong>role</strong>
                    </div>
                  </div>
                </div>

                {/* STEP 2 – Upload */}
                <div className="iam-step">
                  <div className="iam-step-num">2</div>
                  <div className="iam-step-content">
                    <p className="iam-step-label">Upload file Excel yang sudah diisi.</p>
                    <div
                      className={`iam-dropzone ${isDragOver ? 'dz-over' : ''}`}
                      onClick={() => document.getElementById('import-akun-file').click()}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDropImport}
                    >
                      <div className="dz-icon">📂</div>
                      <div className="dz-text">
                        <strong>Klik untuk pilih file</strong>
                        <span>atau Drag &amp; Drop di sini</span>
                      </div>
                      <div className="dz-hint">.xlsx / .xls didukung</div>
                    </div>
                    <input
                      type="file"
                      id="import-akun-file"
                      hidden
                      accept=".xlsx,.xls"
                      onChange={handleFileInputChange}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="iam-confirm">
                <div className="iam-confirm-card">
                  <span className="icc-icon">📋</span>
                  <div>
                    <p className="icc-file">{importFileName}</p>
                    <p className="icc-count">Terdeteksi <strong>{importPendingData?.length || 0} baris</strong> data akun</p>
                  </div>
                </div>
                <p className="iam-confirm-msg">Lanjutkan proses import? Data akun baru akan ditambahkan ke sistem.</p>
                <div className="iam-confirm-btns">
                  <button className="btn-do-import" onClick={finalizeImport} disabled={importLoading}>
                    {importLoading ? '⏳ Mengimpor...' : '✅ Ya, Import Sekarang'}
                  </button>
                  <button className="btn-back-import" onClick={() => setImportStep('upload')}>← Pilih File Lagi</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST SUCCESS IMPORT */}
      {importSuccess && (
        <div className="import-toast" onClick={() => setImportSuccess('')}>
          ✅ {importSuccess}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-box am-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                 <h2 className="modal-title">✨ Registrasi Akun</h2>
                 <button className="close-modal" onClick={() => setShowModal(false)}>✕</button>
              </div>
              
              <form onSubmit={handleCreate} className="modal-form" style={{marginTop:'20px'}}>
                {error && <div style={{background:'#fee2e2', color:'#ef4444', padding:'10px', borderRadius:'10px', fontSize:'0.85rem', fontWeight:700}}>{error}</div>}
                
                <div className="f-group">
                  <label>Role / Tingkat Akses</label>
                  <select value={form.role} onChange={e => handleRoleChange(e.target.value)} className="f-input-select">
                    <option value="warga">🏠 Warga (Hanya Lihat)</option>
                    <option value="satpam">👮 Satpam (Khusus Keamanan)</option>
                    <option value="pengurus">💼 Pengurus (Edit Data)</option>
                    <option value="superadmin">🛡️ Admin (Kontrol Penuh)</option>
                  </select>
                </div>

                {form.role === 'warga' && (
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div className="f-group">
                      <label>Blok Rumah</label>
                      <select required className="f-input-select" value={selectedBlok} onChange={e => handleHouseChange(e.target.value, '')}>
                        <option value="">-- Pilih Blok --</option>
                        {[...new Set(wargaData.map(w => w.blok))].sort().map(b => <option key={b} value={b}>Blok {b}</option>)}
                      </select>
                    </div>
                    <div className="f-group">
                      <label>Nomor Rumah</label>
                      <select required className="f-input-select" value={selectedNomor} onChange={e => handleHouseChange(selectedBlok, e.target.value)} disabled={!selectedBlok}>
                        <option value="">-- Pilih Nomor --</option>
                        {wargaData.filter(w => w.blok === selectedBlok).sort((a,b)=>a.nomor.localeCompare(b.nomor,undefined,{numeric:true})).map(w => <option key={w.id} value={w.nomor}>No. {w.nomor}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="f-group">
                  <label>Nama Lengkap {form.role === 'warga' && selectedNomor && <span style={{color:'#16a34a', fontSize:'0.7rem'}}>(Sesuai Data Warga)</span>}</label>
                  <input type="text" required value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} readOnly={form.role === 'warga' && !!selectedNomor} style={form.role === 'warga' && !!selectedNomor ? {background:'#f1f5f9', cursor:'not-allowed'} : {}} />
                </div>

                <div className="f-group">
                  <label>Username {form.role === 'warga' && <span style={{color:'#16a34a', fontSize:'0.7rem'}}>(Otomatis)</span>}</label>
                  <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} readOnly={form.role === 'warga'} style={form.role === 'warga' ? {background:'#f1f5f9', cursor:'not-allowed'} : {}} />
                </div>

                {form.role === 'satpam' && (
                  <div className="f-group">
                    <label>Nomor WhatsApp (Aktif)</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Contoh: 08123456789" 
                      value={form.wa} 
                      onChange={e => setForm({...form, wa: e.target.value})} 
                    />
                  </div>
                )}

                <div className="f-group">
                  <label>Password Akun</label>
                  <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Masukkan password..." />
                </div>

                <div className="modal-btns" style={{marginTop:'15px'}}>
                  <button type="submit" className="btn-save">Simpan Akun</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; font-family: 'Inter', sans-serif; }
        .admin-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; }
        .admin-header h1 { font-size: 2rem; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
        .ah-actions { display: flex; gap: 12px; }
        .btn-add-user { background: #1a6b5c; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .btn-import-user { background: #f8fafc; color: #475569; border: 2px solid #e2e8f0; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-import-user:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .admin-controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 20px; }
        /* Role Filter Tabs */
        .role-filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .rft-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 50px; border: 2px solid #e2e8f0; background: #f8fafc; color: #64748b; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: 0.2s; }
        .rft-btn:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .rft-btn.rft-active { background: var(--rft-color, #1e293b); border-color: var(--rft-color, #1e293b); color: white; }
        .rft-icon { font-size: 0.9rem; }
        .rft-label { }
        .rft-badge { background: rgba(255,255,255,0.25); color: inherit; padding: 1px 7px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; }
        .rft-btn:not(.rft-active) .rft-badge { background: #e2e8f0; color: #64748b; }
        /* Role Group Header */
        .role-group-header td { padding: 0; }
        .rgh-inner { display: flex; align-items: center; gap: 10px; padding: 10px 20px; background: color-mix(in srgb, var(--rgh-color, #1e293b) 8%, white); border-left: 4px solid var(--rgh-color, #1e293b); }
        .rgh-icon { font-size: 1rem; }
        .rgh-label { font-weight: 900; font-size: 0.82rem; color: var(--rgh-color, #1e293b); text-transform: uppercase; letter-spacing: 0.5px; }
        .rgh-count { margin-left: auto; font-size: 0.75rem; font-weight: 700; background: color-mix(in srgb, var(--rgh-color, #1e293b) 15%, white); color: var(--rgh-color, #1e293b); padding: 2px 10px; border-radius: 20px; }
        /* Bulk Action Bar */
        .bulk-action-bar { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 14px; padding: 12px 20px; margin-bottom: 20px; gap: 16px; animation: slideDownFade 0.25s ease; }
        @keyframes slideDownFade { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .bab-left { display: flex; align-items: center; gap: 10px; }
        .bab-count-badge { background: #f59e0b; color: #1e293b; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.85rem; }
        .bab-label { color: #e2e8f0; font-weight: 700; font-size: 0.9rem; }
        .bab-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .bab-btn { padding: 9px 16px; border-radius: 10px; font-weight: 700; cursor: pointer; border: none; font-size: 0.85rem; transition: 0.2s; }
        .bab-reset { background: #fff7ed; color: #ea580c; }
        .bab-reset:hover { background: #ffedd5; }
        .bab-delete { background: #fee2e2; color: #ef4444; }
        .bab-delete:hover { background: #fecaca; }
        .bab-cancel { background: rgba(255,255,255,0.1); color: #94a3b8; }
        .bab-cancel:hover { background: rgba(255,255,255,0.2); color: #e2e8f0; }
        /* Bulk Confirm Modal */
        .bulk-confirm-modal { background: white; border-radius: 22px; padding: 36px 32px; width: 420px; max-width: 95vw; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .bcm-icon { font-size: 2.8rem; margin-bottom: 14px; width: 70px; height: 70px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .bcm-icon.bcm-red { background: #fee2e2; }
        .bcm-icon.bcm-orange { background: #fff7ed; }
        .bcm-title { font-size: 1.15rem; font-weight: 900; color: #1e293b; margin: 0 0 12px; }
        .bcm-msg { color: #475569; font-size: 0.88rem; line-height: 1.6; margin: 0 0 24px; }
        .bcm-btns { display: flex; gap: 10px; }
        .btn-bulk-confirm { flex: 2; color: white; border: none; padding: 13px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.88rem; transition: 0.2s; }
        .btn-bulk-confirm.bbc-red { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .btn-bulk-confirm.bbc-orange { background: linear-gradient(135deg, #ea580c, #f97316); }
        .btn-bulk-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-bulk-cancel { flex: 1; background: #f1f5f9; color: #64748b; border: none; padding: 13px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .search-box-admin { position: relative; flex: 1; max-width: 500px; }
        .search-box-admin input { width: 100%; padding: 14px 44px; border: 2px solid #f1f5f9; border-radius: 16px; outline: none; }
        .info-badge { background: #f0fdf4; color: #1a6b5c; padding: 8px 16px; border-radius: 10px; font-weight: 600; }
        .table-container-admin { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { background: #f8fafc; padding: 16px 20px; font-size: 0.8rem; font-weight: 800; color: #64748b; text-align: left; border-bottom: 2px solid #f1f5f9; }
        .admin-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
        .row-selected { background: #f0f7f4; }
        .u-nama-cell { display: flex; align-items: center; gap: 12px; }
        .u-avatar { width: 36px; height: 36px; border-radius: 10px; background: #1a6b5c; color: white; display: flex; align-items: center; justify-content: center; }
        .badge-role-table { padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 800; }
        .badge-role-table.role-superadmin { background: #fee2e2; color: #ef4444; }
        .badge-role-table.role-pengurus { background: #dcfce7; color: #22c55e; }
        .badge-role-table.role-satpam { background: #e0f2fe; color: #0284c7; }
        .badge-role-table.role-warga { background: #f1f5f9; color: #64748b; }
        .btn-del-table { background: #fee2e2; color: #ef4444; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .btn-reset-table { background: #fff7ed; color: #ea580c; border: 1.5px solid #fed7aa; padding: 8px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .btn-reset-table:hover { background: #ffedd5; border-color: #fb923c; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 3000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        /* Reset Confirm Modal */
        .reset-confirm-modal { background: white; border-radius: 22px; padding: 36px 32px; width: 400px; max-width: 95vw; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .rcm-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .rcm-title { font-size: 1.15rem; font-weight: 900; color: #1e293b; margin: 0 0 12px; }
        .rcm-msg { color: #475569; font-size: 0.88rem; line-height: 1.6; margin: 0 0 24px; }
        .rcm-btns { display: flex; gap: 10px; }
        .btn-do-reset { flex: 2; background: linear-gradient(135deg, #ea580c, #f97316); color: white; border: none; padding: 13px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .btn-do-reset:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-cancel-reset { flex: 1; background: #f1f5f9; color: #64748b; border: none; padding: 13px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        /* Reset Done Modal */
        .reset-done-modal { background: white; border-radius: 22px; padding: 36px 32px; width: 420px; max-width: 95vw; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .rdm-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .rdm-title { font-size: 1.15rem; font-weight: 900; color: #1a6b5c; margin: 0 0 8px; }
        .rdm-sub { color: #475569; font-size: 0.85rem; margin: 0 0 20px; }
        .rdm-pass-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
        .rdm-pass-label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
        .rdm-pass-value { font-size: 1.6rem; font-weight: 900; color: #1e293b; font-family: monospace; letter-spacing: 2px; }
        .rdm-note { font-size: 0.8rem; color: #64748b; margin: 0 0 20px; }
        .btn-rdm-close { background: #1a6b5c; color: white; border: none; padding: 13px 32px; border-radius: 12px; font-weight: 800; cursor: pointer; width: 100%; }
        /* ── IMPORT MODAL ── */
        .import-akun-modal { background: white; border-radius: 24px; padding: 32px; width: 520px; max-width: 95vw; box-shadow: 0 25px 60px rgba(0,0,0,0.18); }
        .iam-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .iam-title { font-size: 1.2rem; font-weight: 900; color: #1e293b; margin: 0; }
        .iam-body { display: flex; flex-direction: column; gap: 20px; }
        .iam-step { display: flex; gap: 16px; align-items: flex-start; }
        .iam-step-num { min-width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#1a6b5c,#22c55e); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.85rem; flex-shrink: 0; margin-top: 2px; }
        .iam-step-content { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .iam-step-label { margin: 0; color: #475569; font-size: 0.88rem; font-weight: 600; }
        .btn-dl-tpl { background: linear-gradient(135deg,#2563eb,#3b82f6); color: white; border: none; padding: 11px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.9rem; width: fit-content; transition: 0.2s; }
        .btn-dl-tpl:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-dl-tpl code { background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 4px; font-family: monospace; }
        .tpl-hint { font-size: 0.78rem; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #e2e8f0; }
        .iam-dropzone { border: 2.5px dashed #cbd5e1; border-radius: 16px; padding: 36px 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; background: #f8fafc; transition: 0.2s; text-align: center; }
        .iam-dropzone:hover, .iam-dropzone.dz-over { border-color: #1a6b5c; background: #f0fdf4; }
        .dz-icon { font-size: 2.2rem; }
        .dz-text { display: flex; flex-direction: column; gap: 4px; }
        .dz-text strong { font-size: 0.95rem; color: #1a6b5c; }
        .dz-text span { font-size: 0.82rem; color: #94a3b8; }
        .dz-hint { font-size: 0.75rem; color: #94a3b8; background: #e2e8f0; padding: 3px 10px; border-radius: 20px; }
        /* Confirm step */
        .iam-confirm { display: flex; flex-direction: column; gap: 18px; }
        .iam-confirm-card { display: flex; align-items: center; gap: 16px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 14px; padding: 16px 20px; }
        .icc-icon { font-size: 2rem; }
        .icc-file { font-weight: 800; color: #1e293b; margin: 0 0 4px; font-size: 0.9rem; }
        .icc-count { margin: 0; color: #475569; font-size: 0.85rem; }
        .iam-confirm-msg { color: #475569; font-size: 0.88rem; margin: 0; }
        .iam-confirm-btns { display: flex; gap: 10px; }
        .btn-do-import { flex: 2; background: #1a6b5c; color: white; border: none; padding: 13px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.9rem; }
        .btn-do-import:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-back-import { flex: 1; background: #f1f5f9; color: #64748b; border: none; padding: 13px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
        /* Toast */
        .import-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: #1a6b5c; color: white; padding: 14px 28px; border-radius: 50px; font-weight: 700; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.2); cursor: pointer; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        /* ── REGISTRASI MODAL ── */
        .am-modal { width: 480px; background: white; border-radius: 28px; padding: 36px; }
        .modal-head { display: flex; align-items: center; justify-content: space-between; }
        .close-modal { background: #f1f5f9; border: none; color: #64748b; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .close-modal:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
        .modal-form { display: flex; flex-direction: column; gap: 18px; }
        .f-group { display: flex; flex-direction: column; gap: 8px; }
        .f-group label { font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase; }
        .f-group input, .f-input-select { padding: 12px 14px; border: 2.5px solid #f1f5f9; border-radius: 14px; font-family: inherit; font-weight: 600; outline: none; }
        .modal-btns { display: flex; gap: 12px; }
        .btn-save { flex: 2; background: #1a6b5c; color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 800; cursor: pointer; }
        .btn-cancel { flex: 1; background: #f1f5f9; color: #64748b; border: none; padding: 14px; border-radius: 14px; font-weight: 700; cursor: pointer; }
      `}} />
    </div>
  );
};

export default SuperAdmin;
