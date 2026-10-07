import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loading } from '../components/ui';

/**
 * On Netlify, /s/<id> is answered by the edge function (link previews).
 * This is the in-app fallback for local dev: look up where the link points and go there.
 */
export default function ShareRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, 'shares', id))
      .then((snap) => {
        const path = snap.exists() ? snap.data().path : '/';
        const safe = /^\/[A-Za-z0-9/_-]*$/.test(path || '') && !String(path).startsWith('//') ? path : '/';
        if (alive) navigate(safe, { replace: true });
      })
      .catch(() => alive && navigate('/', { replace: true }));
    return () => {
      alive = false;
    };
  }, [id, navigate]);
  return <Loading label="Opening…" />;
}
