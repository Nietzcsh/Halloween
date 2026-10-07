import { peso } from '../lib/money';

/** The signature element: your balance as a club admission ticket. */
export function BalanceTicket({ owe, share, owedToMe, creditors, loading }) {
  const clear = !loading && owe === 0;
  return (
    <div className={`ticket balance ${clear ? 'is-clear' : ''}`}>
      <div className="ticket-band balance-band">
        <span className="balance-deco" aria-hidden>{clear ? '🎉' : '🎃'}</span>
        <span className="balance-label">{clear ? (share > 0 ? 'All settled!' : 'Nothing to pay yet') : 'You still owe'}</span>
        <span className="balance-amount num">{loading ? '…' : peso(owe)}</span>
      </div>
      <div className="ticket-perf" aria-hidden />
      <div className="ticket-stub">
        <span>
          {loading
            ? 'Loading your share…'
            : clear
              ? share > 0
                ? `Your share was ${peso(share)}. Salamat! 🙏`
                : 'Rory will add expenses here 🕸️'
              : `Your share is ${peso(share)}${creditors ? `, payable to ${creditors} ${creditors === 1 ? 'person' : 'people'}` : ''}`}
        </span>
        {owedToMe > 0 && <span className="stub-owed">Others owe you {peso(owedToMe)}</span>}
      </div>
    </div>
  );
}
