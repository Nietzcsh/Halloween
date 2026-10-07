import { Link } from 'react-router-dom';
import { useSession } from '../session';
import { useChatUnread, useExpenses, usePolls } from '../hooks';
import { computeLedger, pairwise } from '../lib/settle';
import { daysUntilParty } from '../lib/format';
import { BalanceTicket } from '../components/BalanceTicket';
import { Icon } from '../components/ui';

export default function Home() {
  const { member, memberKey, uid } = useSession();
  const { unread, latest } = useChatUnread(uid);
  const { polls } = usePolls();
  const { expenses } = useExpenses();
  const openPolls = (polls || []).filter((p) => p.open).length;
  const ledger = expenses ? computeLedger(expenses) : null;
  const mine = ledger?.people[memberKey];
  const creditors = ledger ? pairwise(ledger.debts).filter((d) => d.from === memberKey).length : 0;
  const days = daysUntilParty();

  return (
    <div className="stack-lg">
      <div className="greeting">
        <div className="hero-emoji hero-emoji-sm" aria-hidden>👻</div>
        <h1 className="wordmark wordmark-lg">Hi {member.name}!</h1>
        <p className="muted">
          {days > 1 && `${days} days to go before the kemerut 🦇`}
          {days === 1 && 'Bukas na! 🦇'}
          {days === 0 && 'TONIGHT NA! 🎃🔥'}
          {days < 0 && 'Thanks for coming! Settle up na 😉'}
        </p>
      </div>

      <Link to="/budget" className="ticket-link" aria-label="Open your budget">
        <BalanceTicket owe={mine?.unpaid || 0} share={mine?.share || 0} owedToMe={mine?.owedToMe || 0} creditors={creditors} loading={!expenses} />
      </Link>

      <div className="actions">
        <Link to="/budget" className="action">
          <span className="action-icon tone-pumpkin" aria-hidden>💸</span>
          <span className="action-text">
            <strong>View group budget tracker</strong>
            <span>Your hatian and who paid</span>
          </span>
          <Icon name="chevron" size={18} className="muted" />
        </Link>
        <Link to="/polls" className="action">
          <span className="action-icon tone-haunt" aria-hidden>🗳️</span>
          <span className="action-text">
            <strong>Answer a poll</strong>
            <span>{openPolls ? `${openPolls} open question${openPolls > 1 ? 's' : ''}` : 'No open polls yet'}</span>
          </span>
          {openPolls > 0 && <span className="badge">{openPolls}</span>}
          <Icon name="chevron" size={18} className="muted" />
        </Link>
        <Link to="/chika" className="action">
          <span className="action-icon tone-ecto" aria-hidden>💬</span>
          <span className="action-text">
            <strong>Chika & updates</strong>
            <span className="one-line">
              {latest ? `${latest.fromAdmin ? 'Rory' : latest.name}: ${latest.text || '📷 Photo'}` : 'Updates, pics, kwentuhan'}
            </span>
          </span>
          {unread && <span className="badge">New</span>}
          <Icon name="chevron" size={18} className="muted" />
        </Link>
      </div>
    </div>
  );
}
