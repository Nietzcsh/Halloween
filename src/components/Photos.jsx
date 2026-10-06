import { useEffect, useState } from 'react';
import { getPhoto } from '../data';
import { Modal } from './ui';

/** Small receipt-photo thumbnails; tap to open the full photo. */
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
            <img src={p.thumb} alt="Receipt" loading="lazy" />
          </button>
        ))}
      </div>
      {open && <Lightbox photo={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ photo, onClose }) {
  const [src, setSrc] = useState(photo.thumb);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getPhoto(photo.id)
      .then((data) => {
        if (alive && data) setSrc(data);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [photo.id]);

  return (
    <Modal title="Receipt photo" onClose={onClose} wide>
      <div className="lightbox">
        {loading && <p className="muted small">Loading full photo…</p>}
        <img src={src} alt="Receipt" />
      </div>
      {!loading && (
        <a className="btn btn-ghost btn-sm" href={src} download="receipt.jpg">Download photo</a>
      )}
    </Modal>
  );
}
