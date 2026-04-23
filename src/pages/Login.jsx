import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { loginUser, updateDutyStatus } from '../api/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [tempData, setTempData] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginUser(username, password);
      if (data.token) {
        if (data.user.role === 'satpam') {
          setTempData(data);
          setShowShiftPicker(true);
        } else {
          login(data);
          navigate(from, { replace: true });
        }
      } else {
        setError(data.error || 'Login gagal. Cek kembali username & password.');
      }
    } catch (err) {
      setError('Masalah koneksi ke server. Pastikan server aktif.');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftSelect = async (shift) => {
    setLoading(true);
    setError('');
    
    try {
        // Gunakan token langsung dari tempData (lebih aman dari race condition localStorage)
        const res = await updateDutyStatus(true, shift, tempData.token);
        
        if (res.error) {
            console.warn("Duty update returned error:", res.error);
        }

        // Simpan token ke localStorage untuk penggunaan global kedepannya
        localStorage.setItem('token', tempData.token);
        
        // Selesaikan login & masuk ke dashboard
        login(tempData);
        navigate(from, { replace: true });
    } catch (err) {
        console.error("Shift error fallback triggered:", err);
        // Fail-safe: Tetap izinkan login meskipun update duty di server gagal
        localStorage.setItem('token', tempData.token);
        login(tempData);
        navigate(from, { replace: true });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg shadow-overlay"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="login-container"
      >
        <div className="login-card">
          <div className="login-header">
            <div className="brand-circle">
               <img src="/assets/Logo.png" alt="Logo" />
            </div>
            <h1>Portal Citragraha</h1>
            <p>Silakan masuk untuk mengakses fitur perumahan</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="login-error"
                >
                  <span className="error-icon">⚠️</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-field">
              <label>Username</label>
              <div className="input-wrap">
                <span className="i-icon">👤</span>
                <input 
                  type="text" 
                  required 
                  placeholder="Masukkan username..." 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="input-field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="i-icon">🔒</span>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={`login-btn ${loading ? 'is-loading' : ''}`}>
              {loading ? (
                <div className="loader-small"></div>
              ) : (
                'Masuk ke Akun'
              )}
            </button>
          </form>

          <AnimatePresence>
            {showShiftPicker && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="shift-picker-overlay"
              >
                <div className="shift-card">
                   <h2>🕒 Pilih Shift Tugas</h2>
                   <p>Halo <strong>{tempData?.user.nama}</strong>, silakan pilih shift tugas Anda saat ini.</p>
                   <div className="shift-options">
                      <button className="shift-opt" onClick={() => handleShiftSelect('PAGI (08:00 - 16:00)')}>☀️ Pagi</button>
                      <button className="shift-opt" onClick={() => handleShiftSelect('SORE (16:00 - 00:00)')}>🌇 Sore</button>
                      <button className="shift-opt" onClick={() => handleShiftSelect('MALAM (00:00 - 08:00)')}>🌑 Malam</button>
                   </div>
                   <button className="btn-cancel-shift" onClick={() => setShowShiftPicker(false)}>Batal</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="login-footer">
            <p>Lupa password? <a href="https://wa.me/6287822595073?text=Halo%20Pengurus%2C%20saya%20lupa%20password%20akun%20Portal%20Citragraha.%20Bisa%20bantu%20reset?" target="_blank" rel="noopener noreferrer">Hubungi Pengurus Komplek</a></p>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-page { 
          min-height: 100vh; display: flex; align-items: center; justify-content: center; 
          position: relative; overflow: hidden; font-family: 'Inter', sans-serif;
        }
        .login-bg { 
          position: absolute; inset: 0; 
          background: linear-gradient(135deg, #1a6b5c 0%, #2ec4b6 100%);
          background-image: url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
          background-size: cover; background-position: center;
          z-index: -1;
        }
        .shadow-overlay { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); }

        .login-container { width: 100%; max-width: 440px; padding: 24px; z-index: 10; }
        .login-card { 
          background: white; border-radius: 32px; padding: 48px; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255,255,255,0.1);
        }

        .login-header { text-align: center; margin-bottom: 36px; }
        .brand-circle { width: 72px; height: 72px; background: #f0fdf4; border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .brand-circle img { width: 54px; height: 54px; object-fit: contain; }
        .login-header h1 { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        .login-header p { font-size: 0.95rem; color: #64748b; font-weight: 500; }

        .login-form { display: flex; flex-direction: column; gap: 24px; }
        .login-error { background: #fee2e2; color: #ef4444; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
        
        .input-field { display: flex; flex-direction: column; gap: 8px; }
        .input-field label { font-size: 0.85rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        .input-wrap { position: relative; }
        .i-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.1rem; }
        .input-wrap input { 
          width: 100%; padding: 16px 16px 16px 48px; border: 2.5px solid #f1f5f9; border-radius: 16px; 
          font-size: 1rem; font-family: inherit; font-weight: 600; color: #1e293b; transition: all 0.2s; background: #f8fafc; outline: none; box-sizing: border-box;
        }
        .input-wrap input:focus { border-color: #1a6b5c; background: white; box-shadow: 0 0 0 4px rgba(26,107,92,0.1); }

        .login-btn { 
          background: #1a6b5c; color: white; border: none; padding: 18px; border-radius: 16px; 
          font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 8px;
          box-shadow: 0 10px 15px -3px rgba(26,107,92, 0.4); 
        }
        .login-btn:hover:not(:disabled) { transform: translateY(-2px); background: #15574b; box-shadow: 0 15px 25px -5px rgba(26,107,92, 0.5); }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .loader-small { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer { margin-top: 32px; text-align: center; font-size: 0.9rem; color: #64748b; font-weight: 500; }
        .login-footer a { color: #1a6b5c; text-decoration: none; font-weight: 700; }
        .login-footer a:hover { text-decoration: underline; }

        .shift-picker-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95); z-index: 9999;
          display: flex; align-items: center; justify-content: center; padding: 20px;
          backdrop-filter: blur(10px);
        }
        .shift-card { background: white; border-radius: 32px; padding: 40px; width: 100%; max-width: 400px; text-align: center; }
        .shift-card h2 { font-size: 1.5rem; font-weight: 900; color: #1e293b; margin-bottom: 12px; }
        .shift-card p { color: #64748b; font-size: 0.95rem; margin-bottom: 30px; line-height: 1.5; }
        .shift-options { display: flex; flex-direction: column; gap: 12px; }
        .shift-opt { 
          background: #f8fafc; border: 2.5px solid #f1f5f9; padding: 16px; border-radius: 16px; 
          font-weight: 800; color: #1e293b; cursor: pointer; transition: 0.2s; font-size: 1rem;
        }
        .shift-opt:hover { border-color: #1a6b5c; background: #f0f7f4; color: #1a6b5c; transform: translateY(-2px); }
        .btn-cancel-shift { margin-top: 20px; background: none; border: none; color: #94a3b8; font-weight: 700; cursor: pointer; font-size: 0.9rem; }
        .btn-cancel-shift:hover { color: #ef4444; }
      `}} />
    </div>
  );
};

export default Login;
