// Every write to Firestore lives here, so the UI files stay readable.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { cleanName, nameKey } from './lib/names';

export class NameTakenError extends Error {
  constructor(name) {
    super(`"${name}" is already taken`);
    this.name = 'NameTakenError';
  }
}

/* ---------------- Joining (friends) ---------------- */

/**
 * Claim a name for this phone. A transaction makes it impossible for two
 * people to grab the same name at the same moment.
 *  members/{key}  – the friend (key = normalized name, e.g. "ana")
 *  uids/{uid}     – "this phone belongs to member key X"
 */
export async function joinGroup(uid, rawName) {
  const name = cleanName(rawName);
  const key = nameKey(name);
  if (!key) throw new Error('Please type a name using letters or numbers.');

  return runTransaction(db, async (tx) => {
    const uidRef = doc(db, 'uids', uid);
    const memberRef = doc(db, 'members', key);
    const uidSnap = await tx.get(uidRef);
    if (uidSnap.exists()) return uidSnap.data().memberKey;

    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists()) {
      // Name exists. Only claimable if Rory pre-added it or reset the old phone (uid == null).
      if (memberSnap.data().uid) throw new NameTakenError(memberSnap.data().name);
      tx.update(memberRef, { uid, claimedAt: serverTimestamp() });
    } else {
      tx.set(memberRef, { key, name, uid, joinedAt: serverTimestamp() });
    }
    tx.set(uidRef, { memberKey: key, at: serverTimestamp() });
    return key;
  });
}

/* ---------------- Admin PIN ---------------- */

/**
 * The PIN is checked by Firestore security rules, not by the app:
 * creating admins/{uid} is only allowed if a document adminSecrets/{PIN}
 * exists — and nobody can read adminSecrets. A transaction is used so a
 * wrong PIN never "flashes" the admin screen.
 */
export async function unlockAdmin(uid, pin) {
  const p = String(pin || '').trim();
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(p)) throw new Error('Wrong PIN');
  try {
    await runTransaction(db, async (tx) => {
      tx.set(doc(db, 'admins', uid), { pin: p, at: serverTimestamp() });
    });
  } catch (e) {
    if (e.code === 'permission-denied') throw new Error('Wrong PIN');
    throw e;
  }
}

export function lockAdmin(uid) {
  return deleteDoc(doc(db, 'admins', uid));
}

/* ---------------- Members (admin) ---------------- */

export async function addMember(rawName) {
  const name = cleanName(rawName);
  const key = nameKey(name);
  if (!key) throw new Error('Please type a name using letters or numbers.');
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'members', key);
    const snap = await tx.get(ref);
    if (snap.exists()) throw new NameTakenError(snap.data().name);
    tx.set(ref, { key, name, uid: null, joinedAt: serverTimestamp(), addedByRory: true });
  });
}

/** Unlink a friend's phone so they can join again from a new phone (keeps all their expenses). */
export async function releaseMember(member) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'members', member.key), { uid: null });
  if (member.uid) batch.delete(doc(db, 'uids', member.uid));
  await batch.commit();
}

export async function renameMember(member, rawName) {
  const name = cleanName(rawName);
  if (!nameKey(name)) throw new Error('Please type a name using letters or numbers.');
  await updateDoc(doc(db, 'members', member.key), { name });
}

export async function removeMember(member) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'members', member.key));
  if (member.uid) batch.delete(doc(db, 'uids', member.uid));
  await batch.commit();
}

/* ---------------- Expenses + receipt photos (admin) ---------------- */

/**
 * Photos are stored as compressed JPEGs inside Firestore documents (photos/{id}),
 * so this works on the free Spark plan without Cloud Storage.
 * The expense keeps a tiny thumbnail of each photo for fast lists.
 */
