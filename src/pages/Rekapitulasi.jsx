import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import { fetchWarga, saveWarga, deleteWarga, fetchTransactions, saveTransaction, deleteTransaction } from '../api/api';
import { useAuth } from '../context/AuthContext';

// ── CONFIG ──────────────────────────────────────────────────────────────────
const IURAN_PER_BULAN = 120_000;
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const LIST_BLOK = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

// ── HELPER: Waktu WIB ───────────────────────────────────────────────────────
const getWIB = () => {
  const now = new Date();
  const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return wib;
};

const formatWIB = (date) => {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const h_wib = hari[date?.getDay() ?? 0];
  const tgl_wib = date?.getDate() ?? 0;
  const bln_wib = bulanNama[date?.getMonth() ?? 0];
  const thn_wib = date?.getFullYear() ?? 0;
  const jam_wib = String(date?.getHours() ?? 0).padStart(2, '0');
  const mnt_wib = String(date?.getMinutes() ?? 0).padStart(2, '0');
  const dtk_wib = String(date?.getSeconds() ?? 0).padStart(2, '0');
  return { tanggal: `${h_wib}, ${tgl_wib} ${bln_wib} ${thn_wib}`, waktu: `${jam_wib}:${mnt_wib}:${dtk_wib}` };
};

const fmtRp = (n) => {
  const val = parseFloat(n) || 0;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

// ── COMPONENT: REKAPITULASI ──────────────────────────────────────────────────
const Rekapitulasi = () => {
  const [warga, setWarga] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const canManage = user?.role === 'pengurus' || user?.role === 'superadmin';

  const [showKeuangan, setShowKeuangan] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload');
  const [pendingData, setPendingData] = useState(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const [filterBlok, setFilterBlok] = useState('Semua Blok');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [searchTerm, setSearchTerm] = useState('');
  const [newWarga, setNewWarga] = useState({ nama: '', blok: 'A', nomor: '' });
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [dupError, setDupError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [importYear, setImportYear] = useState(new Date().getFullYear().toString());
  const [showLunasModal, setShowLunasModal] = useState(false);
  const [lunasTarget, setLunasTarget] = useState(null);
  const [lunasRange, setLunasRange] = useState({ start: 0, end: 11 });

  const [showTransForm, setShowTransForm] = useState(false);
  const [newTrans, setNewTrans] = useState({ 
    tipe: 'out', 
    kategori: 'Kebersihan', 
    keterangan: '', 
    jumlah: '', 
    tanggal: new Date().toISOString().split('T')[0] 
  });
  
  // ── PERSISTENCE: API ───────────────────────────────────────────────────────
  const loadAllData = async () => {
    try {
      const wData = await fetchWarga();
      const tData = await fetchTransactions();
      setWarga(wData || []);
      setTransactions(tData || []);
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ── JAM WIB REAL-TIME ─────────────────────────────────────────────────────
  const [waktuWIB, setWaktuWIB] = useState(getWIB());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setWaktuWIB(getWIB());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMonthIdx = waktuWIB.getMonth();
  const currentYear = waktuWIB.getFullYear();
  const { tanggal, waktu } = formatWIB(waktuWIB);

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  
  const toggleBayar = async (wargaId, bulanIdx) => {
    if (!canManage) return; 
    const target = warga.find(w => w.id === wargaId);
    if (!target) return;
    
    const b = target.bayar ? (typeof target.bayar === 'string' ? JSON.parse(target.bayar) : target.bayar) : {};
    const currentBayar = b?.[filterTahun] ? [...b[filterTahun]] : Array(12).fill(false);
    currentBayar[bulanIdx] = !currentBayar[bulanIdx];
    
    const updated = { ...target, bayar: { ...b, [filterTahun]: currentBayar } };
    await saveWarga(updated);
    await loadAllData();
  };

  const fillAllMonths = async (wargaId) => {
    if (!canManage) return;
    const target = warga.find(w => w.id === wargaId);
    if (!target) return;
    
    const b = target.bayar ? (typeof target.bayar === 'string' ? JSON.parse(target.bayar) : target.bayar) : {};
    const updated = { ...target, bayar: { ...b, [filterTahun]: Array(12).fill(true) } };
    await saveWarga(updated);
    await loadAllData();
  };

  const openLunasModal = (w) => {
    setLunasTarget(w);
    setLunasRange({ start: currentMonthIdx, end: 11 }); // Default dari bulan ini ke akhir tahun
    setShowLunasModal(true);
  };

  const processLunasRange = async () => {
    if (!lunasTarget) return;
    
    const idsToUpdate = lunasTarget.isBulk ? selectedIds : [lunasTarget.id];
    
    for (const id of idsToUpdate) {
        const target = warga.find(w => w.id === id);
        if (!target) continue;
        
        const b = target.bayar ? (typeof target.bayar === 'string' ? JSON.parse(target.bayar) : target.bayar) : {};
        const currentYearBayar = b?.[filterTahun] ? [...b[filterTahun]] : Array(12).fill(false);
        
        for (let i = lunasRange.start; i <= lunasRange.end; i++) {
            currentYearBayar[i] = true;
        }

        const updated = { ...target, bayar: { ...b, [filterTahun]: currentYearBayar } };
        await saveWarga(updated);
    }

    await loadAllData();
    setShowLunasModal(false);
    if (lunasTarget.isBulk) setSelectedIds([]);
  };

  const processExcelFile = (file) => {
    if (!file) return;
    setPendingFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const items = XLSX.utils.sheet_to_json(ws);
      if (items.length === 0) return;
      setPendingData(items);
      setImportStep('confirm');
    };
    reader.readAsBinaryString(file);
  };

  const finalizeImport = async () => {
    if (!pendingData) return;
    for (const row of pendingData) {
      const blokName = String(row.blok || row.Blok || '').toUpperCase();
      const rumahNo = String(row.nomor || row.Nomor || row.No || '');
      const namaWarga = row.nama || row.Nama || 'Warga Baru';
      
      // Parse 12 bulan
      const monthlyStatus = BULAN.map(b => {
        const val = String(row[b] || row[b.toLowerCase()] || row[b.toUpperCase()] || 'X').toUpperCase();
        return val === 'V';
      });

      let existing = warga.find(w => w.blok === blokName && w.nomor === rumahNo);
      if (existing) {
        const newBayar = { ...(existing.bayar || {}), [importYear]: monthlyStatus };
        await saveWarga({ ...existing, bayar: newBayar });
      } else {
        await saveWarga({
          id: Date.now() + Math.random(),
          nama: namaWarga,
          blok: blokName,
          nomor: rumahNo,
          bayar: { [importYear]: monthlyStatus }
        });
      }
    }
    await loadAllData();
    setSuccessMsg(`Berhasil mengimport data ke tahun ${importYear}`);
    setShowSuccessModal(true);
    resetImport();
  };

  const resetImport = () => {
    setImportStep('upload');
    setPendingData(null);
    setPendingFileName('');
    setShowImportModal(false);
    setImportYear(filterTahun); // Sync back
  };

  const handleImportExcel = (e) => {
    processExcelFile(e.target.files[0]);
    e.target.value = '';
  };

  const [isDragOver, setIsDragOver] = useState(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processExcelFile(e.dataTransfer.files[0]);
  };

  const downloadTemplate = () => {
    // Header standard: Blok, Nomor, Nama
    const headers = { 'Blok': 'A', 'Nomor': '01', 'Nama': 'CONTOH NAMA' };
    
    // Tambah kolom bulan
    BULAN.forEach(b => {
      headers[b] = 'V'; // V untuk Lunas, X untuk Tunggak
    });

    const templateData = [
      headers,
      { 'Blok': 'A', 'Nomor': '02', 'Nama': 'CONTOH LAIN', ...BULAN.reduce((acc, b) => ({ ...acc, [b]: 'X' }), {}) }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Import");
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Template_Import_Iuran_${importYear}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const requestDeleteWarga = (warga) => {
    setConfirmDelete(warga);
  };

  const confirmDeleteWarga = async () => {
    if (!confirmDelete) return;
    await deleteWarga(confirmDelete.id);
    await loadAllData();
    setConfirmDelete(null);
  };

  const handleAddWarga = async (e) => {
    e.preventDefault();
    if (!newWarga.nama || !newWarga.nomor) return;
    const isDuplicate = warga.some(w => w.blok === newWarga.blok && w.nomor === newWarga.nomor);
    if (isDuplicate) {
      setDupError(`Blok ${newWarga.blok} No. ${newWarga.nomor} sudah terdaftar!`);
      return;
    }
    await saveWarga({
      id: Date.now().toString(),
      nama: newWarga.nama,
      blok: newWarga.blok,
      nomor: newWarga.nomor,
      bayar: { [filterTahun]: Array(12).fill(false) }, 
    });
    await loadAllData();
    setNewWarga({ nama: '', blok: 'A', nomor: '' });
    setDupError('');
    setShowAddForm(false);
  };

  // ── GROUPING & FILTERING ──────────────────────────────────────────────────
  const filteredWarga = (warga || []).filter(w => {
    const matchBlok = filterBlok === 'Semua Blok' || `Blok ${w.blok}` === filterBlok;
    const matchSearch = (w.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || (w.nomor && w.nomor.includes(searchTerm));
    const matchStatus = filterStatus === 'Semua Status' || (() => {
      const b = w.bayar ? (typeof w.bayar === 'string' ? JSON.parse(w.bayar) : w.bayar) : {};
      const isPaid = b?.[filterTahun] && b[filterTahun]?.[currentMonthIdx];
      return filterStatus === 'Sudah Bayar' ? isPaid : !isPaid;
    })();
    return matchBlok && matchSearch && matchStatus;
  }).sort((a, b) => (a.nomor || '').localeCompare((b.nomor || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allFilteredIds = filteredWarga.map(w => w.id);
    if (selectedIds.length === allFilteredIds.length && allFilteredIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteWarga(id);
    }
    await loadAllData();
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
  };

  const groupedData = LIST_BLOK.map(blok => ({
    blok,
    warga: filteredWarga.filter(w => w.blok === blok)
  })).filter(b => b.warga.length > 0);

  // ── STATS CALCULATION ─────────────────────────────────────────────────────
  const dashboardStats = (() => {
    const totalKK = (warga || []).length;
    const lunasBlnIni = (warga || []).filter(w => {
      const b = w.bayar ? (typeof w.bayar === 'string' ? JSON.parse(w.bayar) : w.bayar) : {};
      return b?.[filterTahun] && b[filterTahun]?.[currentMonthIdx];
    }).length;
    
    let totalIuran = 0;
    const monthlyTotals = Array(12).fill(0);
    
    (warga || []).forEach(w => {
      const b = w.bayar ? (typeof w.bayar === 'string' ? JSON.parse(w.bayar) : w.bayar) : {};
      if (b?.[filterTahun]) {
        b[filterTahun].forEach((paid, idx) => {
          if (paid) {
            totalIuran += IURAN_PER_BULAN;
            monthlyTotals[idx] += IURAN_PER_BULAN;
          }
        });
      }
    });

    const pemasukanLain = (transactions || []).filter(t => t.tipe === 'in').reduce((acc, t) => acc + (t.jumlah || 0), 0);
    const pengeluaran = (transactions || []).filter(t => t.tipe === 'out').reduce((acc, t) => acc + (t.jumlah || 0), 0);
    let totalUnpaidCumulative = 0;
    (warga || []).forEach(w => {
      const b = w.bayar ? (typeof w.bayar === 'string' ? JSON.parse(w.bayar) : w.bayar) : {};
      if (b?.[filterTahun]) {
        for (let i = 0; i <= currentMonthIdx; i++) {
          if (!b[filterTahun][i]) totalUnpaidCumulative++;
        }
      }
    });

    const totalSaldo = (totalIuran + pemasukanLain) - pengeluaran;
    return { totalKK, lunasBlnIni, totalIuran, pemasukanLain, pengeluaran, totalSaldo, monthlyTotals, totalUnpaidCumulative };
  })();

  // 4. Tambah Transaksi
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTrans.jumlah || !newTrans.keterangan) return;
    const item = {
      id: String(Date.now()),
      tanggal: newTrans.tanggal,
      tipe: newTrans.tipe,
      kategori: newTrans.kategori,
      keterangan: newTrans.keterangan,
      jumlah: parseInt(newTrans.jumlah)
    };
    try {
      await saveTransaction(item);
      await loadAllData();
      setShowTransForm(false);
      setNewTrans({ 
        tipe: 'out', 
        kategori: 'Kebersihan', 
        keterangan: '', 
        jumlah: '', 
        tanggal: new Date().toISOString().split('T')[0] 
      });
    } catch (err) {
      alert("Gagal mencatat transaksi");
    }
  };

  const hapusTransaksiData = async (id) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    try {
      await deleteTransaction(id);
      await loadAllData();
    } catch (err) {
      alert("Gagal menghapus transaksi");
    }
  };

  const handleAmountChange = (val) => {
    const numeric = val.replace(/\D/g, '');
    setNewTrans({ ...newTrans, jumlah: numeric });
  };


  return (
    <div className="rek-wrap">
      
      {/* HEADER KHUSUS CETAK */}
      <div className="print-header-only">
        <div className="ph-left">
          <img src="/assets/Keuangan.png" alt="" className="ph-logo" />
          <div className="ph-info">
            <h1 className="ph-title">LAPORAN IURAN WARGA</h1>
            <p className="ph-sub">Perumahan Citragraha Tembung · Tahun {filterTahun}</p>
          </div>
        </div>
        <div className="ph-right">
          <div className="ph-date">Dicetak pada: {tanggal}</div>
          <div className="ph-time">{waktu} WIB</div>
        </div>
      </div>

      {/* HEADER */}
      <div className="rek-top">
        <div className="rek-top-left">
          <h1 className="rek-judul">
            <img src="/assets/Keuangan.png" alt="" className="rek-judul-ikon" />
            Manajemen Iuran Warga {filterTahun}
          </h1>
          <p className="rek-sub">Klik ikon <span style={{color:'#059669',fontWeight:800}}>✓</span> atau <span style={{color:'#dc2626',fontWeight:800}}>✗</span> untuk input pembayaran. Bulan yang belum tercapai ditandai <span style={{color:'#94a3b8',fontWeight:800}}>—</span>.</p>
          
            <div className="rek-top-actions">
              {canManage && <button className="btn-add-warga" onClick={() => setShowAddForm(true)}>➕ Tambah Warga</button>}
              {canManage && <button className="btn-trans-prime" onClick={() => setShowTransForm(true)}>💸 Kelola Kas</button>}
              <button className="btn-keuangan-prime" onClick={() => setShowKeuangan(true)}>📊 Buku Kas</button>
              <button className="btn-print-prime" onClick={() => window.print()}>🖨️ Cetak PDF</button>
            </div>
        </div>

        <div className="rek-top-right">
          <div className="jam-wib-card">
            <div className="jam-wib-icon">🕐</div>
            <div className="jam-wib-info">
              <div className="jam-wib-waktu">{waktu} <span className="jam-wib-label">WIB</span></div>
              <div className="jam-wib-tanggal">{tanggal}</div>
            </div>
          </div>
          
          <div className="import-box">
            {canManage && (
              <button className="btn-import" onClick={() => setShowImportModal(true)}>
                📥 Import Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL IMPORT */}
      {showImportModal && (
        <div className="modal-overlay" onClick={resetImport}>
          <div className="modal-box import-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-icon" onClick={resetImport}>×</button>
            <h3 className="modal-title">📤 Import Data Warga</h3>
            
            {importStep === 'upload' ? (
              <div className="import-modal-content">
                <div className="import-step">
                  <div className="step-num">1</div>
                  <div className="step-info">
                    <p>Pilih tahun target dan unduh template Excel untuk format yang sesuai.</p>
                    <div className="f-row" style={{marginBottom:'10px'}}>
                      <div className="f-group" style={{margin:0}}>
                        <label>Tahun Laporan</label>
                        <select className="f-input-select" value={importYear} onChange={e => setImportYear(e.target.value)}>
                           {Array.from({length:5}, (_,i)=> (currentYear-i).toString()).map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <button className="btn-download-tpl" style={{marginTop:'auto', height:'48px'}} onClick={downloadTemplate}>
                        ⬇️ Unduh Template .xlsx
                      </button>
                    </div>
                  </div>
                </div>

                <div className="import-step">
                  <div className="step-num">2</div>
                  <div className="step-info">
                    <p>Tarik & lepaskan file Anda di sini, atau klik untuk memilih file dari komputer.</p>
                    <div 
                      className={`drop-area ${isDragOver ? 'drag-over' : ''}`}
                      onClick={() => document.getElementById('import-excel').click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <div className="drop-icon">📄</div>
                      <div className="drop-text">
                        <strong>Pilih File Excel</strong>
                        <span>atau Drag & Drop di sini</span>
                      </div>
                    </div>
                    <input type="file" id="import-excel" hidden accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="import-confirm-view">
                <div className="confirm-card">
                  <div className="confirm-icon">📋</div>
                  <div className="confirm-info">
                    <p className="confirm-file-name">{pendingFileName}</p>
                    <p className="confirm-stats">Terdeteksi: <strong>{pendingData?.length || 0} baris data</strong></p>
                  </div>
                </div>
                <p className="confirm-msg">Apakah data ini sudah benar dan siap untuk diproses ke dalam sistem tahun <strong>{importYear}</strong>?</p>
                <div className="confirm-btns">
                  <button className="btn-confirm-import" onClick={finalizeImport}>Lanjut, Import Sekarang</button>
                  <button className="btn-cancel-import" onClick={() => setImportStep('upload')}>Tidak Jadi, Pilih Lagi</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUCCESS */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-box success-modal" onClick={e => e.stopPropagation()}>
            <div className="s-icon-wrap">✓</div>
            <h3 className="s-title">Berhasil!</h3>
            <p className="s-msg">{successMsg}</p>
            <button className="btn-success-done" onClick={() => setShowSuccessModal(false)}>Tutup</button>
          </div>
        </div>
      )}

      {/* STATS */}
      {/* STATS */}
      <div className="stat-iuran-row">
        <div className="stat-iuran-card">
          <div className="si-icon">🏘️</div>
          <div className="si-val">{dashboardStats.totalKK}</div>
          <div className="si-label">Total Keluarga</div>
        </div>
        <div className="stat-iuran-card card-hijau">
          <div className="si-icon">✅</div>
          <div className="si-val">{dashboardStats.lunasBlnIni}</div>
          <div className="si-label">Lunas {BULAN[currentMonthIdx]}</div>
        </div>
        <div className="stat-iuran-card card-merah">
          <div className="si-icon">⚠️</div>
          <div className="si-val">{dashboardStats.totalKK - dashboardStats.lunasBlnIni}</div>
          <div className="si-label">KK Belum Bayar ({BULAN[currentMonthIdx]})</div>
        </div>
        <div className="stat-iuran-card card-merah">
          <div className="si-icon">📊</div>
          <div className="si-val">{dashboardStats.totalUnpaidCumulative}</div>
          <div className="si-label">Total Belum Bayar (Jan - {BULAN[currentMonthIdx]})</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
           <select className="sel" value={filterBlok} onChange={e => setFilterBlok(e.target.value)}>
             <option>Semua Blok</option>
             {LIST_BLOK.map(b => <option key={b}>Blok {b}</option>)}
           </select>
           <select className="sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
             <option>Semua Status</option>
             <option>Sudah Bayar</option>
             <option>Belum Bayar</option>
           </select>
           <select className="sel" value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
              {Array.from({length:5}, (_,i)=> (currentYear-i).toString()).map(t => <option key={t}>{t}</option>)}
           </select>
           <div className="search-wrap" style={{position:'relative'}}>
             <input 
               className="sel" 
               style={{paddingLeft:'35px', width:'200px'}} 
               placeholder="Cari nama warga..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
             />
             <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', opacity:0.5}}>🔍</span>
           </div>
        </div>
        <div className="legenda">
          <div className="leg leg-hijau">✓ Lunas</div>
          <div className="leg leg-merah">✗ Tunggak</div>
          <div className="leg leg-abu">- Belum</div>
        </div>
      </div>

      <div className="tabel-container">
        <table className="tabel-iuran">
          <thead>
            <tr>
              <th className="th-nama">
                <div style={{display:'flex', alignItems:'center', gap: '12px'}}>
                  {canManage && (
                    <label className="custom-check">
                      <input 
                        type="checkbox" 
                        className="check-bulk"
                        checked={selectedIds.length === filteredWarga.length && filteredWarga.length > 0}
                        onChange={toggleSelectAll}
                      />
                      <span className="checkmark"></span>
                    </label>
                  )}
                  <span>Nama Warga</span>
                </div>
              </th>
              {BULAN.map((b, i) => (
                <th key={b} className={i > currentMonthIdx ? 'th-future' : ''}>
                  {b}
                  {i === currentMonthIdx && <span className="th-now-dot">•</span>}
                </th>
              ))}
              <th className="th-aksi">{canManage ? 'Aksi' : 'Keterangan'}</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.length === 0 ? (
              <tr><td colSpan={14} style={{padding:'40px', textAlign:'center', color:'#94a3b8'}}>Data tidak ditemukan.</td></tr>
            ) : (
              groupedData.map((blokData, bIdx) => (
                <React.Fragment key={bIdx}>
                  <tr className="row-blok-header">
                    <td colSpan={14}>BLOK {blokData.blok}</td>
                  </tr>
                  {blokData.warga.map((w, wIdx) => {
                    const bayarArr = w.bayar && w.bayar[filterTahun] ? w.bayar[filterTahun] : Array(12).fill(false);
                    return (
                      <tr key={w.id} className={`row-warga ${!bayarArr[currentMonthIdx] ? 'row-unpaid' : ''}`}>
                        <td className="td-nama">
                          <div style={{display:'flex', alignItems:'center', gap: '12px'}}>
                            {canManage && (
                              <label className="custom-check row-check">
                                <input 
                                  type="checkbox" 
                                  className="check-row"
                                  checked={selectedIds.includes(w.id)}
                                  onChange={() => toggleSelect(w.id)}
                                />
                                <span className="checkmark"></span>
                              </label>
                            )}
                            <div className="nama-info-wrap">
                              <div className="td-no">{w.nomor}</div>
                              {w.nama}
                            </div>
                          </div>
                        </td>
                        {BULAN.map((_, mIdx) => {
                          const isPaid = bayarArr[mIdx];
                          const isFuture = mIdx > currentMonthIdx;
                          return (
                            <td key={mIdx}>
                              <button 
                                className={`btn-toggle-status ${isPaid ? 's-paid' : (isFuture ? 's-future' : 's-unpaid')}`}
                                onClick={() => toggleBayar(w.id, mIdx)}
                              >
                                {isPaid ? '✓' : (isFuture ? '-' : '✗')}
                              </button>
                            </td>
                          );
                        })}
                        <td className="td-opsi">
                          <div className="opsi-btns">
                            {canManage ? (
                              <>
                                <button className="btn-all" onClick={() => openLunasModal(w)} title="Edit Pelunasan">📋</button>
                                <button className="btn-del" onClick={() => setConfirmDelete(w)}>Hapus</button>
                              </>
                            ) : (
                              <span style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight:700}}>Lihat Saja</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL ADD */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => { setShowAddForm(false); setDupError(''); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🏠 Tambah Warga Baru</h3>
            <form onSubmit={handleAddWarga} className="modal-form">
              <div className="f-group">
                <label>Nama Lengkap</label>
                <input type="text" placeholder="Masukkan nama..." required 
                  value={newWarga.nama} onChange={e => setNewWarga({...newWarga, nama: e.target.value})} />
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>Blok</label>
                  <select className="f-input-select" value={newWarga.blok} onChange={e => setNewWarga({...newWarga, blok: e.target.value})}>
                    {LIST_BLOK.map(b => <option key={b} value={b}>Blok {b}</option>)}
                  </select>
                </div>
                <div className="f-group">
                  <label>No. Rumah</label>
                  <input type="text" placeholder="Contoh: 12" required 
                    value={newWarga.nomor} onChange={e => { setNewWarga({...newWarga, nomor: e.target.value}); setDupError(''); }} />
                </div>
              </div>
              {dupError && (
                <div className="dup-error">
                  ⚠️ {dupError}
                </div>
              )}
              <div className="modal-btns">
                <button type="submit" className="btn-save">✔ Simpan Data</button>
                <button type="button" className="btn-cancel" onClick={() => { setShowAddForm(false); setDupError(''); }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KEUANGAN PANEL */}
      {showKeuangan && (
        <PanelKeuangan 
          stats={dashboardStats} 
          transactions={transactions} 
          currentMonth={currentMonthIdx}
          onDeleteTrans={deleteTransaction} 
          onClose={() => setShowKeuangan(false)} 
        />
      )}

      {/* MODAL TRANSAKSI */}
      {showTransForm && (
        <div className="modal-overlay" onClick={() => setShowTransForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">💸 Tambah Transaksi Kas</h3>
            <form onSubmit={handleAddTransaction} className="modal-form">
              <div className="f-group">
                <label>Tipe Transaksi</label>
                <div className="tipe-btns">
                  <button type="button" className={`t-btn t-in ${newTrans.tipe === 'in' ? 'active' : ''}`} onClick={() => setNewTrans({...newTrans, tipe:'in'})}>Pemasukan (+)</button>
                  <button type="button" className={`t-btn t-out ${newTrans.tipe === 'out' ? 'active' : ''}`} onClick={() => setNewTrans({...newTrans, tipe:'out'})}>Pengeluaran (-)</button>
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>Kategori</label>
                  <select className="f-input-select" value={newTrans.kategori} onChange={e => setNewTrans({...newTrans, kategori: e.target.value})}>
                    <option>Kebersihan</option>
                    <option>Keamanan</option>
                    <option>Listrik/Air</option>
                    <option>Perbaikan</option>
                    <option>Donasi</option>
                    <option>Lain-lain</option>
                  </select>
                </div>
                <div className="f-group">
                  <label>Tanggal Transaksi</label>
                  <input 
                    type="date" 
                    className="f-input-select" 
                    value={newTrans.tanggal} 
                    onChange={e => setNewTrans({...newTrans, tanggal: e.target.value})} 
                  />
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>Jumlah (Rp)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 50.000" 
                    required 
                    value={newTrans.jumlah ? new Intl.NumberFormat('id-ID').format(newTrans.jumlah) : ''} 
                    onChange={e => handleAmountChange(e.target.value)} 
                  />
                  <small style={{fontSize:'0.7rem', color:'#64748b'}}>*Hanya angka yang diperbolehkan</small>
                </div>
              </div>
              <div className="f-group">
                <label>Keterangan</label>
                <textarea className="f-area" placeholder="Detail transaksi..." required
                  value={newTrans.keterangan} onChange={e => setNewTrans({...newTrans, keterangan: e.target.value})}></textarea>
              </div>
              <div className="modal-btns">
                <button type="submit" className="btn-save">✔ Catat Transaksi</button>
                <button type="button" className="btn-cancel" onClick={() => setShowTransForm(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmDelete && (
        <div className="modal-overlay del-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="del-modal-box" onClick={e => e.stopPropagation()}>
            {/* Ikon bahaya */}
            <div className="del-icon-wrap">
              <div className="del-icon">🗑️</div>
            </div>
            <h3 className="del-title">Hapus Data Warga?</h3>
            <p className="del-desc">
              Anda akan menghapus data warga:
            </p>
            <div className="del-warga-card">
              <div className="del-warga-nama">{confirmDelete.nama}</div>
              <div className="del-warga-info">Blok {confirmDelete.blok} · No. {confirmDelete.nomor}</div>
            </div>
            <p className="del-warning">⚠️ Tindakan ini tidak dapat dibatalkan.</p>
            <div className="del-btns">
              <button className="btn-cancel-del" onClick={() => setConfirmDelete(null)}>Batalkan</button>
              <button className="btn-confirm-del" onClick={confirmDeleteWarga}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LUNAS RANGE (NEW) */}
      {showLunasModal && lunasTarget && (
        <div className="modal-overlay" onClick={() => setShowLunasModal(false)}>
          <div className="modal-box lunas-range-modal" onClick={e => e.stopPropagation()}>
            <div className="l-icon-wrap">{lunasTarget.isBulk ? '👥' : '💰'}</div>
            <h3 className="modal-title">{lunasTarget.isBulk ? `Edit Masal ${selectedIds.length} Warga` : 'Input Pelunasan Iuran'}</h3>
            <p className="l-target-name">
              {lunasTarget.isBulk ? (
                <>Aksi untuk <strong>{selectedIds.length} warga</strong> terpilih</>
              ) : (
                <>Warga: <strong>{lunasTarget.nama}</strong> ({lunasTarget.blok}-{lunasTarget.nomor})</>
              )}
            </p>
            
            <div className="l-options">
              <button 
                className="btn-full-year" 
                onClick={() => { setLunasRange({start:0, end:11}); }}
              >
                ✨ Lunas 1 Tahun Penuh (Jan - Des)
              </button>
              
              <div className="l-divider"><span>ATAU PILIH RENTANG BULAN</span></div>
              
              <div className="range-picker">
                <div className="f-group">
                  <label>Dari Bulan:</label>
                  <select 
                    value={lunasRange.start} 
                    onChange={e => setLunasRange({...lunasRange, start: parseInt(e.target.value)})}>
                    {BULAN_PANJANG.map((b, i) => <option key={i} value={i}>{b}</option>)}
                  </select>
                </div>
                <div className="f-group">
                  <label>Sampai Bulan:</label>
                  <select 
                    value={lunasRange.end} 
                    onChange={e => setLunasRange({...lunasRange, end: parseInt(e.target.value)})}>
                    {BULAN_PANJANG.map((b, i) => (
                      <option key={i} value={i} disabled={i < lunasRange.start}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-btns" style={{marginTop:'30px'}}>
              <button className="btn-save" onClick={processLunasRange}>✔ Simpan Pelunasan</button>
              <button className="btn-cancel" onClick={() => setShowLunasModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS MASAL */}
      {showBulkDeleteConfirm && (
        <div className="modal-overlay del-overlay" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="del-modal-box" onClick={e => e.stopPropagation()}>
            <div className="del-icon-wrap">
              <div className="del-icon">⚠️</div>
            </div>
            <h3 className="del-title">Hapus {selectedIds.length} Data Terpilih?</h3>
            <p className="del-desc">
              Anda akan menghapus para warga yang telah dicentang secara permanen.
            </p>
            <p className="del-warning">⚠️ Tindakan ini tidak dapat dibatalkan.</p>
            <div className="del-btns">
              <button className="btn-cancel-del" onClick={() => setShowBulkDeleteConfirm(false)}>Batal</button>
              <button className="btn-confirm-del" onClick={handleBulkDelete}>Ya, Hapus Masal</button>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT ACTION BAR FOR BULK ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="bulk-action-bar">
          <div className="bulk-info">
            <strong>{selectedIds.length}</strong> warga terpilih
          </div>
          <div className="bulk-btns">
            <button className="btn-bulk-cancel" onClick={() => setSelectedIds([])}>Batal</button>
            <button className="btn-bulk-edit" onClick={() => {
                setLunasTarget({ isBulk: true });
                setLunasRange({ start: currentMonthIdx, end: 11 });
                setShowLunasModal(true);
            }}>📋 Edit Masal</button>
            <button className="btn-bulk-del" onClick={() => setShowBulkDeleteConfirm(true)}>🗑️ Hapus Masal</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .rek-wrap { max-width: 1250px; margin: 0 auto; padding: 40px 20px 100px; font-family: 'Inter', sans-serif; }
        .rek-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; flex-wrap: wrap; gap: 24px; }
        .rek-top-left { display: flex; flex-direction: column; gap: 16px; flex: 1; }
        .rek-judul { font-size: 1.8rem; font-weight: 900; color: #1a202c; display: flex; align-items: center; gap: 12px; }
        .rek-judul-ikon { width: 40px; height: 40px; }
        .rek-sub { color: #718096; font-size: 0.95rem; margin: 0; }
        .rek-top-right { display: flex; flex-direction: column; align-items: flex-end; gap: 16px; }
        .rek-top-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .import-box { margin-top: 4px; }
        .btn-import { 
          display: inline-flex; align-items: center; gap: 8px;
          background: #f8fafc; color: #1a6b5c; border: 2px dashed #1a6b5c; 
          padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 0.9rem;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-import:hover { background: #1a6b5c; color: white; border-style: solid; box-shadow: 0 4px 12px rgba(26,107,92,0.2); }

        .import-modal { width: 520px; position: relative; padding-top: 40px; }
        .modal-close-icon {
          position: absolute; top: 16px; right: 20px;
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: #f1f5f9; color: #475569;
          font-size: 1.5rem; cursor: pointer; display: flex;
          align-items: center; justify-content: center; transition: 0.2s;
        }
        .modal-close-icon:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }

        .import-modal-content { display: flex; flex-direction: column; gap: 28px; margin-bottom: 20px; }
        .import-step { display: flex; gap: 16px; align-items: flex-start; }
        .step-num { 
          width: 36px; height: 36px; background: #1a6b5c; color: white; 
          border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          font-weight: 800; flex-shrink: 0; margin-top: 4px; font-size: 1rem;
        }
        .step-info p { margin: 0 0 12px; font-size: 0.95rem; color: #475569; font-weight: 600; line-height: 1.5; }
        .btn-download-tpl {
          background: #ecfdf5; color: #059669; border: 1.5px solid #a7f3d0;
          padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer;
          transition: 0.2s; font-size: 0.9rem;
        }
        .btn-download-tpl:hover { background: #d1fae5; transform: translateY(-1px); }
        
        .drop-area {
          border: 2px dashed #cbd5e0; border-radius: 16px; 
          padding: 24px; text-align: center; cursor: pointer;
          transition: all 0.2s; background: #f8fafc;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .drop-area:hover, .drop-area.drag-over { border-color: #1a6b5c; background: #f0f7f4; }
        .drop-icon { font-size: 2.5rem; }
        .drop-text { display: flex; flex-direction: column; gap: 4px; }
        .drop-text strong { color: #1a6b5c; font-size: 1rem; }
        .drop-text span { font-size: 0.85rem; color: #64748b; }
        .drag-over { transform: scale(1.02); }

        .import-confirm-view { animation: fadeInConfirm 0.3s ease; }
        @keyframes fadeInConfirm { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .confirm-card {
          background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px;
          padding: 20px; display: flex; gap: 16px; align-items: center; margin-bottom: 20px;
        }
        .confirm-icon { font-size: 2.5rem; }
        .confirm-file-name { font-weight: 800; color: #1a202c; margin: 0; word-break: break-all; }
        .confirm-stats { font-size: 0.9rem; color: #64748b; margin: 4px 0 0; }
        .confirm-msg { font-size: 0.95rem; color: #475569; font-weight: 600; line-height: 1.5; margin-bottom: 24px; }
        .confirm-btns { display: flex; flex-direction: column; gap: 12px; }
        .btn-confirm-import {
           background: #1a6b5c; color: white; border: none; 
           padding: 14px; border-radius: 12px; font-weight: 800; cursor: pointer;
           transition: 0.2s; font-size: 1rem;
           box-shadow: 0 4px 12px rgba(26,107,92,0.3);
        }
        .btn-confirm-import:hover { background: #15574b; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(26,107,92,0.4); }
        .btn-cancel-import {
           background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e0;
           padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer;
           transition: 0.2s; font-size: 0.9rem;
        }
        .btn-cancel-import:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

        /* SUCCESS MODAL CUSTOM */
        .success-modal { text-align: center; width: 380px; padding: 40px 32px; border-radius: 30px; }
        .s-icon-wrap {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #d1fae5, #10b981);
          color: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; font-size: 2.5rem;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
          animation: popScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes popScale { from { transform: scale(0); } to { transform: scale(1); } }
        .s-title { font-size: 1.6rem; font-weight: 900; color: #1a202c; margin-bottom: 12px; }
        .s-msg { font-size: 1rem; color: #64748b; font-weight: 600; line-height: 1.5; margin-bottom: 30px; }
        .btn-success-done {
          width: 100%; padding: 14px; border-radius: 12px;
          background: #1a202c; color: white; border: none;
          font-weight: 800; font-size: 1rem; cursor: pointer;
          transition: 0.2s;
        }
        .btn-success-done:hover { background: #000; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

        /* JAM WIB */
        .jam-wib-card {
          display: flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
          color: white; padding: 12px 20px; border-radius: 16px;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.3);
          min-width: 240px;
        }
        .jam-wib-icon { font-size: 1.6rem; }
        .jam-wib-info { display: flex; flex-direction: column; }
        .jam-wib-waktu { font-size: 1.5rem; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: 1px; }
        .jam-wib-label { font-size: 0.7rem; font-weight: 700; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; margin-left: 6px; vertical-align: middle; }
        .jam-wib-tanggal { font-size: 0.75rem; color: #94a3b8; font-weight: 600; margin-top: 2px; }
        
        .btn-add-warga { background: #1a6b5c; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-trans-prime { background: #fef3c7; color: #92400e; border: 1.5px solid #f59e0b; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btn-keuangan-prime { background: #ffffff; color: #1a6b5c; border: 2px solid #1a6b5c; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-keuangan-prime:hover { background: #f0f7f4; }
        .btn-print-prime { background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e0; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-print-prime:hover { background: #e2e8f0; color: #1e293b; }

        /* PRINT HEADER ONLY */
        .print-header-only { display: none; }

        /* MODAL TIPIFY */
        .tipe-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .t-btn { padding: 12px; border-radius: 10px; border: 2px solid #e2e8f0; font-weight: 700; cursor: pointer; background: #f8fafc; transition: 0.2s; }
        .t-in.active { border-color: #10b981; background: #f0fdf4; color: #065f46; }
        .t-out.active { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
        .f-area { width: 100%; min-height: 80px; padding: 12px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: inherit; font-size: 0.95rem; box-sizing: border-box; }

        .stat-iuran-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
        @media (max-width: 900px) { .stat-iuran-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .stat-iuran-row { grid-template-columns: 1fr; } }
        .stat-iuran-card { background: white; border-radius: 20px; padding: 22px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .card-hijau { border-color: #10b981; background: #f0fdf4; }
        .card-merah { border-color: #ef4444; background: #fef2f2; }
        .si-icon { font-size: 2rem; margin-bottom: 8px; }
        .si-val { font-size: 2rem; font-weight: 900; color: #1a202c; }
        .si-label { font-size: 0.85rem; color: #718096; font-weight: 700; }

        .filter-bar { display: flex; justify-content: space-between; align-items: center; background: white; padding: 16px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 10px; }
        .legenda { display: flex; gap: 12px; }
        .leg { padding: 6px 14px; border-radius: 100px; font-size: 0.82rem; font-weight: 800; border: 1px solid transparent; }
        .leg-hijau { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .leg-merah { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .leg-abu { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
        .filter-group { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .sel { padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e0; font-weight: 700; cursor: pointer; background: white; transition: border-color 0.2s; }
        .sel:hover { border-color: #1a6b5c; }
        .sel:focus { outline: none; border-color: #1a6b5c; box-shadow: 0 0 0 3px rgba(26,107,92,0.12); }

        .tabel-container { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow-x: auto; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .tabel-iuran { width: 100%; border-collapse: collapse; min-width: 900px; }
        .tabel-iuran thead th { background: #1a6b5c; color: white; padding: 18px 10px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; position: relative; }
        .th-future { background: #15574b !important; opacity: 0.6; }
        .th-now-dot { 
          display: block; font-size: 0.5rem; color: #fbbf24; 
          animation: pulse-dot 1.5s ease-in-out infinite; margin-top: 2px;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        
        .row-blok-header td { background: #f8fafc; color: #0f172a; font-weight: 900; padding: 14px 20px; font-size: 0.9rem; border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
        .row-warga td { padding: 14px 10px; border-bottom: 1px solid #f1f5f9; text-align: center; }
        .row-warga:hover { background: #f8fafc; }
        .row-unpaid { background: #fffcf0; }
        
        .td-no { color: #1a6b5c; font-weight: 900; font-size: 1rem; }
        .td-nama { 
          text-align: left !important; padding-left: 16px !important; 
          font-weight: 700; color: #1e293b; font-size: 0.95rem;
          position: sticky; left: 0; background: white; z-index: 10;
          box-shadow: 2px 0 5px rgba(0,0,0,0.05);
        }
        .nama-info-wrap { display: flex; flex-direction: column; }
        .th-nama {
          position: sticky; left: 0; background: #1a6b5c !important; z-index: 20;
          box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        .row-blok-header td {
          position: sticky; left: 0; z-index: 15;
        }
        
        .btn-toggle-status { width: 32px; height: 32px; border-radius: 8px; border: none; font-weight: 900; cursor: pointer; transition: 0.1s; }
        .btn-toggle-status:active { transform: scale(0.9); }
        .s-paid { background: #d1fae5; color: #059669; }
        .s-unpaid { background: #fee2e2; color: #dc2626; }
        .s-future { background: #f1f5f9; color: #94a3b8; border: 1.5px dashed #cbd5e0; }
        


        .td-tunggak { font-weight: 800; }
        .badge-lunas { color: #059669; background: #ecfdf5; padding: 4px 10px; border-radius: 100px; font-size: 0.8rem; }
        .badge-tunggak { color: #b91c1c; background: #fef2f2; padding: 4px 10px; border-radius: 100px; font-size: 0.8rem; }

        .btn-del { 
            background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; 
            padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; 
            font-weight: 700; cursor: pointer; transition: 0.2s;
        }
        .btn-del:hover { background: #fee2e2; }

        .opsi-btns { display: flex; gap: 6px; justify-content: center; }
        .btn-all { 
            background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; 
            padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; 
            font-weight: 700; cursor: pointer; transition: 0.2s;
            display: flex; align-items: center; gap: 4px;
        }
        .btn-all:hover { background: #d1fae5; transform: translateY(-1px); }
        .btn-all:active { transform: scale(0.95); }

        /* PRINT STYLE */
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          body { background: white !important; }
          .rek-wrap { padding: 0; width: 100%; max-width: 100%; background: white !important; }
          .rek-top, .filter-bar, .td-opsi, .th-aksi, .bulk-action-bar, .import-box, .modal-overlay { display: none !important; }
          
          .print-header-only { 
            display: flex !important; justify-content: space-between; align-items: center;
            border-bottom: 3px solid #1a6b5c; padding-bottom: 20px; margin-bottom: 30px;
          }
          .ph-left { display: flex; align-items: center; gap: 15px; }
          .ph-logo { width: 45px; height: 45px; }
          .ph-title { font-size: 1.8rem; font-weight: 900; color: #1a6b5c; margin: 0; }
          .ph-sub { font-size: 1rem; color: #64748b; margin: 0; font-weight: 600; }
          .ph-right { text-align: right; }
          .ph-date { font-weight: 800; color: #1e293b; font-size: 0.9rem; }
          .ph-time { color: #64748b; font-size: 0.8rem; font-weight: 600; }

          .stat-iuran-row { grid-template-columns: repeat(4, 1fr) !important; gap: 15px !important; margin-bottom: 30px !important; }
          .stat-iuran-card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; padding: 15px !important; background: #fff !important; }
          .card-hijau { background: #f0fdf4 !important; border-color: #10b981 !important; color: #065f46 !important; }
          .card-merah { background: #fef2f2 !important; border-color: #ef4444 !important; color: #991b1b !important; }
          .si-val { font-size: 1.5rem !important; }
          .si-label { font-size: 0.8rem !important; }

          .tabel-container { border: 1.5px solid #1a6b5c !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
          .tabel-iuran { width: 100% !important; border-collapse: collapse !important; }
          .tabel-iuran thead th { background: #1a6b5c !important; color: white !important; -webkit-print-color-adjust: exact; padding: 12px 5px !important; font-size: 0.7rem !important; border: 1px solid rgba(255,255,255,0.2) !important; }
          .th-future { opacity: 1 !important; background: #2d3748 !important; }
          
          .row-blok-header td { background: #f1f5f9 !important; color: #1a6b5c !important; font-weight: 900 !important; border: 1.5px solid #e2e8f0 !important; -webkit-print-color-adjust: exact; }
          .row-warga td { border: 1px solid #e2e8f0 !important; padding: 10px 5px !important; font-size: 0.85rem !important; }
          .td-nama { background: white !important; position: static !important; box-shadow: none !important; }
          .th-nama { background: #1a6b5c !important; position: static !important; }
          
          .btn-toggle-status { width: 22px !important; height: 22px !important; font-size: 0.7rem !important; border: 1px solid #ddd !important; }
          .s-paid { background: #d1fae5 !important; color: #059669 !important; -webkit-print-color-adjust: exact; }
          .s-unpaid { background: #fee2e2 !important; color: #dc2626 !important; -webkit-print-color-adjust: exact; }
          .s-future { background: #f8fafc !important; color: #cbd5e0 !important; border-style: solid !important; }
        }

        /* ── MODAL HAPUS CUSTOM ─────────────────────────────────────── */
        .del-overlay { animation: fadeInOverlay 0.2s ease; }
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }

        .del-modal-box {
          background: white;
          border-radius: 28px;
          width: 420px;
          max-width: 95%;
          padding: 36px 32px 28px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          text-align: center;
          animation: slideUpModal 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        .del-icon-wrap {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 0 0 8px #fef2f2;
        }
        .del-icon { font-size: 2rem; }

        .del-title {
          font-size: 1.5rem; font-weight: 900; color: #1a202c;
          margin: 0 0 8px;
        }
        .del-desc {
          font-size: 0.92rem; color: #718096; margin: 0 0 16px;
        }

        .del-warga-card {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 20px;
          margin: 0 auto 16px;
        }
        .del-warga-nama {
          font-size: 1.05rem; font-weight: 800; color: #1e293b;
        }
        .del-warga-info {
          font-size: 0.82rem; color: #94a3b8; font-weight: 600; margin-top: 4px;
        }

        .del-warning {
          font-size: 0.82rem; color: #b91c1c; font-weight: 700;
          background: #fef2f2; border-radius: 10px; padding: 8px 14px;
          margin: 0 0 24px;
        }

        .del-btns {
          display: flex; gap: 12px;
        }
        .btn-cancel-del {
          flex: 1; padding: 13px; border-radius: 14px;
          border: 1.5px solid #e2e8f0; background: #f8fafc;
          font-size: 0.95rem; font-weight: 700; color: #4a5568;
          cursor: pointer; transition: 0.2s;
        }
        .btn-cancel-del:hover { background: #edf2f7; }
        .btn-confirm-del {
          flex: 1; padding: 13px; border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          font-size: 0.95rem; font-weight: 800; color: white;
          cursor: pointer; transition: 0.2s;
          box-shadow: 0 4px 12px rgba(220,38,38,0.35);
        }
        .btn-confirm-del:hover { background: linear-gradient(135deg, #b91c1c, #991b1b); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(185,28,28,0.4); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 3000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .modal-box { background: white; border-radius: 24px; width: 450px; padding: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
        .modal-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 24px; color: #1a202c; }
        .f-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .f-group label { font-size: 0.9rem; font-weight: 700; color: #4a5568; }
        .f-group input, .f-input-select { padding: 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; width: 100%; box-sizing: border-box; }
        .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .modal-btns { display: flex; gap: 12px; margin-top: 10px; }
        .dup-error {
          background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px;
          color: #b91c1c; font-size: 0.88rem; font-weight: 700;
          padding: 10px 16px; margin-bottom: 12px;
          animation: shakeError 0.35s ease;
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .btn-save { flex: 2; background: #1a6b5c; color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .btn-cancel { flex: 1; background: #f7fafc; border: 1px solid #cbd5e0; border-radius: 12px; cursor: pointer; font-weight: 600; color: #4a5568; }

        .bulk-action-bar {
          position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
          background: #1a6b5c; color: white; padding: 16px 32px; border-radius: 24px;
          display: flex; align-items: center; gap: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          z-index: 1000; animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes slideUp { from { bottom: -100px; opacity: 0; } to { bottom: 30px; opacity: 1; } }
        .bulk-info { font-size: 0.95rem; font-weight: 500; }
        .bulk-info strong { font-size: 1.2rem; margin-right: 4px; }
        .bulk-btns { display: flex; gap: 12px; }
        .btn-bulk-cancel { background: transparent; border: 1px solid rgba(255,255,255,0.4); color: white; padding: 10px 20px; border-radius: 14px; cursor: pointer; font-weight: 600; }
        .btn-bulk-edit { background: #fbbf24; color: #78350f; border: none; padding: 10px 24px; border-radius: 14px; cursor: pointer; font-weight: 800; transition: 0.2s; }
        .btn-bulk-edit:hover { background: #f59e0b; transform: translateY(-2px); }
        .btn-bulk-del { background: #ef4444; color: white; border: none; padding: 10px 24px; border-radius: 14px; cursor: pointer; font-weight: 800; }
        .check-bulk, .check-row { 
          display: none;
        }

        /* CUSTOM CHECKBOX */
        .custom-check {
          display: inline-block;
          position: relative;
          width: 20px;
          height: 20px;
          cursor: pointer;
          user-select: none;
        }
        .custom-check .checkmark {
          position: absolute;
          top: 0; left: 0;
          height: 20px; width: 20px;
          background-color: #f1f5f9;
          border: 2px solid #cbd5e0;
          border-radius: 6px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-check:hover .checkmark {
          border-color: #1a6b5c;
          background-color: #f8fafc;
        }
        .custom-check input:checked ~ .checkmark {
          background-color: #1a6b5c;
          border-color: #1a6b5c;
          box-shadow: 0 4px 10px rgba(26,107,92,0.3);
        }
        .custom-check .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 6px;
          top: 2px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
        }
        .custom-check input:checked ~ .checkmark:after {
          display: block;
        }
        .row-check .checkmark { background-color: #fff; }
        
        .opsi-btns { display: flex; align-items: center; gap: 14px; }

        /* LUNAS RANGE MODAL STYLES */
        .lunas-range-modal { width: 440px; text-align: center; }
        .l-icon-wrap { font-size: 3rem; margin-bottom: 20px; }
        .l-target-name { background: #f8fafc; padding: 10px; border-radius: 12px; margin-bottom: 24px; font-size: 0.95rem; color: #475569; border: 1px solid #e2e8f0; }
        .btn-full-year { width: 100%; padding: 16px; background: #ecfdf5; color: #059669; border: 2px solid #10b981; border-radius: 16px; font-weight: 800; cursor: pointer; transition: 0.2s; margin-bottom: 20px; }
        .btn-full-year:hover { background: #10b981; color: white; transform: translateY(-3px); box-shadow: 0 10px 15px rgba(16,185,129,0.2); }
        .l-divider { position: relative; margin: 24px 0; border-top: 1px solid #e2e8f0; }
        .l-divider span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 0 12px; font-size: 0.7rem; font-weight: 800; color: #94a3b8; letter-spacing: 1px; }
        .range-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; text-align: left; }
        .range-picker label { font-size: 0.75rem; font-weight: 800; color: #64748b; margin-bottom: 6px; display: block; }
        .range-picker select { padding: 12px; border-radius: 10px; border: 1px solid #cbd5e0; width: 100%; font-weight: 700; color: #1e293b; background: #f8fafc; }

        @media (max-width: 768px) {
          .rek-top { flex-direction: column; align-items: stretch; }
          .rek-top-left { text-align: center; align-items: center; }
          .rek-judul { justify-content: center; font-size: 1.5rem; }
          .rek-top-right { align-items: center; width: 100%; }
          .rek-top-actions { justify-content: center; width: 100%; }
          .btn-add-warga, .btn-trans-prime, .btn-keuangan-prime { flex: 1; padding: 12px 10px; font-size: 0.8rem; }
          .import-modal { width: 95%; padding: 30px 20px; }
          .modal-box { width: 95%; max-height: 90vh; overflow-y: auto; }
          .f-row { grid-template-columns: 1fr; }
          .jam-wib-card { width: 100%; box-sizing: border-box; }
          .filter-bar { flex-direction: column; align-items: stretch; }
          .filter-group { width: 100%; }
          .sel { flex: 1; }
          .legenda { justify-content: center; }
          .td-nama { font-size: 0.85rem; padding-left: 10px !important; }
        }
        @media (max-width: 480px) {
          .rek-judul { font-size: 1.3rem; }
          .rek-top-actions { flex-direction: column; }
          .btn-add-warga, .btn-trans-prime, .btn-keuangan-prime { width: 100%; }
        }
      ` }} />
    </div>
  );
};

const PanelKeuangan = ({ stats, transactions, currentMonth, onDeleteTrans, onClose }) => {
  const [activeMonthIdx, setActiveMonthIdx] = useState(currentMonth); // 'all' or 0-11
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('Semua');
  
  const year = new Date().getFullYear();
  const categoriesList = ['Kebersihan', 'Keamanan', 'Listrik/Air', 'Perbaikan', 'Donasi', 'Lain-lain', 'Iuran'];

  // ── DATA PREPARATION ──────────────────────────────────────────────────────
  const combinedLogs = [
    ...transactions.map(t => ({ ...t })),
    ...stats.monthlyTotals.map((amount, idx) => ({
      id: `iuran-${idx}`,
      keterangan: `Iuran Warga ${BULAN_PANJANG[idx]}`,
      tipe: 'in',
      kategori: 'Iuran',
      jumlah: amount,
      tanggal: new Date(new Date().getFullYear(), idx, 2).toISOString(),
      isAuto: true
    })).filter(x => x.jumlah > 0)
  ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const filteredLogs = combinedLogs.filter(log => {
    const logDate = new Date(log.tanggal);
    const matchMonth = activeMonthIdx === 'all' || logDate.getMonth() === parseInt(activeMonthIdx);
    const matchCat = catFilter === 'Semua' || log.kategori === catFilter;
    const matchSearch = log.keterangan.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMonth && matchCat && matchSearch;
  });
  
  const monthlyIncomes = BULAN.map((b, idx) => {
    const iuranBln = stats.monthlyTotals[idx];
    const transBln = transactions
      .filter(t => t.tipe === 'in' && new Date(t.tanggal).getMonth() === idx)
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    return { name: b, Pemasukan: iuranBln + transBln };
  });

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];
  const categoryChartData = categoriesList.map(cat => ({
    name: cat,
    value: transactions
      .filter(t => t.tipe === 'out' && t.kategori === cat && (activeMonthIdx === 'all' || new Date(t.tanggal).getMonth() === activeMonthIdx))
      .reduce((acc, curr) => acc + curr.jumlah, 0)
  })).filter(d => d.value > 0);

  const totalSpending = categoryChartData.reduce((acc, curr) => acc + curr.value, 0);

  const ringkasanSantai = [
    { label: 'Iuran Warga', val: fmtRp(stats.totalIuran), color: '#ffffff', icon: '🏠' },
    { label: 'Dana Lainnya', val: fmtRp(stats.pemasukanLain), color: '#ffffff', icon: '🎁' },
    { label: 'Total Belanja', val: fmtRp(stats.pengeluaran), color: '#ffffff', icon: '🛒' },
  ];

  return (
    <div className="modal-overlay report-overlay" onClick={onClose}>
      <div className="report-modal-box buku-kas-box" onClick={e => e.stopPropagation()}>
        <div className="bk-bg-pattern"></div>
        <div className="report-header bk-header">
          <div className="rh-left">
            <h2 className="rh-title">📔 BUKU KAS PERUMAHAN</h2>
            <p className="rh-subtitle">Transparansi Dana Warga Perumahan Citragraha Tembung</p>
          </div>
          <button className="bk-close-btn" onClick={onClose} title="Tutup">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="report-body bk-body">
          <div className="bk-top-row">
            <div className="saldo-utama-card">
              <div className="su-label">SALDO KAS SAAT INI</div>
              <div className="su-val">{fmtRp(stats.totalSaldo)}</div>
              <div className="su-sub">Update per: {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</div>
              <div className="su-items">
                {ringkasanSantai.map((item, idx) => (
                  <div key={idx} className="su-item">
                    <span className="sui-icon">{item.icon}</span>
                    <div className="sui-cont">
                      <div className="sui-label">{item.label}</div>
                      <div className="sui-val" style={{color:item.color}}>{item.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bk-chart-card">
              <h4 className="card-title">Tren Pemasukan Bulanan ({year})</h4>
              <div style={{height: 200}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyIncomes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={{stroke:'#cbd5e0'}} />
                    <YAxis hide />
                    <Tooltip cursor={{fill:'#f8fafc'}} formatter={(v) => fmtRp(v)} />
                    <Bar dataKey="Pemasukan" fill="#1a6b5c" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bk-mid-row">
            <div className="bk-pie-card">
              <h4 className="card-title" style={{textAlign:'center'}}>Distribusi Pengeluaran</h4>
              {categoryChartData.length > 0 ? (
                <div className="pie-wrap">
                  <div className="pie-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={categoryChartData} 
                          innerRadius={45} 
                          outerRadius={60} 
                          paddingAngle={3} 
                          dataKey="value" 
                          stroke="none"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 25px rgba(0,0,0,0.1)', fontSize:'0.75rem'}} 
                          formatter={(v) => fmtRp(v)} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-center-info">
                      <div className="pci-label">Total Belanja</div>
                      <div className="pci-val">{fmtRp(totalSpending).replace('Rp', 'Rp.')}</div>
                    </div>
                  </div>
                  <div className="pie-legend">
                    {categoryChartData.map((d, i) => (
                      <div key={i} className="pl-item">
                        <div className="pl-left">
                          <span className="pl-dot" style={{background: COLORS[i % COLORS.length]}}></span>
                          <span className="pl-name">{d.name}</span>
                        </div>
                        <span className="pl-val">{fmtRp(d.value).replace('Rp', 'Rp.')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-pie">Belum ada catatan pengeluaran.</div>
              )}
            </div>

            <div className="bk-ledger-card">
              <h4 className="card-title">Detail Transaksi</h4>
              
              <div className="bk-filter-tabs">
                <button className={`tab-btn ${activeMonthIdx === 'all' ? 'active' : ''}`} onClick={() => setActiveMonthIdx('all')}>Semua</button>
                {BULAN.map((b, i) => (
                  <button key={b} className={`tab-btn ${activeMonthIdx === i ? 'active' : ''}`} onClick={() => setActiveMonthIdx(i)}>{b}</button>
                ))}
              </div>

              <div className="bk-search-row">
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input type="text" placeholder="Cari keterangan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="cat-sel" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option>Semua</option>
                  {categoriesList.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="ledger-mini-list bk-ledger-scroll">
                {filteredLogs.length === 0 ? (
                  <div className="empty-ledger">Riwayat tidak ditemukan.</div>
                ) : (
                  filteredLogs.map(t => (
                    <div key={t.id} className="lm-row">
                      <div className="lm-info">
                        <div className="lm-desc">{t.keterangan}</div>
                        <div className="lm-meta">
                          {t.tipe === 'in' ? 'Pemasukan' : t.kategori} • {new Date(t.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}
                        </div>
                      </div>
                      <div className="lm-right">
                        <div className={`lm-amt ${t.tipe === 'in' ? 'c-in' : 'c-out'}`}>
                          {t.tipe === 'in' ? '+' : '-'} {fmtRp(t.jumlah).replace('Rp', 'Rp.')}
                        </div>
                        {!t.isAuto && (
                          <button className="btn-del-mini" onClick={() => onDeleteTrans(t.id)} title="Hapus transaksi">×</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="report-footer bk-footer">
          <button className="btn-bk-print" onClick={() => window.print()}>
            <span className="bkp-icon">💾</span> Simpan Laporan PDF
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .buku-kas-box { 
          position: relative; width: 1050px !important; max-width: 95vw; 
          max-height: 92vh; display: flex; flex-direction: column;
          background: #ffffff; border-radius: 40px !important; 
          box-shadow: 0 40px 80px rgba(0,0,0,0.3);
          border: 1px solid #e2e8f0;
          overflow: hidden; animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
        }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.9) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .bk-bg-pattern { position: absolute; top: 0; left: 0; right: 0; height: 300px; background: radial-gradient(circle at 10% 20%, rgba(26,107,92,0.03) 0%, transparent 40%); pointer-events: none; }
        
        .bk-header { padding: 32px 48px; border-bottom: 2px solid #f1f5f9; position: relative; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
        .bk-close-btn { width: 44px; height: 44px; border-radius: 12px; border: none; background: #f1f5f9; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .bk-close-btn:hover { background: #fee2e2; color: #dc2626; transform: rotate(90deg); }
        .bk-body { 
          padding: 32px 48px !important; 
          overflow-y: auto; 
          flex: 1; 
          scrollbar-width: thin; 
          scrollbar-color: #e2e8f0 transparent; 
          position: relative;
          z-index: 1;
        }
        .bk-body::-webkit-scrollbar { width: 8px; }
        .bk-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; border: 2px solid white; }
        .bk-footer { background: #f8fafc; padding: 20px 48px; border-top: 2px solid #f1f5f9; position: relative; flex-shrink: 0; display: flex; justify-content: flex-end; }
        .btn-bk-print { background: #1a6b5c; color: white; border: none; padding: 16px 32px; border-radius: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 20px rgba(26,107,92,0.3); transition: all 0.2s; }
        .btn-bk-print:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(26,107,92,0.4); background: #15574b; }
        
        .bk-top-row { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; margin-bottom: 24px; }
        .bk-mid-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 24px; }
        /* Penting: Cegah grid item meluap (overflow) */
        .bk-top-row > *, .bk-mid-row > * { min-width: 0; }

        .card-title { font-size: 0.85rem; font-weight: 900; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }

        .saldo-utama-card { background: linear-gradient(135deg, #1a6b5c 0%, #15574b 100%); padding: 32px; border-radius: 32px; color: white; box-shadow: 0 15px 35px rgba(26,107,92,0.25); }
        .su-label { font-size: 0.75rem; font-weight: 800; opacity: 0.8; letter-spacing: 1px; }
        .su-val { font-size: 2.5rem; font-weight: 900; margin: 8px 0; }
        .su-sub { font-size: 0.7rem; opacity: 0.6; font-weight: 600; margin-bottom: 24px; }
        .su-items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .su-item { background: rgba(255,255,255,0.08); padding: 12px; border-radius: 16px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.1); }
        .sui-icon { font-size: 1.2rem; }
        .sui-label { font-size: 0.6rem; font-weight: 800; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; }
        .sui-val { font-size: 0.9rem; font-weight: 900; margin-top: 2px; }

        .bk-chart-card, .bk-pie-card, .bk-ledger-card { 
            background: white; padding: 24px; border-radius: 28px; border: 1px solid #f1f5f9; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.03); 
            box-sizing: border-box; 
        }
        .pie-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .pie-container { position: relative; width: 130px; height: 130px; flex-shrink: 0; }
        .pie-center-info {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          pointer-events: none; width: 100%; text-align: center;
        }
        .pci-label { font-size: 0.55rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; }
        .pci-val { font-size: 0.65rem; font-weight: 900; color: #1e293b; margin-top: 1px; }

        .pie-legend { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .pl-item { display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; padding: 4px 0; border-bottom: 1px solid #f8fafc; }
        .pl-left { display: flex; align-items: center; gap: 8px; }
        .pl-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
        .pl-name { color: #64748b; font-weight: 700; font-size: 0.75rem; }
        .pl-val { color: #1e293b; font-weight: 800; font-size: 0.78rem; }
        .empty-pie { padding: 40px; text-align: center; color: #94a3b8; font-size: 0.8rem; font-weight: 600; }

        .lm-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .lm-row:last-child { border: none; }
        .lm-desc { font-weight: 700; font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
        .lm-meta { font-size: 0.7rem; color: #94a3b8; font-weight: 600; margin-top: 2px; }
        .lm-amt { font-weight: 900; font-size: 0.9rem; }
        .c-in { color: #10b981; }
        .c-out { color: #ef4444; }

        .bk-ledger-scroll { max-height: 400px; overflow-y: auto; padding-right: 8px; margin-right: -4px; }
        .bk-ledger-scroll::-webkit-scrollbar { width: 6px; }
        .bk-ledger-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        .bk-filter-tabs { 
            display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 12px; margin-bottom: 16px; 
            border-bottom: 1px solid #f1f5f9; scrollbar-width: none; -ms-overflow-style: none;
        }
        .bk-filter-tabs::-webkit-scrollbar { display: none; }
        .tab-btn { 
            padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; 
            font-size: 0.75rem; font-weight: 700; color: #64748b; cursor: pointer; white-space: nowrap; transition: 0.2s;
        }
        .tab-btn.active { background: #1a6b5c; color: white; border-color: #1a6b5c; box-shadow: 0 4px 10px rgba(26,107,92,0.2); }
        
        .bk-search-row { display: grid; grid-template-columns: 1fr 130px; gap: 10px; margin-bottom: 16px; width: 100%; box-sizing: border-box; }
        .search-wrap { position: relative; width: 100%; min-width: 0; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: #94a3b8; }
        .search-wrap input { width: 100%; padding: 11px 12px 11px 36px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.85rem; outline: none; transition: 0.2s; box-sizing: border-box; }
        .search-wrap input:focus { border-color: #1a6b5c; box-shadow: 0 0 0 4px rgba(26,107,92,0.1); }
        .cat-sel { width: 100%; padding: 11px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.82rem; font-weight: 700; color: #1e293b; cursor: pointer; background: #f8fafc; outline: none; transition: 0.2s; box-sizing: border-box; }
        
        .lm-right { display: flex; align-items: center; gap: 12px; }
        .btn-del-mini { width: 24px; height: 24px; border-radius: 6px; border: none; background: #fee2e2; color: #ef4444; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; padding-bottom: 2px; }
        .btn-del-mini:hover { background: #dc2626; color: white; }

        @media print {
          @page { size: portrait; margin: 1cm; }
          nav, .rek-top, .stat-iuran-row, .filter-bar, .tabel-container, .bk-footer, 
          .bk-filter-tabs, .bk-search-row, .btn-del-mini, .bk-close-btn { display: none !important; }
          
          .report-overlay { position: static !important; inset: auto !important; background: white !important; padding: 0 !important; display: block !important; overflow: visible !important; }
          .buku-kas-box { 
            width: 100% !important; max-width: none !important; 
            height: auto !important; max-height: none !important; 
            box-shadow: none !important; border: none !important; 
            border-radius: 0 !important; padding: 0 !important; margin: 0 !important; 
            display: block !important; overflow: visible !important; 
            box-sizing: border-box !important;
          }
          .bk-bg-pattern { display: none !important; }
          .bk-header { padding: 0 0 20px 0 !important; border-bottom: 2px solid #000 !important; display: flex !important; }
          .bk-body { 
            padding: 20px 0 !important; 
            overflow: visible !important; height: auto !important; max-height: none !important; 
            display: block !important;
          }
          .bk-top-row, .bk-mid-row { display: block !important; width: 100% !important; }
          .bk-chart-card, .bk-pie-card { 
            margin-bottom: 24px !important; border: 1px solid #eee !important; 
            box-shadow: none !important; break-inside: avoid; 
            width: 100% !important; box-sizing: border-box !important;
          }
          .bk-ledger-card { 
            margin-top: 40px !important;
            break-before: page;
            page-break-before: always;
            border: 1px solid #eee !important; 
            box-shadow: none !important; 
            width: 100% !important; box-sizing: border-box !important;
          }
          .bk-ledger-scroll { max-height: none !important; overflow: visible !important; height: auto !important; }
          .saldo-utama-card { 
            background: #1a6b5c !important; color: #fff !important; 
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            margin-bottom: 24px; padding: 24px !important;
          }
          .su-items { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; }
          .su-item { background: rgba(0,0,0,0.05) !important; color: #000 !important; border: 1px solid #ddd !important; }
        }
      `}} />
    </div>
  );
}

export default Rekapitulasi;
