import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { firebaseConfigured } from './firebase';
import { SessionProvider, useSession } from './session';
import { Loading } from './components/ui';
import { friendlyError } from './lib/format';
import Join from './pages/Join';
import Home from './pages/Home';
import Budget from './pages/Budget';
import Polls from './pages/Polls';
import PollAnswer from './pages/PollAnswer';
import AdminGate from './pages/admin/AdminGate';

export default function App() {
  if (!firebaseConfigured) return <SetupNeeded />;
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/admin" element={<AdminGate />} />
          <Route element={<FriendShell />}>
            <Route index element={<Home />} />
            <Route path="budget" element={<Budget />} />
            <Route path="polls" element={<Polls />} />
            <Route path="polls/:id" element={<PollAnswer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}

/** Friends must join with a name first. A shared poll link still works: after joining they land on that poll. */
function FriendShell() {
  const { ready, member, authError } = useSession();
  if (authError) {
    return (
      <div className="page center">
        <h1 className="spooky">Uh oh 👻</h1>
        <p className="error">{friendlyError(authError)}</p>
      </div>
    );
  }
  if (!ready) return <Loading />;
  if (!member) return <Join />;

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">🎃 <span>Kemerut</span></Link>
        <nav className="topnav">
          <NavLink to="/budget">Budget</NavLink>
          <NavLink to="/polls">Polls</NavLink>
        </nav>
        <span className="me-pill" title="You">{member.name}</span>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="page center">
      <h1 className="spooky">Almost there 🕯️</h1>
      <div className="card stack">
        <p>Firebase isn't configured yet.</p>
        <p className="muted small">
          Copy <code>.env.example</code> to <code>.env.local</code>, paste your Firebase web app config, then restart{' '}
          <code>npm run dev</code>. On Netlify, add the same <code>VITE_FIREBASE_*</code> variables and redeploy.
        </p>
      </div>
    </div>
  );
}
