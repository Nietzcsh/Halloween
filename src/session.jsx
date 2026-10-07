import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { auth, db, ensureSignedIn } from './firebase';
import { useLive } from './hooks';

const SessionContext = createContext(null);

/**
 * Who is on this phone?
 *  uid        – anonymous Firebase account (auto-created, stays on the device)
 *  member     – the friend this phone joined as (from uids/{uid} → members/{key})
 *  isAdmin    – this phone entered Rory's PIN (admins/{uid} exists)
 */
export function SessionProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setUid(user.uid);
        } else {
          setUid(null);
          ensureSignedIn().catch(setAuthError);
        }
      }),
    [],
  );

  const link = useLive(() => (uid ? doc(db, 'uids', uid) : null), [uid]);
  const memberKey = link.data?.memberKey || null;
  const member = useLive(() => (memberKey ? doc(db, 'members', memberKey) : null), [memberKey]);
  const admin = useLive(() => (uid ? doc(db, 'admins', uid) : null), [uid]);

  const ready =
    !!uid && link.data !== undefined && admin.data !== undefined && (!memberKey || member.data !== undefined);

  const myMember = memberKey && member.data && member.data.uid === uid ? member.data : null;

  const value = {
    uid,
    ready,
    authError,
    memberKey: myMember ? memberKey : null,
    member: myMember,
    isAdmin: !!admin.data,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
