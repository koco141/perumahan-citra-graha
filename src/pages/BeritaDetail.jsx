import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchNewsById, incrementNewsView } from '../api/api';
import { ArrowLeft, Share2, Copy, Check } from 'lucide-react';

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
        // Increment view
        incrementNewsView(id);
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
    if (news && navigator.share) {
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

  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    const date = dateString.includes('T') ? new Date(dateString) : new Date();
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  if (loading) return (
    <div className="detik-loading">
      <div className="spinner"></div>
      <p>Memuat berita...</p>
    </div>
  );

  if (error || !news) return (
    <div className="detik-error">
      <h2>Oops!</h2>
      <p>{error || 'Berita tidak ditemukan.'}</p>
      <button onClick={() => navigate('/berita')} className="btn-back">Kembali ke Berita</button>
    </div>
  );

  return (
    <div className="detik-container">
      <div className="detik-wrap">
        {/* Navigation */}
        <button className="detik-back" onClick={() => navigate('/berita')}>
          <ArrowLeft size={18} /> Kembali
        </button>

        <article className="detik-article">
          {/* Header Info */}
          <header className="detik-header">
            <h1 className="detik-title">{news.title}</h1>
            
            <div className="detik-meta-top">
              <span className="detik-author">{news.author || 'Tim Citragraha'}</span>
              <span className="detik-sep">-</span>
              <span className="detik-category">{news.category}</span>
            </div>
            
            <div className="detik-date">
              {formatFullDate(news.date)}
              <span className="detik-sep">|</span>
              <span className="detik-views">👁️ {news.views || 0} kali dibaca</span>
            </div>
          </header>

          {/* Main Image Section */}
          <div className="detik-media">
            <img src={news.img} alt={news.title} className="detik-main-img" />
            <div className="detik-caption">
              Foto: {news.img_caption || news.imgCaption || 'Ilustrasi Citragraha'}
            </div>
          </div>

          {/* Article Body */}
          <div className="detik-body">
            {news.desc.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Footer / Share */}
          <div className="detik-footer">
            <div className="detik-share-label">Bagikan Berita Ini:</div>
            <div className="detik-share-btns">
              <button className="detik-btn-share native" onClick={handleShare}>
                <Share2 size={18} /> Sebarkan Berita
              </button>
              <button className={`detik-btn-share copy ${copied ? 'success' : ''}`} onClick={copyToClipboard}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Link Tersalin!' : 'Salin Link'}
              </button>
            </div>
          </div>
        </article>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .detik-container { background: white; min-height: 100vh; padding-bottom: 100px; font-family: 'Inter', sans-serif; }
        .detik-wrap { max-width: 800px; margin: 0 auto; padding: 20px; }
        
        .detik-back { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #64748b; font-weight: 700; cursor: pointer; margin-bottom: 30px; transition: 0.2s; padding: 8px 0; font-size: 0.9rem; }
        .detik-back:hover { color: #1a6b5c; transform: translateX(-4px); }

        .detik-header { text-align: center; margin-bottom: 40px; }
        .detik-title { font-size: 2.8rem; font-weight: 900; color: #1a6b5c; line-height: 1.2; margin-bottom: 20px; letter-spacing: -1px; }
        
        .detik-meta-top { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; font-size: 1.05rem; }
        .detik-author { font-weight: 700; color: #334155; }
        .detik-sep { color: #cbd5e0; }
        .detik-category { font-weight: 800; color: #2563eb; }
        
        .detik-date { color: #94a3b8; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .detik-views { font-weight: 700; color: #64748b; }

        .detik-media { margin-bottom: 40px; }
        .detik-main-img { width: 100%; border-radius: 4px; display: block; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .detik-caption { text-align: center; font-size: 0.85rem; color: #64748b; margin-top: 12px; font-weight: 500; font-style: italic; }

        .detik-body { font-size: 1.25rem; color: #1e293b; line-height: 1.8; text-align: justify; margin-bottom: 60px; }
        .detik-body p { margin-bottom: 28px; }

        .detik-footer { border-top: 2px solid #f1f5f9; padding-top: 40px; text-align: center; }
        .detik-share-label { font-weight: 800; color: #1e293b; margin-bottom: 20px; font-size: 1.1rem; }
        .detik-share-btns { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
        
        .detik-btn-share { display: flex; align-items: center; gap: 10px; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; border: none; font-size: 1rem; }
        .detik-btn-share.native { background: #1a6b5c; color: white; box-shadow: 0 10px 20px rgba(26,107,92,0.2); }
        .detik-btn-share.native:hover { background: #145248; transform: translateY(-3px); box-shadow: 0 15px 30px rgba(26,107,92,0.3); }
        .detik-btn-share.copy { background: #f1f5f9; color: #475569; }
        .detik-btn-share.copy:hover { background: #e2e8f0; }
        .detik-btn-share.copy.success { background: #dcfce7; color: #166534; }

        .detik-loading, .detik-error { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #1a6b5c; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .detik-title { font-size: 2rem; }
          .detik-body { font-size: 1.15rem; text-align: left; }
          .detik-wrap { padding: 15px; }
        }
      `}} />
    </div>
  );
};

export default BeritaDetail;
