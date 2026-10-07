import { Link } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../session';
import { useLive, usePolls } from '../hooks';
import { Empty, Group, Icon, Loading, StatusPill } from '../components/ui';

/** All of Rory's questions. Open ones first. */
export default function Polls() {
  const { polls } = usePolls();
  if (!polls) return <Loading />;

  const open = polls.filter((p) => p.open);
  const closed = polls.filter((p) => !p.open);

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">🗳️ Polls</h1>
      </div>
      {polls.length === 0 ? (
        <Empty icon="🦉" title="No questions yet">Rory will post some soon.</Empty>
      ) : (
        <>
          {open.length > 0 && (
            <Group title="Open">
              {open.map((p) => <PollRow key={p.id} poll={p} />)}
            </Group>
          )}
          {closed.length > 0 && (
            <Group title="Closed">
              {closed.map((p) => <PollRow key={p.id} poll={p} />)}
            </Group>
          )}
        </>
      )}
    </div>
  );
}

function PollRow({ poll }) {
  const { memberKey } = useSession();
  const mine = useLive(() => doc(db, 'polls', poll.id, 'responses', memberKey), [poll.id, memberKey]);
  const answered = !!mine.data;

  return (
    <Link to={`/polls/${poll.id}`} className={`row row-link ${poll.open ? '' : 'is-dim'}`}>
      <span className="poll-num num">{poll.number}</span>
      <span className="row-main wrap">
        <strong>{poll.question}</strong>
        <span>{answered ? `You answered: ${mine.data.answer}` : poll.open ? 'Tap to answer' : 'You didn’t answer'}</span>
      </span>
      {poll.open && !answered && <StatusPill tone="pumpkin">Answer</StatusPill>}
      {answered && <Icon name="check" size={20} className="txt-ecto" />}
      <Icon name="chevron" size={18} className="muted" />
    </Link>
  );
}
