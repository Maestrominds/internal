import { useState } from 'react';
import toast from 'react-hot-toast';

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  );
}

function SkeletonImg() {
  return <div className="skeleton skeleton-img" />;
}

function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  async function downloadImage(url, index) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `image-${index + 1}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Download failed');
    }
  }

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <div className="lightbox" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img
        className="lightbox-img"
        src={images[current].cloudinary_url}
        alt={`Image ${current + 1}`}
      />

      <div className="lightbox-controls">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => downloadImage(images[current].cloudinary_url, current)}
          style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
        >
          <DownloadIcon /> Download
        </button>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          style={{ color: '#fff', background: 'rgba(255,255,255,.12)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {images.length > 1 && (
        <div className="lightbox-nav">
          <button
            className="btn btn-ghost"
            onClick={prev}
            style={{ color: '#fff', background: 'rgba(255,255,255,.15)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            className="btn btn-ghost"
            onClick={next}
            style={{ color: '#fff', background: 'rgba(255,255,255,.15)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}

      <p style={{ position: 'fixed', bottom: '20px', color: 'rgba(255,255,255,.6)', fontSize: '0.85rem' }}>
        {current + 1} / {images.length}
      </p>
    </div>
  );
}

export default function ImageGallery({ images }) {
  const [loaded, setLoaded] = useState({});
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!images || images.length === 0) return null;

  async function downloadImage(url, index) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `image-${index + 1}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Download failed');
    }
  }

  return (
    <>
      <div className="image-grid">
        {images.map((img, idx) => (
          <div key={img.id} className="image-card">
            {!loaded[idx] && <SkeletonImg />}
            <img
              src={img.cloudinary_url}
              alt={`Report image ${idx + 1}`}
              style={{ display: loaded[idx] ? 'block' : 'none' }}
              onLoad={() => setLoaded((prev) => ({ ...prev, [idx]: true }))}
              onError={() => setLoaded((prev) => ({ ...prev, [idx]: true }))}
            />
            <div className="image-card-overlay">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setLightboxIdx(idx)}
                style={{ color: '#fff', background: 'rgba(255,255,255,.15)', borderRadius: '50%', width: '38px', height: '38px', padding: 0, justifyContent: 'center' }}
                title="View full size"
              >
                <ZoomIcon />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => downloadImage(img.cloudinary_url, idx)}
                style={{ color: '#fff', background: 'rgba(255,255,255,.15)', borderRadius: '50%', width: '38px', height: '38px', padding: 0, justifyContent: 'center' }}
                title="Download"
              >
                <DownloadIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}
