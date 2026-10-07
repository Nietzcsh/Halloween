import { useState } from 'react';
import { useSession } from '../session';
import { joinGroup, NameTakenError } from '../data';
import { cleanName, nameKey } from '../lib/names';
import { daysUntilParty, friendlyError } from '../lib/format';
import { ErrorNote } from '../components/ui';

export default function Join() {
  const { uid } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const days = daysUntilParty();

  async function submit(e) {
    e.preventDefault();
    setError('');
    const clean = cleanName(name);
    if (!nameKey(clean)) {
      setError('Use letters or numbers for your name.');
      return;
    }
    setBusy(true);
    try {
      await joinGroup(uid, clean);
      // The session listener notices the new link and swaps this screen out.
    } catch (ex) {
      if (ex instanceof NameTakenError) {
        setError(
          `“${clean}” is already taken. Add your last initial, like “${clean} B.” If that's you on a new phone, ask Rory to reset your phone.`,
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
        <h1 className="wordmark wordmark-xl">Rory's Halloween Kemerut</h1>
        <p className="join-date">Sat, Oct 31 · Club night 🦇</p>
        {days > 0 && <p className="countdown">{days} {days === 1 ? 'day' : 'days'} to go 👻</p>}

        <form className="join-card" onSubmit={submit}>
          <label className="field-label" htmlFor="name">Enter your name to join rory's halloween kemerut</label>
          <input
            id="name"
            className="input input-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ana"
            maxLength={30}
            autoComplete="given-name"
            enterKeyHint="go"
            autoFocus
          />
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || !name.trim()}>
            {busy ? 'Joining…' : 'Join the party 👻'}
          </button>
          <p className="muted small center">This phone will remember you, so you only do this once.</p>
        </form>
      </div>
    </div>
  );
}
