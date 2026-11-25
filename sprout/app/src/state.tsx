import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DemoAi, type DemoSettings } from './ai/demoAi';
import { CapacitorAi, isNativePlatform } from './ai/capacitorAi';
import { LazyFirebaseAi } from './ai/lazyFirebase';
import type { AiClient, DeviceStatus } from './ai/types';
import { mergePolicy, loadRemotePolicy } from './lib/config';
import { getFamilyLink, syncAlerts } from './lib/family';
import { firebaseConfigured } from './lib/firebaseEnv';
import { load, save } from './lib/storage';
import { DEFAULT_POLICY, type Policy, type Turn } from './pipeline/sprout';
import type { ChildProfile } from './pipeline/types';

// App-wide state shared by the kid and parent experiences.
// Profile and turns live only on this device (localStorage); nothing here is synced.

export const EMPTY_PROFILE: ChildProfile = {
  childName: '', nicknames: [], school: '', city: '', otherNames: [], places: [], ageBand: '6-8',
};

interface SproutState {
  ai: AiClient;
  /** True when running with the scripted demo AI (no Firebase keys yet). */
  isDemo: boolean;
  demo: DemoSettings;
  setDemo: (d: DemoSettings) => void;
  profile: ChildProfile;
  setProfile: (p: ChildProfile) => void;
  turns: Turn[];
  setTurns: (t: Turn[] | ((prev: Turn[]) => Turn[])) => void;
  clearTurns: () => void;
  policy: Policy;
  setPolicy: (p: Policy) => void;
  deviceStatus: DeviceStatus;
  deviceReady: boolean;
  refreshDevice: () => Promise<void>;
  online: boolean;
}

const Ctx = createContext<SproutState | null>(null);

export function SproutProvider({ children }: { children: ReactNode }) {
  const [demo, setDemoState] = useState<DemoSettings>(() => load('demo', { deviceModel: true }));
  // On Android/iOS the native plugin needs google-services.json / GoogleService-Info.plist.
  // Until the build is made with VITE_NATIVE_FIREBASE=true, the phone app runs in Demo mode.
  const native = isNativePlatform() && import.meta.env.VITE_NATIVE_FIREBASE === 'true';
  const isDemo = !firebaseConfigured && !native;
  const ai = useMemo<AiClient>(
    () => (native ? new CapacitorAi() : isDemo ? new DemoAi(demo) : new LazyFirebaseAi()),
    [native, isDemo, demo],
  );
  const [profile, setProfileState] = useState<ChildProfile>(() => load('profile', EMPTY_PROFILE));
  const [turns, setTurns] = useState<Turn[]>(() => load('turns', []));
  const [localPolicy, setPolicyState] = useState<Policy>(() => load('policy', DEFAULT_POLICY));
  // Remote Config can tighten (never loosen) the parent's choices; see mergePolicy.
  const [remotePatch, setRemotePatch] = useState<Partial<Policy> | null>(null);
  const policy = useMemo(() => mergePolicy(localPolicy, remotePatch), [localPolicy, remotePatch]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    loadRemotePolicy().then(setRemotePatch).catch(() => {});
  }, []);

  // Safety alerts reach the family's other devices right away (kind, level and time only, no text).
  useEffect(() => {
    if (!firebaseConfigured) return;
    const link = getFamilyLink();
    if (!link || link.role === 'pending') return;
    const events = turns
      .filter((t) => t.distress && !t.sample)
      .map((t) => ({ id: t.id, kind: t.distress!.kind, level: t.distress!.level, at: t.at }));
    if (events.length) syncAlerts(link.id, events).catch(() => {});
  }, [turns]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('unavailable');
  const [online, setOnline] = useState(() => navigator.onLine);

  const refreshDevice = useCallback(async () => setDeviceStatus(await ai.deviceStatus()), [ai]);

  useEffect(() => void refreshDevice(), [refreshDevice]);
  // While a download is running, re-check every few seconds so a finished download is noticed.
  // Stops by itself once the status changes, and on unmount. 'downloadable' is not polled: it only
  // changes after the parent taps "Download model", which refreshes the status itself.
  useEffect(() => {
    if (deviceStatus !== 'downloading') return;
    const id = setInterval(() => void refreshDevice(), 4000);
    return () => clearInterval(id);
  }, [deviceStatus, refreshDevice]);
  useEffect(() => save('turns', turns), [turns]);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const value: SproutState = {
    ai, isDemo, demo,
    setDemo: (d) => { setDemoState(d); save('demo', d); },
    profile,
    setProfile: (p) => { setProfileState(p); save('profile', p); },
    turns, setTurns,
    // Safety alerts survive "clear history" so a child cannot erase them from the parent view.
    clearTurns: () => setTurns((prev) => prev.filter((t) => t.distress && !t.sample)),
    policy,
    setPolicy: (p) => { setPolicyState(p); save('policy', p); },
    deviceStatus,
    deviceReady: deviceStatus === 'available',
    refreshDevice,
    online,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSprout(): SproutState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSprout must be used inside SproutProvider');
  return v;
}

/** Hash routes: #/kid, #/parent, #/parent/<section>, #/welcome */
export function useRoute(): [string, (r: string) => void] {
  const [route, setRoute] = useState(() => location.hash.replace(/^#\/?/, '') || '');
  useEffect(() => {
    const on = () => setRoute(location.hash.replace(/^#\/?/, ''));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => { location.hash = `/${r}`; }];
}
