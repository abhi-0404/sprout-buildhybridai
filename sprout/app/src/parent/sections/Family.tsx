import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { firebaseConfigured } from '../../lib/firebaseEnv';
import {
  approveJoin, checkMembership, createFamily, declineJoin, getFamilyLink, joinFamily, listenAlerts,
  listenJoinRequests, setFamilyLink, signInWithGoogle, signOutUser, watchUser,
  type FamilyAlert, type FamilyLink, type FamilyUser, type JoinRequest,
} from '../../lib/family';
import { useSprout } from '../../state';
import { Icon, KIND_LABEL, fmtTime } from '../shared';

function NotConnected() {
  return (
    <section className="p-sec p-empty">
      <Icon name="phone" size={28} />
      <h2>Connect Firebase to sync alerts to your phone</h2>
      <p className="p-muted">
        With Firebase connected, a safety alert reaches your own phone within seconds, even if you are not holding your child's device.
        Alerts carry only the type, level and time. Never the message.
      </p>
      <p className="p-muted p-small">Copy <code>.env.example</code> to <code>.env.local</code> and add your Firebase keys. Until then, alerts stay on this device.</p>
    </section>
  );
}

const errMsg = (e: unknown) => {
  const m = (e as { code?: string; message?: string }) ?? {};
  if (m.code === 'auth/popup-closed-by-user' || m.code === 'auth/cancelled-popup-request') return 'Sign-in was closed before it finished.';
  if (m.code === 'permission-denied' || /permission/i.test(m.message ?? '')) return 'Not allowed yet. If you just asked to join, the family owner needs to approve you first.';
  return m.message || 'Something went wrong. Try again.';
};

