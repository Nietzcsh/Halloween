import { useMemo, useState } from 'react';
import { useExpenses, useMembers, useNameOf } from '../../hooks';
import { computeLedger, FUND, pairwise, simplify } from '../../lib/settle';
import { peso } from '../../lib/money';
import { Avatar, Empty, Group, Loading, Segmented } from '../../components/ui';
import { ShareSheet } from '../../components/ShareSheet';
import { everyoneNudge } from '../../lib/nudge';

export default function SettleTab({ flash }) {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const [mode, setMode] = useState('simple');
  const [nudging, setNudging] = useState(false);

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);
  const lines = useMemo(() => (mode === 'simple' ? simplify(ledger.debts) : pairwise(ledger.debts)), [mode, ledger]);

  if (!members || !expenses) return <Loading />;

  const keys = [...new Set([...members.map((m) => m.key), ...Object.keys(ledger.people)])].sort(
    (a, b) => (ledger.people[b]?.unpaid || 0) - (ledger.people[a]?.unpaid || 0),
  );
  const fundLines = lines.filter((l) => l.to === FUND);
  const nudgeAll = everyoneNudge(expenses, nameOf);
  const personLines = lines.filter((l) => l.to !== FUND);

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">⚖️ Who owes who</h1>
      </div>

      {nudgeAll && (
        <button type="button" className="btn btn-nudge btn-block" onClick={() => setNudging(true)}>
          📣 Nudge everyone who owes ({nudgeAll.count})
        </button>
      )}
      {nudging && nudgeAll && <ShareSheet spec={nudgeAll} onClose={() => setNudging(false)} flash={flash} />}

      <Segmented
        full
        value={mode}
        onChange={setMode}
        options={[
          { value: 'simple', label: 'Fewest payments' },
          { value: 'pairs', label: 'Per person' },
        ]}
      />
      <p className="muted small">
        {mode === 'simple'
          ? 'The fewest transfers that settle everyone, even if someone pays a different person than who fronted the money.'
          : 'Debts between each pair, netted out. If Ana owes Ben ₱500 and Ben owes Ana ₱200, Ana pays Ben ₱300.'}
      </p>

      {personLines.length === 0 && fundLines.length === 0 ? (
        <Empty icon="🎉" title="Everyone is settled">Nothing left to pay.</Empty>
      ) : (
        <>
          {personLines.length > 0 && (
            <Group title="Payments between friends">
              {personLines.map((d) => (
                <div key={`${d.from}-${d.to}`} className="row row-flow">
                  <span className="flow">
                    <strong>{nameOf(d.from)}</strong>
                    <span className="flow-arrow">pays</span>
                    <strong>{nameOf(d.to)}</strong>
                  </span>
                  <span className="row-amount num txt-pumpkin">{peso(d.amount)}</span>
                </div>
              ))}
            </Group>
          )}
          {fundLines.length > 0 && (
            <Group title="Into the group fund" footer="You collect these.">
              {fundLines.map((d) => (
                <div key={`${d.from}-fund`} className="row">
                  <Avatar name={nameOf(d.from)} />
                  <span className="row-main"><strong>{nameOf(d.from)}</strong></span>
                  <span className="row-amount num txt-pumpkin">{peso(d.amount)}</span>
                </div>
              ))}
            </Group>
          )}
        </>
      )}

      <Group title="Balances" footer="To record a payment, open the expense and tap that person's “Not yet” so it says “Paid”.">
        {keys.map((k) => {
          const p = ledger.people[k] || { share: 0, settled: 0, unpaid: 0, fronted: 0, owedToMe: 0 };
          return (
            <div key={k} className="row">
              <Avatar name={nameOf(k)} />
              <span className="row-main">
                <strong>{nameOf(k)}</strong>
                <span>
                  Share {peso(p.share)}, paid {peso(p.settled)}
                  {p.fronted ? `, fronted ${peso(p.fronted)}` : ''}
                </span>
              </span>
              <span className="row-amount stack-xs">
                {p.unpaid > 0 ? <span className="num txt-pumpkin">{peso(p.unpaid)}</span> : <span className="txt-ecto">Settled</span>}
                {p.owedToMe > 0 && <span className="num txt-haunt small">+{peso(p.owedToMe)}</span>}
              </span>
            </div>
          );
        })}
      </Group>
    </div>
  );
}
