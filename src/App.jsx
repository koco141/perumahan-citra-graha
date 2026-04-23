import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Rekapitulasi from './pages/Rekapitulasi';
import Keamanan from './pages/Keamanan';
import Berita from './pages/Berita';
import Login from './pages/Login';
import SuperAdmin from './pages/SuperAdmin';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { changePassword } from './api/api';

// ── Modal Ganti Password Paksa ────────────────────────────────────────────────
const ForceChangePasswordModal = () => {
  const { mustChangePassword, clearMustChange, user } = useAuth();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!mustChangePassword) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setLoading(true);
    try {
      // Gunakan password lama 'citragraha123' sebagai currentPassword untuk validasi bypass
      const res = await changePassword('citragraha123', newPass);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          clearMustChange();
        }, 1800);
      } else {
        setError(res.error || 'Gagal mengganti password.');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', padding: '40px',
        width: '420px', maxWidth: '95vw',
        boxShadow: '0 30px 80px rgba(0,0,0,0.25)'
      }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ color: '#1a6b5c', fontWeight: 900, margin: '0 0 8px' }}>Password Berhasil Diubah!</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Anda sekarang menggunakan password baru Anda.</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '18px',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', margin: '0 auto 16px'
              }}>🔑</div>
              <h2 style={{ fontWeight: 900, color: '#1e293b', margin: '0 0 8px', fontSize: '1.3rem' }}>
                Buat Password Baru
              </h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                Halo <strong>{user?.nama}</strong>! Admin telah mereset password Anda.<br />
                Silakan buat password baru untuk melanjutkan.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter..."
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  style={{
                    padding: '13px 16px', border: '2.5px solid #e2e8f0',
                    borderRadius: '14px', fontSize: '0.95rem', fontFamily: 'inherit',
                    outline: 'none', fontWeight: 600,
                    transition: '0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1a6b5c'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi password baru..."
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  style={{
                    padding: '13px 16px', border: `2.5px solid ${confirmPass && confirmPass !== newPass ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '14px', fontSize: '0.95rem', fontFamily: 'inherit',
                    outline: 'none', fontWeight: 600, transition: '0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1a6b5c'}
                  onBlur={e => e.target.style.borderColor = (confirmPass && confirmPass !== newPass) ? '#ef4444' : '#e2e8f0'}
                />
                {confirmPass && confirmPass !== newPass && (
                  <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: 0, fontWeight: 600 }}>
                    ⚠️ Password tidak cocok
                  </p>
                )}
              </div>

              {error && (
                <div style={{
                  background: '#fee2e2', color: '#ef4444', padding: '10px 14px',
                  borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #1a6b5c, #22c55e)',
                  color: 'white', border: 'none', padding: '15px',
                  borderRadius: '14px', fontWeight: 800, fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, marginTop: '4px'
                }}
              >
                {loading ? '⏳ Menyimpan...' : '🔒 Simpan Password Baru'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/berita" element={<Berita />} />
        <Route path="/login" element={<Login />} />

        {/* PROTECTED ROUTES (CITRA RESIDENTS & STAFF) */}
        <Route 
          path="/rekapitulasi" 
          element={
            <ProtectedRoute allowedRoles={['warga', 'pengurus', 'superadmin']}>
              <Rekapitulasi />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/keamanan" 
          element={
            <ProtectedRoute allowedRoles={['warga', 'pengurus', 'superadmin', 'satpam']}>
              <Keamanan />
            </ProtectedRoute>
          } 
        />

        {/* SUPER ADMIN ONLY */}
        <Route 
          path="/super-admin" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdmin />
            </ProtectedRoute>
          } 
        />
      </Routes>

      {/* Modal ganti password paksa — muncul global di atas semua halaman */}
      <ForceChangePasswordModal />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-shell">
          <AppShell />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

