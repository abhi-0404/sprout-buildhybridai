// Local-only storage for the child's profile and conversation. Wrapped in try/catch because
// storage can be unavailable (private windows, blocked site data).

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`sprout:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(`sprout:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}