function FamilySync() {
  const { online } = useSprout();
  const [user, setUser] = useState<FamilyUser | null | undefined>(undefined);
  const [link, setLink] = useState<FamilyLink | null>(getFamilyLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [remote, setRemote] = useState<(FamilyAlert & { id: string })[]>([]);

  useEffect(() => watchUser(setUser), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }, []);

  const updateLink = (l: FamilyLink | null) => { setFamilyLink(l); setLink(l); };

  // Live alerts and (for the owner) join requests.
  const member = link && link.role !== 'pending' && user ? link : null;
  const familyId = member?.id;
  const owner = member?.role === 'owner';
  useEffect(() => {
    if (!familyId) return;
    let off: (() => void) | undefined;
    let stop = false;
    listenAlerts(familyId, setRemote, (e) => setError(errMsg(e))).then((u) => (stop ? u() : (off = u)));
    return () => { stop = true; off?.(); };
  }, [familyId]);
  useEffect(() => {
    if (!familyId || !owner) return;
    let off: (() => void) | undefined;
    let stop = false;
    listenJoinRequests(familyId, setRequests, () => {}).then((u) => (stop ? u() : (off = u)));
    return () => { stop = true; off?.(); };
  }, [familyId, owner]);

  // A pending joiner polls until the owner approves.
  const pendingId = link?.role === 'pending' && user ? link.id : null;
  useEffect(() => {
    if (!pendingId) return;
    const timer = window.setInterval(async () => {
      if (await checkMembership(pendingId)) setLink(getFamilyLink());
    }, 4000);
    return () => window.clearInterval(timer);
  }, [pendingId]);

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => updateLink(await joinFamily(code)));
  };

  if (user === undefined) return <section className="p-sec"><p className="p-muted">Checking sign-in...</p></section>;

  return (
    <>
      {!user ? (
        <section className="p-sec p-stack-sm">
          <h2 className="p-sec-title">Sign in to sync alerts</h2>
          <p className="p-sec-sub">Use your Google account. Sprout syncs only alert type, level and time.</p>
          <div><button type="button" className="p-btn primary" onClick={() => run(async () => void (await signInWithGoogle()))} disabled={busy}>Sign in with Google</button></div>
        </section>
      ) : (
        <section className="p-sec p-spread">
          <div>
            <h2 className="p-sec-title">Signed in</h2>
            <p className="p-muted p-small">{user.name ?? user.email ?? 'Parent'}{user.email && user.name ? ` (${user.email})` : ''}</p>
          </div>
          <button type="button" className="p-btn small" onClick={() => run(signOutUser)} disabled={busy}>Sign out</button>
        </section>
      )}

      {user && !link && (
        <div className="p-grid-2">
          <section className="p-sec p-stack-sm">
            <h2 className="p-sec-title">Start a family</h2>
            <p className="p-sec-sub">Create a family and get a 6-digit code for your partner's phone.</p>
            <div><button type="button" className="p-btn primary" onClick={() => run(async () => updateLink(await createFamily()))} disabled={busy}>Create family</button></div>
          </section>
          <section className="p-sec">
            <h2 className="p-sec-title">Join a family</h2>
            <p className="p-sec-sub">Enter the code from the other parent. They will approve you.</p>
            <form className="p-form" onSubmit={onJoin}>
              <div className="p-field">
                <label htmlFor="join-code">6-digit code</label>
                <input id="join-code" className="p-input" inputMode="numeric" autoComplete="off" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div><button type="submit" className="p-btn primary" disabled={busy || code.replace(/\D/g, '').length !== 6}>Ask to join</button></div>
            </form>
          </section>
        </div>
      )}

      {user && link?.role === 'pending' && (
        <section className="p-callout warn" role="status">
          <Icon name="hourglass" />
          <div className="p-stack-sm">
            <strong>Waiting for approval</strong>
            <p className="p-small">The family owner needs to approve you on their device. This page updates by itself.</p>
            <div><button type="button" className="p-btn small" onClick={() => updateLink(null)}>Cancel request</button></div>
          </div>
        </section>
      )}

      {member && (
        <>
          {owner && member.code && (
            <section className="p-sec p-stack-sm">
              <h2 className="p-sec-title">Your family code</h2>
              <div className="p-code" aria-label={`Code ${member.code.split('').join(' ')}`}>{member.code}</div>
              <p className="p-muted p-small">Share it with another parent. They can only join after you approve them below.</p>
            </section>
          )}
          {owner && requests.length > 0 && (
            <section className="p-sec p-stack-sm" aria-labelledby="fam-req">
              <h2 id="fam-req" className="p-sec-title">Join requests</h2>
              <ul className="p-timeline">
                {requests.map((r) => (
                  <li key={r.uid} className="p-spread">
                    <span><strong>{r.name}</strong> <span className="p-muted p-small">asked {fmtTime(r.at)}</span></span>
                    <span className="p-row">
                      <button type="button" className="p-btn small primary" onClick={() => run(() => approveJoin(member.id, r.uid))} disabled={busy}>Approve</button>
                      <button type="button" className="p-btn small" onClick={() => run(() => declineJoin(member.id, r.uid))} disabled={busy}>Decline</button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="p-sec p-stack-sm" aria-labelledby="fam-alerts">
            <div className="p-spread">
              <h2 id="fam-alerts" className="p-sec-title">Alerts synced to this family</h2>
              <span className={`p-chip ${online ? 'device' : 'care'}`}>{online ? 'Online' : 'Offline: alerts will send when you reconnect'}</span>
            </div>
            {remote.length === 0 ? (
              <p className="p-muted">No synced alerts yet.</p>
            ) : (
              <ul className="p-timeline">
                {remote.map((a) => (
                  <li key={a.id} className="p-spread">
                    <span><strong>{KIND_LABEL[a.kind] ?? a.kind}</strong> <span className={`p-chip ${a.level === 'urgent' ? 'danger' : 'care'}`}>{a.level}</span></span>
                    <span className="p-muted p-small">{fmtTime(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="p-muted p-small">Only the type, level and time are stored online. Never the message.</p>
          </section>
          <section className="p-sec p-spread">
            <p className="p-muted p-small">Stop syncing from this device. The family stays in the cloud.</p>
            <button type="button" className="p-btn small danger" onClick={() => updateLink(null)}>Leave on this device</button>
          </section>
        </>
      )}

      {error && <p className="p-callout danger" role="alert">{error}</p>}
    </>
  );
}

export function Family() {
  return firebaseConfigured ? <FamilySync /> : <NotConnected />;
}
