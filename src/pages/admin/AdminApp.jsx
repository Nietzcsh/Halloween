import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../session';
import { lockAdmin } from '../../data';
import { copyText } from '../../lib/share';
import FriendsTab from './FriendsTab';
import ExpensesTab from './ExpensesTab';
import SettleTab from './SettleTab';
import PollsTab from './PollsTab';
import ReceiptsTab from './ReceiptsTab';

const TABS = [
  { id: 'expenses', label: '💸 Expenses' },
  { id: 'settle', label: '⚖️ Who owes who' },
  { id: 'receipts', label: '🧾 Receipts' },
  { id: 'polls', label: '🗳️ Polls' },
  { id: 'friends', label: '👯 Friends' },
];

export default function AdminApp() {
  const { uid } = useSession();
  const [tab, setTab] = useState(() => sessionStorage.getItem('adminTab') || 'expenses');
  const [copied, setCopied] = useState(false);

  function pick(id) {
    setTab(id);
    sessionStorage.setItem('adminTab', id);
  }

  async function copyInvite() {
    await copyText(`${window.location.origin}/`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="app admin">
      <header className="topbar">
        <span className="brand">🦇 <span>Rory Admin</span></span>
        <div className="row gap">
          <button type="button" className="btn btn-ghost btn-sm" onClick={copyInvite}>
            {copied ? 'Copied!' : '🔗 Invite link'}
          </button>
          <Link to="/" className="btn btn-ghost btn-sm">Friend view</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => lockAdmin(uid)}>🔒 Lock</button>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => pick(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="page page-wide">
        {tab === 'expenses' && <ExpensesTab />}
        {tab === 'settle' && <SettleTab />}
        {tab === 'receipts' && <ReceiptsTab />}
        {tab === 'polls' && <PollsTab />}
        {tab === 'friends' && <FriendsTab />}
      </main>
    </div>
  );
}
