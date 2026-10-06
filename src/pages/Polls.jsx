import { Link } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../session';
import { useLive, usePolls } from '../hooks';
import { Empty, Loading } from '../components/ui';

/** Gallery of Rory's questions. Open ones first. */
export default function Polls() {
  const { polls } = usePolls();
  if (!polls) return <Loading />;

  const ordered = [...polls].sort((a, b) => Number(b.open) - Number(a.open) || a.number - b.number);

  return (
    <div className="stack-lg">
      <h1 className="page-title">🗳️ Polls</h1>
      {ordered.length === 0 ? (
        <Empty icon="🦉">No questions yet. Rory will post some soon.</Empty>
      ) : (
        <div className="poll-grid">
          {ordered.map((p) => <PollTile key={p.id} poll={p} />)}
        </div>
      )}
      <Link to="/" className="btn btn-ghost">← Back</Link>
    </div>
  );
}

function PollTile({ poll }) {
  const { memberKey } = useSession();
  const mine = useLive(() => doc(db, 'polls', poll.id, 'responses', memberKey), [poll.id, memberKey]);
  const answered = !!mine.data;

  return (
    <Link to={`/polls/${poll.id}`} className={`card poll-tile ${poll.open ? '' : 'closed'}`}>
      <div className="row between">
        <span className="poll-num">#{poll.number}</span>
        {!poll.open ? (
          <span className="chip">Closed</span>
        ) : answered ? (
          <span className="chip chip-paid">✓ Answered</span>
        ) : (
          <span className="chip chip-unpaid">Needs answer</span>
        )}
      </div>
      <h3 className="poll-q">{poll.question}</h3>
      {answered && <div className="muted small">Your answer: <b>{mine.data.answer}</b></div>}
    </Link>
  );
}
