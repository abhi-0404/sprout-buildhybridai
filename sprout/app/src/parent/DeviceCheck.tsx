import { useState } from 'react';
import type { AiMode, DeviceStatus } from '../ai/types';
import { useSprout } from '../state';

// Is the on-device model available here, can it be downloaded, and does a request report
// where it ran (device or cloud) and how long it took? Used in Settings.

const STATUS_COPY: Record<DeviceStatus, { label: string; cls: string; help: string }> = {
  available: { label: 'Ready', cls: 'device', help: 'The on-device model is installed. Safety checks run privately on this device.' },
  downloadable: { label: 'Needs download', cls: 'care', help: 'Supported, but the model has not been downloaded yet. Tap "Download model".' },
  downloading: { label: 'Downloading', cls: 'cloud', help: 'The model is downloading. This can take several minutes.' },
  unavailable: { label: 'Not available', cls: 'danger', help: 'This device cannot run the model. Sprout falls back to cloud-safe mode: private details are still removed on the device first.' },
};

export function DeviceCheck() {
  const { ai, deviceStatus, refreshDevice, isDemo } = useSprout();
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${s}`]);
  const st = STATUS_COPY[deviceStatus];

  const check = async () => {
    await refreshDevice();
    add('Checked availability.');
  };
  const prepare = async () => {
    setBusy(true);
    setProgress(0);
    add('Preparing the on-device model (needs this tap)...');
    try {
      await ai.prepareDevice((f) => setProgress(f));
      add('Model ready.');
    } catch (e) {
      add(`Could not prepare the model: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setProgress(null);
      await refreshDevice();
    }
  };
  const run = async (mode: AiMode, label: string) => {
    setBusy(true);
    try {
      const r = await ai.generate({ task: 'answer', mode, prompt: 'In one short sentence, why is the sky blue?' });
      add(`${label}: ran on ${r.source}, ${r.latencyMs} ms. "${r.text.trim().slice(0, 100)}"`);
    } catch (e) {
      add(`${label}: error, ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="p-sec p-stack-sm" aria-labelledby="dc-h">
      <h2 id="dc-h" className="p-sec-title">Device check</h2>
      <p className="p-sec-sub">Test the on-device model and see where each test ran.</p>
      <div className="p-row">
        <span className={`p-chip ${st.cls}`} role="status">On-device model: {st.label}</span>
        <button type="button" className="p-btn small" onClick={check} disabled={busy}>Check again</button>
      </div>
      <p className="p-muted p-small">{st.help}</p>
      {progress !== null && (
        <div className="p-progress" role="progressbar" aria-label="Model download" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="p-row">
        {deviceStatus !== 'available' && (
          <button type="button" className="p-btn primary" onClick={prepare} disabled={busy}>Download model</button>
        )}
        <button type="button" className="p-btn" onClick={() => run('only_device', 'On device')} disabled={busy || deviceStatus !== 'available'} title={deviceStatus !== 'available' ? 'Download the model first' : undefined}>Run on device</button>
        <button type="button" className="p-btn" onClick={() => run('prefer_device', 'Hybrid')} disabled={busy}>Run hybrid</button>
        <button type="button" className="p-btn" onClick={() => run('only_cloud', 'Cloud')} disabled={busy}>Run in cloud</button>
      </div>
      {!isDemo && (
        <p className="p-muted p-small">
          If it is unavailable, open <code>chrome://on-device-internals</code>. Chrome needs a GPU with more than 4 GB of memory (or 16 GB RAM) and about 22 GB of free disk.
        </p>
      )}
      <pre className="p-log" aria-live="polite">{log.join('\n') || 'No results yet.'}</pre>
    </section>
  );
}
