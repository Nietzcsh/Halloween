import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../session';
import { useLive } from '../hooks';
import { answerPoll } from '../data';
import { friendlyError } from '../lib/format';
import { Empty, ErrorNote, Loading } from '../components/ui';

export default function PollAnswer() {
  const { id } = useParams();
  const { memberKey } = useSession();
  const poll = useLive(() => doc(db, 'polls', id), [id]);
  const mine = useLive(() => doc(db, 'polls', id, 'responses', memberKey), [id, memberKey]);

  const [answer, setAnswer] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dirty && mine.data) setAnswer(mine.data.answer || '');
  }, [mine.data, dirty]);

  if (poll.data === undefined || mine.data === undefined) return <Loading />;
  if (!poll.data) {
    return (
      <div className="stack-lg">
        <Empty icon="💀">This poll doesn't exist anymore.</Empty>
        <Link to="/polls" className="btn btn-ghost">← All polls</Link>
      </div>
    );
  }

  const p = poll.data;
  const closed = !p.open;

  function choose(value) {
    setAnswer(value);
    setDirty(true);
    setSaved(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    setBusy(true);
    setError('');
    try {
      await answerPoll(id, memberKey, answer.trim());
      setSaved(true);
      setDirty(false);
    } catch (ex) {
      setError(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <form className="card stack poll-answer" onSubmit={submit}>
        <div className="row between">
          <span className="muted small">Poll</span>
          {closed && <span className="chip">Closed</span>}
        </div>
        <h1 className="poll-big-q">{p.question}</h1>

        {p.type === 'choice' ? (
          <div className="options" role="radiogroup">
            {(p.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={answer === opt}
                className={`option ${answer === opt ? 'selected' : ''}`}
                onClick={() => choose(opt)}
                disabled={closed}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className="input"
            rows={4}
            maxLength={500}
            value={answer}
            onChange={(e) => choose(e.target.value)}
            placeholder="Type your answer…"
            disabled={closed}
          />
        )}

        <ErrorNote>{error}</ErrorNote>
        {saved && <p className="success">Saved! Salamat 🎃</p>}
        {closed ? (
          <p className="muted small">Rory closed this poll{mine.data ? `. Your answer: ${mine.data.answer}` : ''}.</p>
        ) : (
          <button className="btn btn-primary" disabled={busy || !answer.trim() || (!dirty && !!mine.data)}>
            {busy ? 'Saving…' : mine.data ? 'Update answer' : 'Submit answer'}
          </button>
        )}
      </form>
      <Link to="/polls" className="btn btn-ghost">← All polls</Link>
    </div>
  );
}
