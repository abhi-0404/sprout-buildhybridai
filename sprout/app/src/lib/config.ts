import type { Policy } from '../pipeline/sprout';
import { firebaseConfigured } from './firebaseEnv';
const firebaseApp = async () => (await import('./firebase')).getFirebaseApp();

// Remote Config: lets us change the cloud model and the safety policy without shipping an app
// update. Everything here is guarded by `firebaseConfigured`, and the Firebase SDK is imported
// lazily, so demo mode (no keys) never loads or touches Firebase.

/** Defaults used until (or unless) a fetch succeeds. Keep in sync with the Remote Config template. */
export const REMOTE_DEFAULTS = {
  cloud_model: 'gemini-3.5-flash',
  allow_cloud: true,
  referee_cloud_answers: true,
  max_device_chars: 600,
} as const;

export interface RemoteValues {
  cloudModel: string;
  allowCloud: boolean;
  refereeCloudAnswers: boolean;
  maxDeviceChars: number;
}

/** Fetches and activates Remote Config. Returns null when Firebase is not configured or the fetch fails. */
export async function loadRemoteValues(): Promise<RemoteValues | null> {
  if (!firebaseConfigured) return null;
  try {
    const { getRemoteConfig, fetchAndActivate, getValue } = await import('firebase/remote-config');
    const rc = getRemoteConfig(await firebaseApp());
    rc.defaultConfig = { ...REMOTE_DEFAULTS };
    // Fetch at most once an hour in production; every time in dev so console edits show up.
    rc.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 3_600_000;
    await fetchAndActivate(rc);
    const maxChars = getValue(rc, 'max_device_chars').asNumber();
    return {
      cloudModel: getValue(rc, 'cloud_model').asString() || REMOTE_DEFAULTS.cloud_model,
      allowCloud: getValue(rc, 'allow_cloud').asBoolean(),
      refereeCloudAnswers: getValue(rc, 'referee_cloud_answers').asBoolean(),
      maxDeviceChars: maxChars > 0 ? maxChars : REMOTE_DEFAULTS.max_device_chars,
    };
  } catch {
    return null; // offline or Remote Config unavailable: keep the local policy
  }
}

/** The part of Remote Config that maps onto the local Policy. */
export async function loadRemotePolicy(): Promise<Partial<Policy> | null> {
  const v = await loadRemoteValues();
  if (!v) return null;
  return { allowCloud: v.allowCloud, refereeCloudAnswers: v.refereeCloudAnswers };
}

/**
 * Applies a remote patch without letting it loosen a choice the parent made:
 * a remote `true` can never switch the big brain back on if the parent turned it off,
 * and the cloud-answer referee stays on if either side wants it on.
 */
export function mergePolicy(local: Policy, patch: Partial<Policy> | null): Policy {
  if (!patch) return local;
  return {
    ...local,
    allowCloud: local.allowCloud && (patch.allowCloud ?? true),
    refereeCloudAnswers: local.refereeCloudAnswers || (patch.refereeCloudAnswers ?? false),
    helplines: patch.helplines ?? local.helplines,
  };
}
