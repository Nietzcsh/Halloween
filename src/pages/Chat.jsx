import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../session';
import { markChatSeen, millis, useMessages } from '../hooks';
import { deleteMessage, getPhoto, sendMessage, setMessagePinned } from '../data';
import { prepareChatPhoto } from '../lib/images';
import { friendlyError } from '../lib/format';
import { Avatar, Empty, ErrorNote, Icon, Loading, Sheet, SheetAction } from '../components/ui';
import { useDialog } from '../components/pickers';

const GROUP_GAP = 5 * 60 * 1000; // messages within 5 minutes from the same person stack together

function dayLabel(ms) {
  const d = new Date(ms);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}
const timeLabel = (ms) => new Date(ms).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

/** Group chat for friends and Rory. asAdmin = posting from the admin view (shows as Rory, organizer). */
export default function Chat({ asAdmin = false }) {
  const { uid, member, memberKey, isAdmin } = useSession();
  const { messages, error: loadError } = useMessages();
  const dialog = useDialog();

  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const firstLoad = useRef(true);

  const me = asAdmin ? { uid, name: 'Rory', fromAdmin: true } : { uid, memberKey, name: member?.name, fromAdmin: false };
  const isMine = (m) => m.uid === uid && !!m.fromAdmin === !!asAdmin;
  const pinned = useMemo(() => [...(messages || [])].reverse().find((m) => m.pinned), [messages]);

  // Opening the chat clears the dot; new messages while you're here count as seen.
  useEffect(() => {
    markChatSeen();
  }, [messages?.length]);

  // Jump to the newest message on open, and when new ones arrive (if you're near the bottom or it's yours).
  useLayoutEffect(() => {
    if (!messages?.length) return;
    const last = messages[messages.length - 1];
    const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 320;
    if (firstLoad.current || nearBottom || last.uid === uid) {
      endRef.current?.scrollIntoView({ block: 'end', behavior: firstLoad.current ? 'auto' : 'smooth' });
      firstLoad.current = false;
    }
  }, [messages, uid]);

  async function pickPhoto(files) {
    const file = files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setError('');
    try {
      setPhoto(await prepareChatPhoto(file));
    } catch (ex) {
      setError(ex.message);
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send(e) {
    e?.preventDefault();
    if ((!text.trim() && !photo) || sending) return;
    setSending(true);
    setError('');
    try {
      await sendMessage(me, text, photo);
      setText('');
      setPhoto(null);
    } catch (ex) {
      setError(friendlyError(ex));
    } finally {
      setSending(false);
    }
  }

  if (messages === undefined) return <Loading label="Loading the chika…" />;

  // Build rows: day separators + messages with "stacked" info.
  const rows = [];
  let prev = null;
  for (const m of messages || []) {
    const t = millis(m.createdAt) || Date.now();
    const day = dayLabel(t);
    if (!prev || dayLabel(millis(prev.createdAt) || Date.now()) !== day) rows.push({ type: 'day', key: `d-${day}-${m.id}`, label: day });
    const sameAuthor = prev && prev.uid === m.uid && !!prev.fromAdmin === !!m.fromAdmin && t - (millis(prev.createdAt) || t) < GROUP_GAP;
    rows.push({ type: 'msg', key: m.id, m, t, stacked: sameAuthor && rows[rows.length - 1]?.type === 'msg' });
    prev = m;
  }

  const canDelete = (m) => isAdmin || m.uid === uid;

  return (
    <div className="chat">
      <div className="page-head">
        <h1 className="page-title">💬 Chika</h1>
        <span className="muted small">Updates, pics, kwentuhan</span>
      </div>

      {pinned && (
        <button type="button" className="pinned" onClick={() => setSelected(pinned)}>
          <span className="pinned-icon" aria-hidden>📌</span>
          <span className="pinned-text">
            <strong>From Rory</strong>
            <span>{pinned.text || 'Photo'}</span>
          </span>
        </button>
      )}

      <ErrorNote>{loadError ? friendlyError(loadError) : ''}</ErrorNote>

      {rows.length === 0 ? (
        <Empty icon="👻" title="Walang chika pa">Say hi, post your costume, or ask about the plans.</Empty>
      ) : (
        <ol className="msgs" aria-label="Messages">
          {rows.map((r) =>
            r.type === 'day' ? (
              <li key={r.key} className="msg-day"><span>{r.label}</span></li>
            ) : (
              <MessageRow
                key={r.key}
                row={r}
                mine={isMine(r.m)}
                onOpen={() => setSelected(r.m)}
                onPhoto={() => setViewing(r.m.photo)}
              />
            ),
          )}
        </ol>
      )}
      <div ref={endRef} className="msgs-end" />

      <form className="composer" onSubmit={send}>
        {(photo || photoBusy) && (
          <div className="composer-photo">
            {photo ? <img src={photo.preview} alt="Photo to send" /> : <span className="muted small">Shrinking photo…</span>}
            {photo && (
              <button type="button" className="photo-x" onClick={() => setPhoto(null)} aria-label="Remove photo">
                <Icon name="close" size={14} strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
        <div className="composer-row">
          <button type="button" className="composer-btn" onClick={() => fileRef.current?.click()} disabled={photoBusy || sending} aria-label="Add a photo">
            <Icon name="image" size={24} />
          </button>
          <textarea
            className="composer-input"
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover: hover)').matches) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={asAdmin ? 'Post an update as Rory…' : 'Chika na…'}
            maxLength={1000}
            aria-label="Message"
          />
          <button type="submit" className="composer-send" disabled={sending || photoBusy || (!text.trim() && !photo)} aria-label="Send">
            <Icon name="send" size={22} strokeWidth={2} />
          </button>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files)} />
      </form>

      {selected && (
        <Sheet title={selected.fromAdmin ? 'Rory’s update' : `${selected.name}’s message`} onClose={() => setSelected(null)}>
          {selected.text && (
            <SheetAction
              icon="link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(selected.text);
                } catch {
                  /* ignore */
                }
                setSelected(null);
              }}
            >
              Copy text
            </SheetAction>
          )}
          {isAdmin && asAdmin && (
            <SheetAction
              icon="pin"
              onClick={async () => {
                await setMessagePinned(selected.id, !selected.pinned);
                setSelected(null);
              }}
            >
              {selected.pinned ? 'Unpin' : 'Pin to the top for everyone'}
            </SheetAction>
          )}
          {canDelete(selected) && (
            <SheetAction
              icon="trash"
              tone="blood"
              onClick={async () => {
                const m = selected;
                setSelected(null);
                const ok = await dialog.confirm({ title: 'Delete this message?', message: 'It disappears for everyone.', confirmLabel: 'Delete', danger: true });
                if (!ok) return;
                try {
                  await deleteMessage(m);
                } catch (ex) {
                  dialog.notify({ title: 'That didn’t work', message: friendlyError(ex) });
                }
              }}
            >
              Delete message
            </SheetAction>
          )}
        </Sheet>
      )}

      {viewing && <PhotoSheet photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function MessageRow({ row, mine, onOpen, onPhoto }) {
  const { m, t, stacked } = row;
  const who = m.fromAdmin ? 'Rory' : m.name;
  return (
    <li className={`msg ${mine ? 'is-mine' : ''} ${m.fromAdmin ? 'is-rory' : ''} ${stacked ? 'is-stacked' : ''}`}>
      {!mine && <span className="msg-avatar">{!stacked && <Avatar name={who} size="sm" />}</span>}
      <div className="msg-body">
        {!mine && !stacked && (
          <span className="msg-name">
            {who}
            {m.fromAdmin && <span className="msg-badge">🦇 Organizer</span>}
          </span>
        )}
        <div className="msg-bubble" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
          {m.pinned && <span className="msg-pin" aria-label="Pinned">📌</span>}
          {m.photo && (
            <button
              type="button"
              className="msg-photo"
              style={m.photo.w && m.photo.h ? { aspectRatio: `${m.photo.w} / ${m.photo.h}` } : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onPhoto();
              }}
              aria-label="Open photo"
            >
              <img src={m.photo.preview} alt="" loading="lazy" />
            </button>
          )}
          {m.text && <p className="msg-text">{m.text}</p>}
        </div>
        <span className="msg-time">{timeLabel(t)}</span>
      </div>
    </li>
  );
}

function PhotoSheet({ photo, onClose }) {
  const [src, setSrc] = useState(photo.preview);
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
    <Sheet title="Photo" onClose={onClose}>
      <div className="viewer">
        <img src={src} alt="" className={loading ? 'is-loading' : ''} />
      </div>
      {!loading && (
        <a className="btn btn-quiet btn-block" href={src} download="kemerut-photo.jpg">
          <Icon name="share" size={18} /> Save photo
        </a>
      )}
    </Sheet>
  );
}
