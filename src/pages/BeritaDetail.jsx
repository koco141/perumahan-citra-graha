import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchNewsById, incrementNewsView, incrementNewsLike, fetchComments, postComment } from '../api/api';
import { ArrowLeft, Share2, Copy, Check, Heart, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BeritaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState(user?.nama || '');
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const data = await fetchNewsById(id);
        if (data.error) throw new Error(data.error);
        setNews(data);
        incrementNewsView(id);
        
        const comms = await fetchComments(id);
        setComments(comms);
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

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await incrementNewsLike(id);
      setNews(prev => ({ ...prev, likes: (prev.likes || 0) + 1 }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentName || !commentText) return;
    try {
      await postComment(id, { nama: commentName, content: commentText });
      const newComms = await fetchComments(id);
      setComments(newComms);
      setCommentText('');
    } catch (err) {
      console.error(err);
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

          {/* Interactions (Like/Comment Count) */}
          <div className="detik-interactions">
            <button className={`detik-btn-like ${isLiking ? 'liking' : ''}`} onClick={handleLike}>
              <Heart size={20} fill={news.likes > 0 ? "#1a6b5c" : "none"} />
              <span>{news.likes || 0} Suka</span>
            </button>
            <div className="detik-comment-count">
              <MessageCircle size={20} />
              <span>{comments.length} Komentar</span>
            </div>
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

          {/* Comment Section */}
          <div className="detik-comments-section">
            <h3 className="section-title">Diskusi Warga</h3>
            
            {news.category === 'Keamanan' ? (
              <div className="comment-disabled-msg">
                🔒 Komentar dinonaktifkan untuk kategori Keamanan demi privasi dan kondusivitas.
              </div>
            ) : (
              <form className="comment-form" onSubmit={handleComment}>
                <div className="form-row">
                  <input 
                    type="text" 
                    placeholder="Nama Anda..." 
                    value={commentName} 
                    onChange={e => setCommentName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <textarea 
                    placeholder="Tulis pendapat atau tanggapan Anda..." 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn-send-comment">
                  <Send size={18} /> Kirim Komentar
                </button>
              </form>
            )}

            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map(c => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">{c.nama.charAt(0).toUpperCase()}</div>
                    <div className="comment-content">
                      <div className="comment-meta">
                        <span className="comment-author">{c.nama}</span>
                        <span className="comment-date">{getRelativeTime(c.date)}</span>
                      </div>
                      <p className="comment-text">{c.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-comments">Belum ada diskusi. Jadilah yang pertama memberikan tanggapan!</div>
              )}
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

        .detik-body { font-size: 1.25rem; color: #1e293b; line-height: 1.8; text-align: justify; margin-bottom: 40px; }
        .detik-body p { margin-bottom: 28px; }

        .detik-interactions { display: flex; gap: 30px; padding: 20px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; margin-bottom: 40px; }
        .detik-btn-like, .detik-comment-count { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #64748b; font-size: 1.1rem; }
        .detik-btn-like { background: none; border: none; cursor: pointer; transition: 0.2s; padding: 5px 10px; border-radius: 8px; }
        .detik-btn-like:hover { background: #f1f5f9; color: #1a6b5c; }
        .detik-btn-like.liking { color: #1a6b5c; transform: scale(1.1); }
        
        .detik-footer { padding-top: 20px; text-align: center; margin-bottom: 60px; }
        .detik-share-label { font-weight: 800; color: #1e293b; margin-bottom: 20px; font-size: 1.1rem; }
        .detik-share-btns { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
        
        .detik-btn-share { display: flex; align-items: center; gap: 10px; padding: 14px 28px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; border: none; font-size: 1rem; }
        .detik-btn-share.native { background: #1a6b5c; color: white; box-shadow: 0 10px 20px rgba(26,107,92,0.2); }
        .detik-btn-share.native:hover { background: #145248; transform: translateY(-3px); box-shadow: 0 15px 30px rgba(26,107,92,0.3); }
        .detik-btn-share.copy { background: #f1f5f9; color: #475569; }
        .detik-btn-share.copy:hover { background: #e2e8f0; }
        .detik-btn-share.copy.success { background: #dcfce7; color: #166534; }

        .detik-comments-section { border-top: 8px solid #f8fafc; padding-top: 40px; }
        .section-title { font-size: 1.6rem; font-weight: 900; color: #1a6b5c; margin-bottom: 30px; letter-spacing: -0.5px; }
        
        .comment-disabled-msg { background: #f1f5f9; color: #64748b; padding: 20px; border-radius: 12px; font-weight: 600; text-align: center; border: 1px dashed #cbd5e1; }
        
        .comment-form { background: #f8fafc; padding: 30px; border-radius: 20px; margin-bottom: 40px; border: 1px solid #f1f5f9; }
        .comment-form .form-row { margin-bottom: 15px; }
        .comment-form input, .comment-form textarea { width: 100%; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 1rem; outline: none; transition: 0.2s; }
        .comment-form input:focus, .comment-form textarea:focus { border-color: #1a6b5c; box-shadow: 0 0 0 4px rgba(26,107,92,0.1); }
        .comment-form textarea { height: 120px; resize: vertical; }
        .btn-send-comment { display: flex; align-items: center; gap: 10px; background: #1a6b5c; color: white; padding: 14px 28px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-send-comment:hover { background: #145248; transform: translateY(-2px); }

        .comments-list { display: flex; flex-direction: column; gap: 25px; }
        .comment-item { display: flex; gap: 20px; animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .comment-avatar { min-width: 50px; height: 50px; background: #1a6b5c; color: white; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.2rem; }
        .comment-content { flex-grow: 1; }
        .comment-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .comment-author { font-weight: 800; color: #1e293b; font-size: 1.05rem; }
        .comment-date { font-size: 0.85rem; color: #94a3b8; font-weight: 600; }
        .comment-text { font-size: 1.05rem; color: #475569; line-height: 1.6; }
        
        .no-comments { text-align: center; color: #94a3b8; padding: 40px; font-weight: 600; font-style: italic; }

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
