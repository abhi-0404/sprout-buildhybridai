import { firebaseConfigured } from './firebaseEnv';
const firebaseApp = async () => (await import('./firebase')).getFirebaseApp();
import { load, save } from './storage';

// Family sync: a parent signs in with Google, creates a family, and a second parent device joins
// with a 6-digit code. Only SAFETY ALERTS are synced, and an alert carries just
// {kind, level, at}: never the child's message, name or any transcript text.
//
// Every Firebase SDK is imported lazily inside functions, so demo mode (no keys) never loads
// or touches Firebase. Callers should check `firebaseConfigured` first.
//
// JOINING (simplest secure approach). Firestore rules only let family MEMBERS read or write a
// family, so a stranger holding a code must not be able to add themselves (anyone who guessed
// six digits would get in). Instead:
//   1. The owner publishes joinCodes/{code} = { familyId, ownerUid } (a pointer, no personal data).
//   2. The joiner signs in, reads that one doc by exact code (get, never list) and writes a
//      request to families/{familyId}/joinRequests/{joinerUid}.
//   3. The owner sees the request (with the joiner's Google name) and taps Approve, which adds
//      the uid to `members`. Knowing the code alone is therefore never enough.
// This needs the rules in REQUIRED_RULES added to firebase/firestore.rules.

export const REQUIRED_RULES = `
match /joinCodes/{code} {
  allow get: if request.auth != null;   // exact lookup only, never list
  allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.ownerUid == request.auth.uid;
}
// inside match /families/{familyId}:
match /joinRequests/{uid} {
  allow create, get: if request.auth != null && request.auth.uid == uid;
}`;

export interface FamilyUser {
  uid: string;
  name: string | null;
  email: string | null;
}

export type AlertKind = 'self_harm' | 'abuse' | 'online_danger' | 'bullying' | 'sad_or_scared';
export type AlertLevel = 'concern' | 'urgent';

/** Deliberately has no text field. */
export interface FamilyAlert {
  kind: AlertKind;
  level: AlertLevel;
  /** Epoch milliseconds. */
  at: number;
}

export interface JoinRequest {
  uid: string;
  name: string;
  at: number;
}

export interface FamilyLink {
  id: string;
  code?: string;
  role: 'owner' | 'member' | 'pending';
}

const LINK_KEY = 'familyLink';
const SYNCED_KEY = 'syncedAlertIds';

export const getFamilyLink = (): FamilyLink | null => load<FamilyLink | null>(LINK_KEY, null);
export const setFamilyLink = (l: FamilyLink | null): void => save(LINK_KEY, l);

function assertConfigured(): void {
  if (!firebaseConfigured) throw new Error('Firebase is not configured');
}

async function authMod() {
  assertConfigured();
  const m = await import('firebase/auth');
  return { m, auth: m.getAuth(await firebaseApp()) };
}

// Firestore must be initialised exactly once, with a persistent cache so alerts written while
// offline are queued on disk and delivered when the connection returns.
let dbPromise: Promise<import('firebase/firestore').Firestore> | undefined;
async function db() {
  assertConfigured();
  dbPromise ??= Promise.all([import('firebase/firestore'), firebaseApp()]).then(([f, app]) => {

    try {
      return f.initializeFirestore(app, {
        localCache: f.persistentLocalCache({ tabManager: f.persistentMultipleTabManager() }),
      });
    } catch {
      return f.getFirestore(app); // already initialised, or persistence unsupported here
    }
  });
  return dbPromise;
}
const fs = () => import('firebase/firestore');

const toUser = (u: { uid: string; displayName: string | null; email: string | null }): FamilyUser => ({
  uid: u.uid, name: u.displayName, email: u.email,
});

export async function signInWithGoogle(): Promise<FamilyUser> {
  const { m, auth } = await authMod();
  const cred = await m.signInWithPopup(auth, new m.GoogleAuthProvider());
  return toUser(cred.user);
}

export async function signOutUser(): Promise<void> {
  const { m, auth } = await authMod();
  await m.signOut(auth);
}

/** Calls back with the current user (or null). Returns an unsubscribe function. */
export function watchUser(cb: (u: FamilyUser | null) => void): () => void {
  let off: (() => void) | undefined;
  let stopped = false;
  authMod().then(({ m, auth }) => {
    if (stopped) return;
    off = m.onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
  }, () => cb(null));
  return () => { stopped = true; off?.(); };
}

