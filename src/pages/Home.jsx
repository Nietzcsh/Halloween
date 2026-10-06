import { Link } from 'react-router-dom';
import { useSession } from '../session';
import { useExpenses, usePolls } from '../hooks';
import { computeLedger } from '../lib/settle';
import { peso } from '../lib/money';
import { daysUntilParty } from '../lib/format';

export default function Home() {
  const { member, memberKey } = useSession();
  const { polls } = usePolls();
  const { expenses } = useExpenses();
  const openPolls = (polls || []).filter((p) => p.open).length;
  const mine = expenses ? computeLedger(expenses).people[memberKey] : null;
  const days = daysUntilParty();

  return (
    <div className="home">
      <div className="greeting">
        <div className="hero-emoji small" aria-hidden>👻</div>
        <h1 className="spooky">Hi {member.name}!</h1>
        <p className="muted">
          {days > 1 && `${days} days to go before the kemerut 🦇`}
          {days === 1 && 'Bukas na! 🦇'}
          {days === 0 && 'TONIGHT NA! 🎃🔥'}
          {days < 0 && 'Thanks for coming! Settle up na 😉'}
        </p>
      </div>

      <div className="big-actions">
        <Link to="/budget" className="big-btn">
          <span className="big-btn-icon" aria-hidden>💸</span>
          <span className="big-btn-text">
            <b>View group budget tracker</b>
            <span className="muted small">
              {mine && mine.unpaid > 0 ? `You still owe ${peso(mine.unpaid)}` : 'Contributions, hatian, who paid'}
            </span>
          </span>
          <span aria-hidden>›</span>
        </Link>

        <Link to="/polls" className="big-btn">
          <span className="big-btn-icon" aria-hidden>🗳️</span>
          <span className="big-btn-text">
            <b>Answer a poll</b>
            <span className="muted small">
              {openPolls ? `${openPolls} open question${openPolls > 1 ? 's' : ''}` : 'No open polls yet'}
            </span>
          </span>
          <span aria-hidden>›</span>
        </Link>
      </div>
    </div>
  );
}
