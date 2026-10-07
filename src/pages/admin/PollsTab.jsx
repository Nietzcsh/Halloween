import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useMembers, usePolls, useNameOf } from '../../hooks';
import { createPoll, deletePoll, setPollOpen } from '../../data';
import { pollShare } from '../../lib/nudge';
import { ShareSheet } from '../../components/ShareSheet';
import { friendlyError } from '../../lib/format';
import { Empty, ErrorNote, FullScreen, Icon, Loading, Segmented, Sheet, SheetAction, StatusPill } from '../../components/ui';
import { useDialog } from '../../components/pickers';

const PRESETS = [
  { label: 'Yes / No', options: ['Yes', 'No'] },
  { label: 'Yes / No / Maybe', options: ['Yes', 'No', 'Maybe'] },
  { label: 'Payment', options: ['Yes, I can pay', 'Not yet', 'Need more time'] },
];

export default function PollsTab({ flash }) {
  const { polls } = usePolls();
  const { members } = useMembers();
  const nameOf = useNameOf(members);
  const responses = usePollResponses(polls);
  const [view, setView] = useState('questions');
  const [creating, setCreating] = useState(false);

  if (!polls || !members) return <Loading />;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">🗳️ Polls</h1>
      </div>

      {polls.length === 0 ? (
        <Empty
          icon="🦉"
          title="No polls yet"
          action={
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={20} /> Ask the group something
            </button>
          }
        >
          Ask things like “Available Oct 31?” then send the link to the GC.
        </Empty>
      ) : (
        <>
          <Segmented
            full
            value={view}
            onChange={setView}
            options={[
              { value: 'questions', label: 'Questions' },
              { value: 'table', label: 'Answers table' },
            ]}
          />
          {view === 'questions' ? (
            <div className="stack">
              {[...polls].sort((a, b) => Number(b.open) - Number(a.open) || b.number - a.number).map((p) => (
                <PollAdminCard key={p.id} poll={p} answers={responses[p.id] || {}} total={members.length} nameOf={nameOf} members={members} flash={flash} />
              ))}
            </div>
          ) : (
            <ResultsTable polls={polls} members={members} responses={responses} nameOf={nameOf} />
          )}
        </>
      )}

      {polls.length > 0 && (
        <button type="button" className="fab" onClick={() => setCreating(true)}>
          <Icon name="plus" size={22} strokeWidth={2.2} />
          New poll
        </button>
      )}

      {creating && <NewPoll onClose={() => setCreating(false)} flash={flash} />}
    </div>
  );
}

