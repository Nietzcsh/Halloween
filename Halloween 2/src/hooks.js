import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { FUND, FUND_LABEL } from './lib/settle';

const toObj = (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) });

/**
 * Live-subscribe to a Firestore doc or query.
 * data === undefined → still loading, null → doc missing / no ref.
 */
export function useLive(makeRef, deps) {
  const [state, setState] = useState({ data: undefined, error: null });
  useEffect(() => {
    const ref = makeRef();
    if (!ref) {
      setState({ data: null, error: null });
      return undefined;
    }
    setState({ data: undefined, error: null });
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.docs !== undefined) setState({ data: snap.docs.map(toObj), error: null });
        else setState({ data: snap.exists() ? toObj(snap) : null, error: null });
      },
      (error) => {
        console.error(error);
        setState({ data: null, error });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const millis = (ts) => (ts?.toMillis ? ts.toMillis() : 0);

export function useMembers() {
  const { data, error } = useLive(() => collection(db, 'members'), []);
  const members = useMemo(
    () => (data ? [...data].sort((a, b) => a.name.localeCompare(b.name)) : data),
    [data],
  );
  return { members, error };
}

export function useExpenses() {
  const { data, error } = useLive(() => collection(db, 'expenses'), []);
  const expenses = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => (b.date || '').localeCompare(a.date || '') || millis(b.createdAt) - millis(a.createdAt))
        : data,
    [data],
  );
  return { expenses, error };
}

export function usePolls() {
  const { data, error } = useLive(() => collection(db, 'polls'), []);
  const polls = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => millis(a.createdAt) - millis(b.createdAt)).map((p, i) => ({ ...p, number: i + 1 }))
        : data,
    [data],
  );
  return { polls, error };
}

/** key → display name, with a fallback for people who were removed. */
export function useNameOf(members) {
  return useMemo(() => {
    const map = Object.fromEntries((members || []).map((m) => [m.key, m.name]));
    return (key) => (key === FUND ? FUND_LABEL : map[key] || `${key} (removed)`);
  }, [members]);
}

/* ---------------- Chika (chat) ---------------- */

export function useMessages(max = 150) {
  const { data, error } = useLive(() => query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(max)), [max]);
  const messages = useMemo(() => (data ? [...data].reverse() : data), [data]);
  return { messages, error };
}

const SEEN_KEY = 'kemerut-chat-seen';
function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}
export function markChatSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* private mode: the dot just won't remember */
  }
  window.dispatchEvent(new Event('kemerut-chat-seen'));
}

/** True when someone else posted since you last opened the chat. Also returns the latest message. */
export function useChatUnread(myUid, enabled = true) {
  const { data } = useLive(
    () => (enabled ? query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(1)) : null),
    [enabled],
  );
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => {
    const onSeen = () => setSeen(readSeen());
    window.addEventListener('kemerut-chat-seen', onSeen);
    return () => window.removeEventListener('kemerut-chat-seen', onSeen);
  }, []);
  const latest = data?.[0] || null;
  const unread = !!latest && latest.uid !== myUid && millis(latest.createdAt) > seen;
  return { unread, latest };
}
