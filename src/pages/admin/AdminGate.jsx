import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../session';
import { unlockAdmin } from '../../data';
import { friendlyError } from '../../lib/format';
import { ErrorNote, Loading } from '../../components/ui';
import AdminApp from './AdminApp';

export default function AdminGate() {
  const { ready, isAdmin, uid, authError } = useSession();
  if (authError) return <div className="page center"><p className="error">{friendlyError(authError)}</p></div>;
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
      setError(ex.message === 'Wrong PIN' ? 'Wrong PIN 💀' : friendlyError(ex));
      setBusy(false);
    }
  }

  return (
    <div className="join">
      <div className="join-inner">
        <div className="hero-emoji" aria-hidden>🦇</div>
        <h1 className="spooky hero-title">Rory Admin</h1>
        <form className="card stack join-card" onSubmit={submit}>
          <label className="label" htmlFor="pin">Secret PIN</label>
          <input
            id="pin"
            className="input input-lg"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-primary btn-lg" disabled={busy || !pin}>{busy ? 'Checking…' : 'Unlock'}</button>
          <p className="muted tiny center-text">This phone stays unlocked until you tap Lock.</p>
        </form>
        <Link to="/" className="btn btn-ghost">← Friend view</Link>
      </div>
    </div>
  );
}