function randomCode(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

/** Creates families/{id} with the caller as the only member, plus a join code. */
export async function createFamily(): Promise<FamilyLink> {
  const { auth } = await authMod();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first');
  const f = await fs();
  const d = await db();
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const taken = await f.getDoc(f.doc(d, 'joinCodes', code));
    if (!taken.exists()) break;
    code = randomCode();
  }
  const ref = f.doc(f.collection(d, 'families'));
  // One batch: the family and its join code are created together or not at all.
  const batch = f.writeBatch(d);
  batch.set(ref, { members: [user.uid], ownerUid: user.uid, code, createdAt: Date.now() });
  batch.set(f.doc(d, 'joinCodes', code), { familyId: ref.id, ownerUid: user.uid });
  await batch.commit();
  const link: FamilyLink = { id: ref.id, code, role: 'owner' };
  setFamilyLink(link);
  return link;
}

/** Asks to join the family that owns `code`. The owner must approve on their device. */
export async function joinFamily(code: string): Promise<FamilyLink> {
  const { auth } = await authMod();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first');
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 6) throw new Error('The code has 6 digits');
  const f = await fs();
  const d = await db();
  const hit = await f.getDoc(f.doc(d, 'joinCodes', clean));
  if (!hit.exists()) throw new Error('No family found for that code');
  const familyId = String(hit.data().familyId);
  await f.setDoc(f.doc(d, 'families', familyId, 'joinRequests', user.uid), {
    uid: user.uid, name: (user.displayName ?? 'A parent').slice(0, 60), at: Date.now(),
  });
  const link: FamilyLink = { id: familyId, role: 'pending' };
  setFamilyLink(link);
  return link;
}

/** For a pending joiner: true once the owner has approved (we can now read the family). */
export async function checkMembership(familyId: string): Promise<boolean> {
  try {
    const { auth } = await authMod();
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const f = await fs();
    const snap = await f.getDoc(f.doc(await db(), 'families', familyId));
    const ok = snap.exists() && (snap.data().members as string[]).includes(uid);
    if (ok) setFamilyLink({ id: familyId, role: 'member' });
    return ok;
  } catch {
    return false; // permission-denied while still pending
  }
}

export async function listenJoinRequests(
  familyId: string, cb: (r: JoinRequest[]) => void, onError?: (e: Error) => void,
): Promise<() => void> {
  const f = await fs();
  const d = await db();
  return f.onSnapshot(
    f.collection(d, 'families', familyId, 'joinRequests'),
    (snap) => cb(snap.docs.map((x) => x.data() as JoinRequest)),
    onError,
  );
}

/** Owner only: adds the uid to members and removes the request. */
export async function approveJoin(familyId: string, uid: string): Promise<void> {
  const f = await fs();
  const d = await db();
  const batch = f.writeBatch(d);
  batch.update(f.doc(d, 'families', familyId), { members: f.arrayUnion(uid) });
  batch.delete(f.doc(d, 'families', familyId, 'joinRequests', uid));
  await batch.commit();
}

export async function declineJoin(familyId: string, uid: string): Promise<void> {
  const f = await fs();
  await f.deleteDoc(f.doc(await db(), 'families', familyId, 'joinRequests', uid));
}

/**
 * Writes one alert with NO text. Passing `id` (the turn id) makes it idempotent, so a retry
 * never creates a duplicate. While offline the write is queued by the persistent cache.
 */
export async function pushAlert(familyId: string, alert: FamilyAlert, id?: string): Promise<void> {
  const f = await fs();
  const d = await db();
  // Copy exactly three fields so nothing else can ride along by accident.
  const clean: FamilyAlert = { kind: alert.kind, level: alert.level, at: alert.at };
  if (id) await f.setDoc(f.doc(d, 'families', familyId, 'alerts', id), clean);
  else await f.addDoc(f.collection(d, 'families', familyId, 'alerts'), clean);
}

/** Pushes alerts for turns not yet synced from this device. Returns how many were queued. */
export async function syncAlerts(
  familyId: string, events: { id: string; kind: AlertKind; level: AlertLevel; at: number }[],
): Promise<number> {
  const done = new Set(load<string[]>(SYNCED_KEY, []));
  const todo = events.filter((e) => !done.has(e.id));
  for (const e of todo) {
    await pushAlert(familyId, { kind: e.kind, level: e.level, at: e.at }, e.id);
    done.add(e.id);
    save(SYNCED_KEY, [...done].slice(-500));
  }
  return todo.length;
}

export async function listenAlerts(
  familyId: string, cb: (a: (FamilyAlert & { id: string })[]) => void, onError?: (e: Error) => void,
): Promise<() => void> {
  const f = await fs();
  const d = await db();
  const q = f.query(f.collection(d, 'families', familyId, 'alerts'), f.orderBy('at', 'desc'), f.limit(50));
  return f.onSnapshot(
    q,
    (snap) => cb(snap.docs.map((x) => ({ id: x.id, ...(x.data() as FamilyAlert) }))),
    onError,
  );
}