export async function saveExpense(existingId, fields, { newPhotos = [], keptPhotos = [], removedPhotoIds = [] } = {}) {
  const ref = existingId ? doc(db, 'expenses', existingId) : doc(collection(db, 'expenses'));
  const added = [];
  for (const p of newPhotos) {
    const photoRef = await addDoc(collection(db, 'photos'), {
      data: p.full,
      expenseId: ref.id,
      createdAt: serverTimestamp(),
    });
    added.push({ id: photoRef.id, thumb: p.thumb });
  }
  for (const id of removedPhotoIds) await deleteDoc(doc(db, 'photos', id));

  await setDoc(ref, {
    ...fields,
    photos: [...keptPhotos, ...added],
    createdAt: fields.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setSharePaid(expenseId, memberKey, paid) {
  await updateDoc(doc(db, 'expenses', expenseId), { [`paid.${memberKey}`]: paid, updatedAt: serverTimestamp() });
}

export async function deleteExpense(expense) {
  for (const p of expense.photos || []) await deleteDoc(doc(db, 'photos', p.id));
  await deleteDoc(doc(db, 'expenses', expense.id));
}

export async function getPhoto(id) {
  const snap = await getDoc(doc(db, 'photos', id));
  return snap.exists() ? snap.data().data : null;
}

/* ---------------- Polls ---------------- */

export function createPoll({ question, type, options }) {
  return addDoc(collection(db, 'polls'), {
    question,
    type,
    options: type === 'choice' ? options : [],
    open: true,
    createdAt: serverTimestamp(),
  });
}

export function setPollOpen(pollId, open) {
  return updateDoc(doc(db, 'polls', pollId), { open });
}

export async function deletePoll(pollId) {
  const answers = await getDocs(collection(db, 'polls', pollId, 'responses'));
  const batch = writeBatch(db);
  answers.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'polls', pollId));
  await batch.commit();
}

export function answerPoll(pollId, memberKey, answer) {
  return setDoc(doc(db, 'polls', pollId, 'responses', memberKey), {
    answer: String(answer).slice(0, 500),
    memberKey,
    at: serverTimestamp(),
  });
}

/* ---------------- Receipts (admin creates, friend sees their own) ---------------- */

export function createReceipt({ memberKey, memberName, items, totalDue, note }) {
  const code = `R-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  return addDoc(collection(db, 'receipts'), {
    code,
    memberKey,
    memberName,
    items,
    totalDue,
    note: note || '',
    createdAt: serverTimestamp(),
  });
}

export function deleteReceipt(id) {
  return deleteDoc(doc(db, 'receipts', id));
}

/* ---------------- Share links (GC previews) ---------------- */

/**
 * Creates shares/{id} and returns the short link https://<site>/s/<id>.
 * card: { title, description, path, image (JPEG data URL), kind }
 */
export async function createShare({ title, description, path, image, kind }) {
  const ref = await addDoc(collection(db, 'shares'), {
    kind: kind || 'link',
    title: String(title).slice(0, 120),
    description: String(description || '').slice(0, 300),
    path: path || '/',
    image,
    createdAt: serverTimestamp(),
  });
  return `${window.location.origin}/s/${ref.id}`;
}

/* ---------------- Chika (group chat) ---------------- */

/**
 * sender: { uid, memberKey, name, fromAdmin }
 * photo: optional { full, preview } from prepareChatPhoto()
 */
export async function sendMessage(sender, text, photo) {
  let photoRef = null;
  if (photo) {
    const ref = await addDoc(collection(db, 'photos'), {
      data: photo.full,
      kind: 'chat',
      uploaderUid: sender.uid,
      createdAt: serverTimestamp(),
    });
    photoRef = { id: ref.id, preview: photo.preview, w: photo.w, h: photo.h };
  }
  await addDoc(collection(db, 'messages'), {
    text: String(text || '').trim().slice(0, 1000),
    memberKey: sender.fromAdmin ? null : sender.memberKey,
    name: sender.name,
    fromAdmin: !!sender.fromAdmin,
    uid: sender.uid,
    photo: photoRef,
    pinned: false,
    createdAt: serverTimestamp(),
  });
}

export async function deleteMessage(message) {
  if (message.photo?.id) {
    try {
      await deleteDoc(doc(db, 'photos', message.photo.id));
    } catch {
      /* photo may already be gone */
    }
  }
  await deleteDoc(doc(db, 'messages', message.id));
}

export function setMessagePinned(id, pinned) {
  return updateDoc(doc(db, 'messages', id), { pinned });
}
