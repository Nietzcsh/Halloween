import { useEffect, useState } from 'react';
import { getPhoto } from '../data';
import { Icon, Sheet } from './ui';

/** Receipt-photo thumbnails; tap one to see the full photo. */
export function PhotoThumbs({ photos = [] }) {
  const [open, setOpen] = useState(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="thumbs">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            className="thumb"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(p);
            }}
            aria-label="Open receipt photo"
          >
            <img src={p.thumb} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open && <PhotoViewer photo={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function PhotoViewer({ photo, onClose }) {
  const [src, setSrc] = useState(photo.thumb);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getPhoto(photo.id)
      .then((data) => alive && data && setSrc(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [photo.id]);

  return (
    <Sheet title="Receipt photo" onClose={onClose}>
      <div className="viewer">
        <img src={src} alt="Receipt" className={loading ? 'is-loading' : ''} />
        {loading && <p className="muted small">Loading full photo…</p>}
      </div>
      {!loading && (
        <a className="btn btn-quiet btn-block" href={src} download="receipt.jpg">
          <Icon name="share" size={18} /> Download photo
        </a>
      )}
    </Sheet>
  );
}
