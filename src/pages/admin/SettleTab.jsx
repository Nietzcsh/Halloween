import { useMemo, useState } from 'react';
import { useExpenses, useMembers, useNameOf } from '../../hooks';
import { computeLedger, FUND, pairwise, simplify } from '../../lib/settle';
import { peso } from '../../lib/money';
import { Empty, Loading, Segmented, StatusChip } from '../../components/ui';

export default function SettleTab() {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const [mode, setMode] = useState('simple');

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);
  const lines = useMemo(
    () => (mode === 'simple' ? simplify(ledger.debts) : pairwise(ledger.debts)),
    [mode, ledger],
  );

  if (!members || !expenses) return <Loading />;

  const keys = [...new Set([...members.map((m) => m.key), ...Object.keys(ledger.people)])];
  const fundLines = lines.filter((l) => l.to === FUND);
  const personLines = lines.filter((l) => l.to !== FUND);

  return (
    <div className="stack-lg">
      <h1 className="page-title">⚖️ Who owes who</h1>

      <section className="card stack">
        <div className="row between wrap gap">
          <h2 className="section-title">Payments to make</h2>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'simple', label: '✨ Fewest payments' },
              { value: 'pairs', label: '🔗 Per person' },
            ]}
          />
        </div>
        <p className="muted tiny">
          {mode === 'simple'
            ? 'Fewest transfers to settle everyone, even if it means paying someone other than the original payer.'
            : 'Debts between each pair of friends, netted out (A owes B ₱500, B owes A ₱200 → A pays B ₱300).'}
        </p>

        {personLines.length === 0 && fundLines.length === 0 && <Empty icon="🎉">Everyone is settled!</Empty>}

        {personLines.map((d) => (
          <div key={`${d.from}-${d.to}`} className="debt-row big">
            <span><b>{nameOf(d.from)}</b> <span className="muted">pays</span> <b>{nameOf(d.to)}</b></span>
            <b className="txt-orange">{peso(d.amount)}</b>
          </div>
        ))}

        {fundLines.length > 0 && (
          <>
            <h3 className="sub-title">Into the group fund (you collect)</h3>
            {fundLines.map((d) => (
              <div key={`${d.from}-fund`} className="debt-row">
                <span><b>{nameOf(d.from)}</b></span>
                <b className="txt-orange">{peso(d.amount)}</b>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Balances</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Total share</th>
                <th className="num">Paid</th>
                <th className="num">Still owes</th>
                <th className="num">Fronted</th>
                <th className="num">Owed to them</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const p = ledger.people[k] || { share: 0, settled: 0, unpaid: 0, fronted: 0, owedToMe: 0 };
                return (
                  <tr key={k}>
                    <td>{nameOf(k)}</td>
                    <td className="num">{peso(p.share)}</td>
                    <td className="num txt-green">{peso(p.settled)}</td>
                    <td className="num">{p.unpaid ? <b className="txt-orange">{peso(p.unpaid)}</b> : <StatusChip paid>Settled</StatusChip>}</td>
                    <td className="num">{p.fronted ? peso(p.fronted) : '—'}</td>
                    <td className="num">{p.owedToMe ? <b className="txt-purple">{peso(p.owedToMe)}</b> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted tiny">
          To record a payment, open the expense in the Expenses tab and switch that person to “Paid”.
        </p>
      </section>
    </div>
  );
}
