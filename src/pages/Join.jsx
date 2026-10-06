import { useState } from 'react';
import { useSession } from '../session';
import { joinGroup, NameTakenError } from '../data';
import { cleanName, nameKey } from '../lib/names';
import { friendlyError } from '../lib/format';
import { ErrorNote } from '../components/ui';

export default function Join() {
  const { uid } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const clean = cleanName(name);
    if (!nameKey(clean)) {
      setError('Please type a name using letters or numbers.');
      return;
    }
    setBusy(true);
    try {
      await joinGroup(uid, clean);
      // The session listener notices the new link and swaps this screen out automatically.
    } catch (ex) {
      if (ex instanceof NameTakenError) {
        setError(
          `“${clean}” is already taken. Add your last initial (like “${clean} B.”). If that's you on a new phone, ask Rory to reset your device.`,
        );
      } else {
        setError(friendlyError(ex));
      }
      setBusy(false);
    }
  }

  return (
    <div className="join">
      <div className="join-inner">
        <div className="hero-emoji" aria-hidden>🎃</div>
        <h1 className="spooky hero-title">Rory's Halloween Kemerut</h1>
        <p className="muted">Sat, Oct 31 · Club night 🦇</p>

        <form className="card stack join-card" onSubmit={submit}>
          <label className="label" htmlFor="name">Enter your name to join rory's halloween kemerut</label>
          <input
            id="name"
            className="input input-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ana"
            maxLength={30}
            autoComplete="given-name"
            autoFocus
          />
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-primary btn-lg" disabled={busy || !name.trim()}>
            {busy ? 'Joining…' : 'Join the party 👻'}
          </button>
          <p className="muted tiny center-text">This phone will remember you, so you only do this once.</p>
        </form>
      </div>
    </div>
  );
}
