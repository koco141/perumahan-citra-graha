import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchNewsById } from '../api/api';
import { ArrowLeft, Calendar, Tag, Share2, Copy, Check } from 'lucide-react';

const BeritaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const data = await fetchNewsById(id);
        if (data.error) throw new Error(data.error);
        setNews(data);
      } catch (err) {
        setError('Berita tidak ditemukan atau terjadi kesalahan.');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
    window.scrollTo(0, 0);
  }, [id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: news.title,
        text: news.desc.substring(0, 100) + '...',
        url: window.location.href,
      }).catch(console.error);
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="bd-loading">
      <div className="spinner"></div>
      <p>Memuat berita...</p>
    </div>
  );

  if (error || !news) return (
    <div className="bd-error">
      <div className="be-icon">❌</div>
      <h2>Oops!</h2>
      <p>{error || 'Berita tidak ditemukan.'}</p>
      <button onClick={() => navigate('/berita')} className="btn-back">Kembali ke Berita</button>
    </div>
  );

  return (
    <div className="bd-container">
      <div className="bd-content-wrap">
        {/* Navigation */}
        <button className="bd-back-nav" onClick={() => navigate('/berita')}>
          <ArrowLeft size={20} />
          <span>Kembali</span>
        </button>

        {/* Hero Image */}
        <div className="bd-hero">
          <div className="bd-hero-img" style={{ backgroundImage: `url(${news.img})` }}></div>
          <div className="bd-hero-overlay"></div>
          <div className="bd-hero-info">
             <span className={`nc-cat ${news.category.toLowerCase()}`}>{news.category}</span>
             <h1 className="bd-title">{news.title}</h1>
             <div className="bd-meta">
                <span className="bd-meta-item"><Calendar size={16} /> {news.date}</span>
                <span className="bd-meta-item"><Tag size={16} /> {news.category}</span>
             </div>
          </div>
        </div>

        {/* Article Body */}
        <div className="bd-body">
          <div className="bd-main">
            <div className="bd-article">
              {news.desc.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            
            {/* Share Section */}
            <div className="bd-share-section">
               <h3>Bagikan Berita Ini</h3>
               <div className="bd-share-btns">
                  <button className="share-btn native" onClick={handleShare}>
                    <Share2 size={18} /> Bagikan
                  </button>
                  <button className={`share-btn copy ${copied ? 'success' : ''}`} onClick={copyToClipboard}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Tersalin!' : 'Salin Link'}
                  </button>
               </div>
            </div>
          </div>

          {/* Sidebar / More Info could go here */}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .bd-container { min-height: 100vh; background: #f8fafc; padding-bottom: 100px; }
        .bd-content-wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
        
        .bd-back-nav { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #64748b; font-weight: 700; cursor: pointer; margin-bottom: 24px; transition: 0.2s; padding: 8px 0; }
        .bd-back-nav:hover { color: #1a6b5c; transform: translateX(-4px); }

        .bd-hero { position: relative; height: 450px; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1); margin-bottom: 40px; }
        .bd-hero-img { width: 100%; height: 100%; background-size: cover; background-position: center; }
        .bd-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.8)); }
        
        .bd-hero-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; color: white; }
        .bd-title { font-size: 2.5rem; font-weight: 900; margin: 15px 0; line-height: 1.2; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        
        .bd-meta { display: flex; gap: 20px; opacity: 0.9; }
        .bd-meta-item { display: flex; align-items: center; gap: 6px; font-size: 0.95rem; font-weight: 600; }

        .bd-body { background: white; border-radius: 32px; padding: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .bd-article { font-size: 1.15rem; color: #334155; line-height: 1.8; margin-bottom: 50px; }
        .bd-article p { margin-bottom: 24px; }

        .bd-share-section { border-top: 1px solid #f1f5f9; padding-top: 30px; }
        .bd-share-section h3 { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 16px; }
        .bd-share-btns { display: flex; gap: 12px; }
        
        .share-btn { display: flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.2s; border: none; }
        .share-btn.native { background: #1a6b5c; color: white; }
        .share-btn.native:hover { background: #145248; transform: translateY(-2px); }
        .share-btn.copy { background: #f1f5f9; color: #475569; }
        .share-btn.copy:hover { background: #e2e8f0; }
        .share-btn.copy.success { background: #dcfce7; color: #166534; }

        .bd-loading, .bd-error { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #1a6b5c; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .btn-back { margin-top: 20px; padding: 12px 24px; background: #1a6b5c; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
        
        .nc-cat { padding: 6px 14px; border-radius: 10px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: white; }
        .nc-cat.pengumuman { background: #ef4444; }
        .nc-cat.kegiatan { background: #3b82f6; }
        .nc-cat.warga { background: #10b981; }

        @media (max-width: 768px) {
          .bd-hero { height: 350px; border-radius: 0; margin-left: -20px; margin-right: -20px; }
          .bd-title { font-size: 1.8rem; }
          .bd-body { padding: 30px 20px; border-radius: 0; margin-left: -20px; margin-right: -20px; }
        }
      `}} />
    </div>
  );
};

export default BeritaDetail;
