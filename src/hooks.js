import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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
