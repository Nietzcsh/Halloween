import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { firebaseConfigured } from './firebase';
import { SessionProvider, useSession } from './session';
import { Avatar, Icon, Loading } from './components/ui';
import { DialogProvider } from './components/pickers';
import { friendlyError } from './lib/format';
import { useChatUnread } from './hooks';
import Join from './pages/Join';
import Home from './pages/Home';
import Budget from './pages/Budget';
import Polls from './pages/Polls';
import PollAnswer from './pages/PollAnswer';
import AdminGate from './pages/admin/AdminGate';
import Chat from './pages/Chat';
import ShareRedirect from './pages/ShareRedirect';

export default function App() {
  if (!firebaseConfigured) return <SetupNeeded />;
  return (
    <BrowserRouter>
      <SessionProvider>
        <DialogProvider>
        <Routes>
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/s/:id" element={<ShareRedirect />} />
          <Route element={<FriendShell />}>
            <Route index element={<Home />} />
            <Route path="budget" element={<Budget />} />
            <Route path="polls" element={<Polls />} />
            <Route path="polls/:id" element={<PollAnswer />} />
            <Route path="chika" element={<Chat />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </DialogProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}

/** Friends join with a name first. A shared poll link still works: after joining they land on that poll. */
function FriendShell() {
  const { ready, member, authError, uid } = useSession();
  const { unread } = useChatUnread(uid, ready && !!member);
  if (authError) {
    return (
      <div className="screen-center">
        <h1 className="wordmark">Uh oh 👻</h1>
        <p className="note note-error">{friendlyError(authError)}</p>
      </div>
    );
  }
  if (!ready) return <Loading />;
  if (!member) return <Join />;

  return (
    <div className="app">
      <header className="appbar">
        <Link to="/" className="brand"><span aria-hidden>🎃</span> <span className="wordmark wordmark-sm">Kemerut</span></Link>
        <Avatar name={member.name} size="sm" />
      </header>
      <main className="screen">
        <Outlet />
      </main>
      <TabBar
        tabs={[
          { to: '/', label: 'Home', icon: 'home', end: true },
          { to: '/budget', label: 'Budget', icon: 'wallet' },
          { to: '/chika', label: 'Chika', icon: 'chat', dot: unread },
          { to: '/polls', label: 'Polls', icon: 'poll' },
        ]}
      />
    </div>
  );
}

export function TabBar({ tabs }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <span className="tab-icon">
            <Icon name={t.icon} size={24} />
            {t.dot && <span className="tab-dot" aria-label="New" />}
          </span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function SetupNeeded() {
  return (
    <div className="screen-center">
      <h1 className="wordmark">Almost there 🕯️</h1>
      <div className="panel stack">
        <p>Firebase isn't connected yet.</p>
        <p className="muted small">
          Copy <code>.env.example</code> to <code>.env.local</code>, paste your Firebase web app config, then restart{' '}
          <code>npm run dev</code>. On Netlify, add the same <code>VITE_FIREBASE_*</code> variables and redeploy.
        </p>
      </div>
    </div>
  );
}