/** pollId → { memberKey: answer }, live. */
function usePollResponses(polls) {
  const [responses, setResponses] = useState({});
  const ids = (polls || []).map((p) => p.id).join(',');
  useEffect(() => {
    if (!ids) return undefined;
    const unsubs = ids.split(',').map((id) =>
      onSnapshot(collection(db, 'polls', id, 'responses'), (snap) => {
        setResponses((r) => ({ ...r, [id]: Object.fromEntries(snap.docs.map((d) => [d.id, d.data().answer])) }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [ids]);
  return responses;
}

function NewPoll({ onClose, flash }) {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('choice');
  const [optionsText, setOptionsText] = useState('Yes\nNo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    const options = [...new Set(optionsText.split('\n').map((s) => s.trim()).filter(Boolean))];
    if (!question.trim()) return setError('Type a question.');
    if (type === 'choice' && options.length < 2) return setError('Add at least 2 options, one per line.');
    setBusy(true);
    try {
      await createPoll({ question: question.trim(), type, options });
      flash?.('Poll posted 🗳️');
      onClose();
    } catch (ex) {
      setError(friendlyError(ex));
      setBusy(false);
    }
  }

  return (
    <FullScreen
      title="New poll"
      onClose={onClose}
      primary={<button type="button" className="fs-save" onClick={submit} disabled={busy}>{busy ? 'Posting…' : 'Post'}</button>}
    >
      <div className="form">
        <ErrorNote>{error}</ErrorNote>
        <div className="fieldset">
          <label className="field">
            <span className="field-label">Question</span>
            <textarea className="input input-lg" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Are you available Oct 31?" maxLength={160} autoFocus />
          </label>
          <Segmented
            full
            value={type}
            onChange={setType}
            options={[
              { value: 'choice', label: 'Pick an option' },
              { value: 'text', label: 'Free text' },
            ]}
          />
          {type === 'choice' && (
            <>
              <div className="chip-row">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" className="chip-btn" onClick={() => setOptionsText(p.options.join('\n'))}>
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="field">
                <span className="field-label">Options <span className="field-hint">one per line</span></span>
                <textarea className="input" rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
              </label>
            </>
          )}
        </div>
      </div>
    </FullScreen>
  );
}

function PollAdminCard({ poll, answers, total, nameOf, members, flash }) {
  const [showWho, setShowWho] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const dialog = useDialog();
  const answered = Object.keys(answers).length;
  const tally = useMemo(() => {
    const t = {};
    for (const a of Object.values(answers)) t[a] = (t[a] || 0) + 1;
    return t;
  }, [answers]);
  const missing = members.filter((m) => !(m.key in answers));

  async function remove() {
    setMenu(false);
    const ok = await dialog.confirm({
      title: `Delete poll ${poll.number}?`,
      message: `“${poll.question}” and all ${answered} answer${answered === 1 ? '' : 's'} will be gone.`,
      confirmLabel: 'Delete poll',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePoll(poll.id);
      flash?.('Poll deleted');
    } catch (ex) {
      dialog.notify({ title: 'That didn’t work', message: friendlyError(ex) });
    }
  }

  return (
    <article className={`panel poll-card ${poll.open ? '' : 'is-dim'}`}>
      <div className="poll-card-head">
        <span className="poll-num num">{poll.number}</span>
        <h3 className="poll-card-q">{poll.question}</h3>
        <StatusPill tone={poll.open ? 'ecto' : 'neutral'}>{poll.open ? 'Open' : 'Closed'}</StatusPill>
      </div>

      <p className="muted small">{answered} of {total} answered</p>

      {poll.type === 'choice' && (
        <ul className="tally">
          {(poll.options || []).map((o) => {
            const n = tally[o] || 0;
            return (
              <li key={o}>
                <span className="tally-label">{o}</span>
                <span className="tally-bar"><span style={{ width: `${answered ? (n / answered) * 100 : 0}%` }} /></span>
                <span className="tally-n num">{n}</span>
              </li>
            );
          })}
        </ul>
      )}

      {showWho && (
        <ul className="who-list">
          {Object.entries(answers).map(([k, a]) => (
            <li key={k}><strong>{nameOf(k)}</strong><span>{a}</span></li>
          ))}
          {missing.map((m) => (
            <li key={m.key} className="is-missing"><strong>{m.name}</strong><span>No answer yet</span></li>
          ))}
        </ul>
      )}

      <div className="card-actions">
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowWho((s) => !s)}>
          {showWho ? 'Hide answers' : 'See answers'}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSharing(true)}>
          <Icon name="share" size={16} /> Share
        </button>
        <button type="button" className="btn btn-quiet btn-sm card-more" onClick={() => setMenu(true)} aria-label="More poll options">
          <Icon name="more" size={20} />
        </button>
      </div>

      {sharing && <ShareSheet spec={pollShare(poll)} onClose={() => setSharing(false)} flash={flash} />}
      {menu && (
        <Sheet title={`Poll ${poll.number}`} onClose={() => setMenu(false)}>
          <SheetAction
            icon={poll.open ? 'lock' : 'poll'}
            onClick={async () => {
              await setPollOpen(poll.id, !poll.open);
              setMenu(false);
              flash?.(poll.open ? 'Poll closed' : 'Poll reopened');
            }}
          >
            {poll.open ? 'Close poll (stop new answers)' : 'Reopen poll'}
          </SheetAction>
          <SheetAction icon="trash" tone="blood" onClick={remove}>Delete poll and its answers</SheetAction>
        </Sheet>
      )}
    </article>
  );
}

/** Rows = friends, columns = questions. Dash = hasn't answered. Scrolls sideways on phones. */
function ResultsTable({ polls, members, responses, nameOf }) {
  const extraKeys = new Set();
  for (const p of polls) for (const k of Object.keys(responses[p.id] || {})) extraKeys.add(k);
  members.forEach((m) => extraKeys.delete(m.key));
  const rows = [...members.map((m) => m.key), ...extraKeys];

  const cellClass = (a) => {
    if (!a) return 'cell-empty';
    const s = a.toLowerCase();
    if (s.startsWith('yes')) return 'cell-yes';
    if (s.startsWith('no') || s.startsWith('not')) return 'cell-no';
    if (s.startsWith('maybe') || s.startsWith('need')) return 'cell-maybe';
    return '';
  };

  return (
    <section className="panel table-panel">
      <div className="table-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="sticky-col">Friend</th>
              {polls.map((p) => (
                <th key={p.id} title={p.question}>
                  <span className="th-num num">{p.number}</span> {p.question}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k}>
                <th scope="row" className="sticky-col">{nameOf(k)}</th>
                {polls.map((p) => {
                  const a = responses[p.id]?.[k];
                  return <td key={p.id} className={cellClass(a)}>{a || '–'}</td>;
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="sticky-col">Answered</th>
              {polls.map((p) => (
                <td key={p.id} className="num">{Object.keys(responses[p.id] || {}).length}/{members.length}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="muted small table-hint">Swipe sideways to see every question.</p>
    </section>
  );
}
