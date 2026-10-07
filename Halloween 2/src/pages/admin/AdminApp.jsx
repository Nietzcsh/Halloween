import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../session';
import { lockAdmin } from '../../data';
import { inviteShare } from '../../lib/nudge';
import { ShareSheet } from '../../components/ShareSheet';
import { Icon, Sheet, SheetAction } from '../../components/ui';
import FriendsTab from './FriendsTab';
import Chat from '../Chat';
import { useChatUnread } from '../../hooks';
import ExpensesTab from './ExpensesTab';
import SettleTab from './SettleTab';
import PollsTab from './PollsTab';
import ReceiptsTab from './ReceiptsTab';

const TABS = [
  { id: 'expenses', label: 'Expenses', icon: 'wallet' },
  { id: 'settle', label: 'Owes', icon: 'swap' },
  { id: 'receipts', label: 'Receipts', icon: 'receipt' },
  { id: 'polls', label: 'Polls', icon: 'poll' },
  { id: 'chika', label: 'Chika', icon: 'chat' },
  { id: 'friends', label: 'Friends', icon: 'users' },
];

export default function AdminApp() {
  const { uid } = useSession();
  const { unread } = useChatUnread(uid);
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => sessionStorage.getItem('adminTab') || 'expenses');
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [sharing, setSharing] = useState(null);

  function pick(id) {
    setTab(id);
    sessionStorage.setItem('adminTab', id);
    window.scrollTo({ top: 0 });
  }

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  return (
    <div className="app admin">
      <header className="appbar">
        <span className="brand"><span aria-hidden>🦇</span> <span className="wordmark wordmark-sm">Rory admin</span></span>
        <button type="button" className="icon-btn" onClick={() => setMenu(true)} aria-label="More options">
          <Icon name="more" />
        </button>
      </header>

      <main className="screen">
        {tab === 'expenses' && <ExpensesTab flash={flash} />}
        {tab === 'settle' && <SettleTab flash={flash} />}
        {tab === 'receipts' && <ReceiptsTab flash={flash} />}
        {tab === 'polls' && <PollsTab flash={flash} />}
        {tab === 'friends' && <FriendsTab flash={flash} />}
        {tab === 'chika' && <Chat asAdmin />}
      </main>

      <nav className="tabbar tabbar-6" aria-label="Admin">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => pick(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <span className="tab-icon">
              <Icon name={t.icon} size={24} />
              {t.id === 'chika' && unread && tab !== 'chika' && <span className="tab-dot" aria-label="New" />}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
      {sharing && <ShareSheet spec={sharing} onClose={() => setSharing(null)} flash={flash} />}

      {menu && (
        <Sheet title="Rory admin" onClose={() => setMenu(false)}>
          <SheetAction
            icon="link"
            onClick={() => {
              setMenu(false);
              setSharing(inviteShare());
            }}
          >
            Share invite link to the GC
          </SheetAction>
          <SheetAction icon="eye" onClick={() => navigate('/')}>Open friend view</SheetAction>
          <SheetAction icon="lock" tone="blood" onClick={() => lockAdmin(uid)}>Lock admin on this phone</SheetAction>
        </Sheet>
      )}
    </div>
  );
}
