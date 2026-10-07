import { useEffect, useState } from 'react';
import { createShare } from '../data';
import { renderShareCard } from '../lib/shareCard';
import { copyText } from '../lib/share';
import { friendlyError } from '../lib/format';
import { ErrorNote, Icon, Sheet } from './ui';

/**
 * Prepares a short /s/<id> link with its own preview image, shows how it will
 * look in Messenger, and shares the (editable) message + link to the GC.
 * spec comes from lib/nudge.js.
 */
export function ShareSheet({ spec, onClose, flash }) {
  const [image, setImage] = useState(null);
  const [link, setLink] = useState('');
  const [message, setMessage] = useState(spec.message);
  const [error, setError] = useState('');

  // Make the card and the link as soon as the sheet opens, so "Share" works in one tap.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const img = await renderShareCard(spec.card);
        if (!alive) return;
        setImage(img);
        const url = await createShare({ title: spec.title, description: spec.description, path: spec.path, image: img, kind: spec.kind });
        if (alive) setLink(url);
      } catch (ex) {
        if (alive) setError(friendlyError(ex));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullText = `${message.trim()}\n${link}`;
  const host = typeof window !== 'undefined' ? window.location.host : '';

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: fullText });
        flash?.('Shared! 🎃');
        onClose();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    await copyText(fullText);
    flash?.('Copied! Paste it sa GC 📋');
    onClose();
  }

  async function copyOnly() {
    await copyText(fullText);
    flash?.('Message + link copied 📋');
  }

  return (
    <Sheet
      title={spec.heading}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={copyOnly} disabled={!link}>
            <Icon name="link" size={18} /> Copy
          </button>
          <button type="button" className="btn btn-primary" onClick={share} disabled={!link}>
            <Icon name="share" size={18} /> {link ? 'Share sa GC' : 'Preparing…'}
          </button>
        </>
      }
    >
      <ErrorNote>{error}</ErrorNote>

      <p className="field-label">How it looks in Messenger</p>
      <div className="link-preview" aria-label="Link preview">
        <div className="lp-image">{image ? <img src={image} alt="" /> : <span className="spin" aria-hidden>🎃</span>}</div>
        <div className="lp-text">
          <strong>{spec.title}</strong>
          <span>{spec.description}</span>
          <span className="lp-host">{host}</span>
        </div>
      </div>

      <label className="field share-msg">
        <span className="field-label">Message <span className="field-hint">edit if you like</span></span>
        <textarea className="input" rows={Math.min(9, message.split('\n').length + 1)} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <p className="muted small">The link goes at the end. Messenger shows the preview once you paste it.</p>
    </Sheet>
  );
}
