import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useMembers, usePolls, useNameOf } from '../../hooks';
import { createPoll, deletePoll, setPollOpen } from '../../data';
import { copyText } from '../../lib/share';
import { friendlyError } from '../../lib/format';
import { Empty, ErrorNote, Loading } from '../../components/ui';

const PRESETS = [
  { label: 'Yes / No', options: ['Yes', 'No'] },
  { label: 'Yes / No / Maybe', options: ['Yes', 'No', 'Maybe'] },
  { label: 'Can pay / Not yet', options: ['Yes, I can pay', 'Not yet', 'Need more time'] },
];

export default function PollsTab() {
  const { polls } = usePolls();
  const { members } = useMembers();
  const nameOf = useNameOf(members);
  const responses = usePollResponses(polls);

  if (!polls || !members) return <Loading />;

  return (
    <div className="stack-lg">
      <h1 className="page-title">🗳️ Polls</h1>
      <NewPollForm />

      {polls.length === 0 ? (
        <Empty icon="🦉">No polls yet. Create one above, then copy its link to the GC.</Empty>
      ) : (
        <>
          <ResultsTable polls={polls} members={members} responses={responses} nameOf={nameOf} />
          <div className="poll-admin-list">
            {polls.map((p) => <PollAdminCard key={p.id} poll={p} answers={responses[p.id] || {}} total={members.length} />)}
          </div>
        </>
      )}
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

function NewPollForm() {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('choice');
  const [optionsText, setOptionsText] = useState('Yes\nNo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const options = [...new Set(optionsText.split('\n').map((s) => s.trim()).filter(Boolean))];
    if (!question.trim()) return setError('Type a question.');
    if (type === 'choice' && options.length < 2) return setError('Add at least 2 options (one per line).');
    setBusy(true);
    try {
      await createPoll({ question: question.trim(), type, options });
      setQuestion('');
    } catch (ex) {
      setError(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2 className="section-title">New question</h2>
      <input
        className="input"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Are you available Oct 31?"
        maxLength={160}
      />
      <div className="row gap wrap">
        <label className="row gap small">
          <span className="muted">Answer type</span>
          <select className="input input-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="choice">Pick an option</option>
            <option value="text">Free text</option>
          </select>
        </label>
        {type === 'choice' &&
          PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn btn-ghost btn-xs" onClick={() => setOptionsText(p.options.join('\n'))}>
              {p.label}
            </button>
          ))}
      </div>
      {type === 'choice' && (
        <textarea
          className="input"
          rows={3}
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
          placeholder={'One option per line'}
        />
      )}
      <ErrorNote>{error}</ErrorNote>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create poll'}</button>
    </form>
  );
}

function PollAdminCard({ poll, answers, total }) {
  const [copied, setCopied] = useState(false);
  const answered = Object.keys(answers).length;
  const tally = useMemo(() => {
    const t = {};
    for (const a of Object.values(answers)) t[a] = (t[a] || 0) + 1;
    return t;
  }, [answers]);

  async function copy() {
    await copyText(`${window.location.origin}/polls/${poll.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!window.confirm(`Delete poll #${poll.number} and all its answers?`)) return;
    try {
      await deletePoll(poll.id);
    } catch (ex) {
      alert(friendlyError(ex));
    }
  }

  return (
    <div className={`card stack poll-admin ${poll.open ? '' : 'closed'}`}>
      <div className="row between gap">
        <span className="poll-num">#{poll.number}</span>
        <span className={`chip ${poll.open ? 'chip-paid' : ''}`}>{poll.open ? 'Open' : 'Closed'}</span>
      </div>
      <h3 className="poll-q">{poll.question}</h3>
      <div className="muted small">{answered}/{total} answered</div>
      {poll.type === 'choice' && (
        <div className="tally">
          {(poll.options || []).map((o) => {
            const n = tally[o] || 0;
            return (
              <div key={o} className="tally-row">
                <span className="tally-label">{o}</span>
                <span className="tally-bar"><span style={{ width: `${answered ? (n / answered) * 100 : 0}%` }} /></span>
                <b className="tally-n">{n}</b>
              </div>
            );
          })}
        </div>
      )}
      <div className="row gap wrap">
        <button type="button" className="btn btn-ghost btn-xs" onClick={copy}>{copied ? 'Copied!' : '🔗 Copy link'}</button>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPollOpen(poll.id, !poll.open)}>
          {poll.open ? 'Close poll' : 'Reopen'}
        </button>
        <button type="button" className="btn btn-danger btn-xs" onClick={remove}>Delete</button>
      </div>
    </div>
  );
}

/** Rows = friends, columns = questions. Blank cells = hasn't answered. */
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
    <section className="card">
      <h2 className="section-title">Answers at a glance</h2>
      <div className="table-scroll">
        <table className="table results">
          <thead>
            <tr>
              <th className="sticky-col">Friend</th>
              {polls.map((p) => <th key={p.id} title={p.question}>#{p.number} {p.question}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k}>
                <td className="sticky-col"><b>{nameOf(k)}</b></td>
                {polls.map((p) => {
                  const a = responses[p.id]?.[k];
                  return <td key={p.id} className={cellClass(a)}>{a || '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky-col muted">Answered</td>
              {polls.map((p) => (
                <td key={p.id} className="muted">{Object.keys(responses[p.id] || {}).length}/{members.length}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
