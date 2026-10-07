import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../session';
import { unlockAdmin } from '../../data';
import { friendlyError } from '../../lib/format';
import { ErrorNote, Loading } from '../../components/ui';
import AdminApp from './AdminApp';

export default function AdminGate() {
  const { ready, isAdmin, uid, authError } = useSession();
  if (authError) return <div className="screen-center"><p className="note note-error">{friendlyError(authError)}</p></div>;
  if (!ready) return <Loading />;
  if (isAdmin) return <AdminApp />;
  return <PinForm uid={uid} />;
}

function PinForm({ uid }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await unlockAdmin(uid, pin);
    } catch (ex) {
      setError(ex.message === 'Wrong PIN' ? 'Wrong PIN 💀 Try again.' : friendlyError(ex));
      setBusy(false);
    }
  }

  return (
    <div className="join">
      <div className="join-inner">
      <div className="hero-emoji" aria-hidden>🦇</div>
      <h1 className="wordmark wordmark-xl">Rory Admin</h1>
      <p className="join-date">Organizer only 🕯️</p>
      <form className="join-card" onSubmit={submit}>
        <label className="field-label" htmlFor="pin">Secret PIN</label>
        <input
          id="pin"
          className="input input-lg"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="current-password"
          enterKeyHint="go"
          autoFocus
        />
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy || !pin}>{busy ? 'Checking…' : 'Unlock 🔓'}</button>
        <p className="muted small center">This phone stays unlocked until you lock it.</p>
      </form>
      <Link to="/" className="btn btn-quiet btn-block">Go to friend view</Link>
      </div>
    </div>
  );
}
