import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/api';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [passStatus, setPassStatus] = useState({ type: '', msg: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) {
      setPassStatus({ type: 'error', msg: 'Konfirmasi password tidak cocok!' });
      return;
    }
    if (passData.new.length < 4) {
      setPassStatus({ type: 'error', msg: 'Password minimal 4 karakter!' });
      return;
    }

    setIsSubmitting(true);
    setPassStatus({ type: '', msg: '' });
    try {
      const res = await changePassword(passData.old, passData.new);
      if (res.success) {
        setPassStatus({ type: 'success', msg: 'Password berhasil diubah!' });
        setTimeout(() => {
          setShowPassModal(false);
          setPassData({ old: '', new: '', confirm: '' });
          setPassStatus({ type: '', msg: '' });
        }, 2000);
      } else {
        setPassStatus({ type: 'error', msg: res.error || 'Gagal mengubah password' });
      }
    } catch (err) {
      setPassStatus({ type: 'error', msg: 'Terjadi kesalahan koneksi' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { to: '/', icon: '/assets/beranda.png', label: 'Beranda' },
    // Only show Keuangan & Keamanan to logged in users
    ...(user ? [
      ...(user.role !== 'satpam' ? [{ to: '/rekapitulasi', icon: '/assets/Keuangan.png', label: 'Keuangan' }] : []),
      { to: '/keamanan', icon: '/assets/Keamanan.png', label: 'Keamanan' },
    ] : []),
    { to: '/berita', icon: '/assets/Berita.png', label: 'Berita' },
    // Super Admin link
    ...(user?.role === 'superadmin' ? [
      { to: '/super-admin', icon: '/assets/Admin.png', label: 'Admin' }
    ] : [])
  ];

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-shadow' : ''}`}>
        <div className="navbar-inner">
          {/* Brand */}
          <Link to="/" className="nav-brand">
            <div className="brand-logo-container">
              <img src="/assets/Logo.png" alt="Logo Citragraha" className="brand-logo-img" />
            </div>
            <div className="brand-text">
              <span className="brand-main">Citragraha</span>
              <span className="brand-sub">Portal Terpadu</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="nav-links">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
              >
                {link.icon && <img src={link.icon} alt={link.label} className="nav-icon-img" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* User / Login Section */}
          <div className="nav-right">
            {user ? (
              <div className="user-nav-box">
                <div className="user-info-h">
                  <span className="u-name-h">{user.nama}</span>
                  <span className={`u-role-h ${user.role}`}>{user.role}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowPassModal(true)} className="btn-pass-h" title="Ganti Password">🔑</button>
                  <button onClick={handleLogout} className="btn-logout-h">Keluar</button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-masuk">
                👤 Masuk
              </Link>
            )}
            <button
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Change Password Modal */}
      {showPassModal && (
        <div className="modal-overlay" onClick={() => setShowPassModal(false)}>
          <div className="modal-box am-modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="modal-head">
              <h2 className="modal-title" style={{ fontSize: '1.4rem' }}>🔐 Ganti Password</h2>
              <button className="close-modal" onClick={() => setShowPassModal(false)}>✕</button>
            </div>

            <form onSubmit={handleChangePassword} className="modal-form" style={{ marginTop: '20px' }}>
              {passStatus.msg && (
                <div style={{
                  background: passStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: passStatus.type === 'success' ? '#166534' : '#ef4444',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textAlign: 'center'
                }}>
                  {passStatus.msg}
                </div>
              )}

              <div className="f-group">
                <label>Password Sekarang</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password lama..."
                  value={passData.old}
                  onChange={e => setPassData({ ...passData, old: e.target.value })}
                />
              </div>

              <div className="f-group">
                <label>Password Baru</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 4 karakter..."
                  value={passData.new}
                  onChange={e => setPassData({ ...passData, new: e.target.value })}
                />
              </div>

              <div className="f-group">
                <label>Konfirmasi Password Baru</label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi password baru..."
                  value={passData.confirm}
                  onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                />
              </div>

              <div className="modal-btns" style={{ marginTop: '10px' }}>
                <button type="submit" className="btn-save" disabled={isSubmitting}>
                  {isSubmitting ? '⏳ Memproses...' : 'Simpan Password'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowPassModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <button 
                onClick={() => { setMenuOpen(false); setShowPassModal(true); }} 
                className="mobile-link" 
                style={{ background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                🔐 Ganti Password
              </button>
              <button onClick={handleLogout} className="mobile-link-login" style={{ background: '#ef4444', border: 'none' }}>
                🚪 Keluar Akun
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-link-login">
              👤 Masuk / Login
            </Link>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #ffffff;
          border-bottom: 2px solid #e2e8f0;
          transition: box-shadow 0.2s;
        }
        .navbar-shadow {
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .brand-logo-container {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0fdf4;
          border-radius: 12px;
          padding: 4px;
        }
        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .brand-main {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1a6b5c;
          font-family: 'Inter', sans-serif;
        }
        .brand-sub {
          font-size: 0.85rem;
          font-weight: 500;
          color: #718096;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          justify-content: center;
        }
        .nav-link {
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          color: #4a5568;
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-icon-img {
          width: 22px;
          height: 22px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .nav-link:hover {
          background: #e8f8f6;
          color: #1a6b5c;
        }
        .nav-link.active {
          background: #1a6b5c;
          color: white;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .btn-masuk {
          background: #1a6b5c;
          color: white;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .btn-masuk:hover {
          background: #145248;
        }

        /* USER NAV BOX */
        .user-nav-box { display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 6px 16px; border-radius: 14px; border: 1px solid #e2e8f0; }
        .user-info-h { display: flex; flex-direction: column; }
        .u-name-h { font-size: 0.9rem; font-weight: 800; color: #1e293b; line-height: 1.2; }
        .u-role-h { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #64748b; }
        .u-role-h.superadmin { color: #ef4444; }
        .u-role-h.pengurus { color: #22c55e; }
        .btn-logout-h { background: #fee2e2; color: #ef4444; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .btn-logout-h:hover { background: #ef4444; color: white; }
        .btn-pass-h { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 1rem; }
        .btn-pass-h:hover { background: #e2e8f0; transform: translateY(-2px); }

        .hamburger {
          display: none;
          background: none;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          width: 48px;
          height: 48px;
          font-size: 1.4rem;
          color: #4a5568;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .hamburger:hover {
          background: #f7fafc;
        }
        .mobile-menu {
          position: fixed;
          top: 74px;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 2px solid #e2e8f0;
          z-index: 999;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .mobile-link {
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          color: #4a5568;
          background: #f7fafc;
          text-decoration: none;
          transition: all 0.15s;
        }
        .mobile-link:hover, .mobile-link.active {
          background: #1a6b5c;
          color: white;
        }
        .mobile-link-login {
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          background: #1a6b5c;
          color: white;
          text-align: center;
          text-decoration: none;
          margin-top: 8px;
        }
        @media (max-width: 860px) {
          .nav-links { display: none; }
          .user-nav-box { display: none; }
          .btn-masuk { display: none; }
          .hamburger { display: flex; }
        }
      ` }} />
    </>
  );
};

export default Navbar;
