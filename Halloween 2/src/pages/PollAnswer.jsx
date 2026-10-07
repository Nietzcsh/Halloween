import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../session';
import { useLive } from '../hooks';
import { answerPoll } from '../data';
import { friendlyError } from '../lib/format';
import { Empty, ErrorNote, Icon, Loading, SuccessNote } from '../components/ui';

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
      <Empty icon="💀" title="This poll is gone" action={<Link to="/polls" className="btn btn-quiet">See all polls</Link>}>
        Rory may have deleted it.
      </Empty>
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
    <form className="poll-screen" onSubmit={submit}>
      <Link to="/polls" className="back-link">
        <Icon name="back" size={20} /> Polls
      </Link>

      <h1 className="poll-question">{p.question}</h1>
      {closed && <p className="muted">Rory closed this poll.</p>}

      {p.type === 'choice' ? (
        <div className="choices" role="radiogroup" aria-label={p.question}>
          {(p.options || []).map((opt) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={answer === opt}
              className={`choice ${answer === opt ? 'selected' : ''}`}
              onClick={() => choose(opt)}
              disabled={closed}
            >
              <span className="choice-radio" aria-hidden>{answer === opt && <Icon name="check" size={16} strokeWidth={2.6} />}</span>
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="input"
          rows={5}
          maxLength={500}
          value={answer}
          onChange={(e) => choose(e.target.value)}
          placeholder="Type your answer"
          disabled={closed}
        />
      )}

      <ErrorNote>{error}</ErrorNote>
      <SuccessNote>{saved ? 'Answer saved. Salamat! 🎃' : ''}</SuccessNote>

      {!closed && (
        <div className="bottom-action">
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || !answer.trim() || (!dirty && !!mine.data)}>
            {busy ? 'Saving…' : mine.data ? 'Update answer' : 'Submit answer'}
          </button>
        </div>
      )}
    </form>
  );
}
