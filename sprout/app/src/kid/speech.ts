import { useCallback, useEffect, useRef, useState } from 'react';
import { neuralVoice, neuralVoiceCached, neuralVoiceSupported } from './neuralVoice';

// Local-only speech helpers. Privacy promise: no audio ever goes to a cloud speech service.
// Voice input is offered ONLY when the browser can recognise speech on the device itself,
// and read-aloud only ever uses a voice that runs on the device: the Kokoro neural voice (model
// downloaded once, speech made locally), or a voice installed on the device.

// These web APIs are not in the TypeScript DOM lib, so they are described here.
interface RecognitionResultList {
  length: number;
  [i: number]: { 0: { transcript: string }; isFinal: boolean };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}
interface RecognitionCtor {
  new (): Recognition;
  prototype: object;
  available?: (opts: { langs: string[]; processLocally: boolean }) => Promise<string>;
}

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useLocalVoiceInput(onText: (text: string) => void) {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState('');
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => { onTextRef.current = onText; });

  useEffect(() => {
    let alive = true;
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    void (async () => {
      try {
        if (typeof Ctor.available === 'function') {
          const status = await Ctor.available({ langs: ['en-US'], processLocally: true });
          if (alive) setAvailable(status === 'available');
        } else if ('processLocally' in Ctor.prototype) {
          // Older shape: the flag exists, so setting it is honoured.
          if (alive) setAvailable(true);
        }
        // Otherwise we cannot promise local recognition, so the mic stays hidden.
      } catch {
        /* keep the mic hidden */
      }
    })();
    return () => {
      alive = false;
      rec.current?.abort();
    };
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setProblem('');
    try {
      const r = new Ctor();
      r.lang = 'en-US';
      r.interimResults = true;
      r.continuous = false;
      r.processLocally = true;
      r.onresult = (e) => {
        const parts: string[] = [];
        for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
        onTextRef.current(parts.join('').trim());
      };
      r.onerror = (e) => {
        if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') setProblem("I couldn't hear that. Try again?");
      };
      r.onend = () => setListening(false);
      rec.current = r;
      r.start();
      setListening(true);
    } catch {
      setListening(false);
      setProblem("The microphone isn't working right now.");
    }
  }, [listening]);

  return { available, listening, problem, toggle };
}

export function useReadAloud() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const [neuralOk] = useState(neuralVoiceSupported);
  // False until the voice list shows an installed (on-device) voice: before that, the browser's
  // default could be a network voice, and the answer contains the child's name.
  const [systemOk, setSystemOk] = useState(false);
  const [, rerender] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  /** The answer whose neural voice is still loading (first use downloads the model). */
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);

  useEffect(() => {
    if (!synth) return;
    const pick = () => {
      const all = synth.getVoices();
      if (!all.length) return; // not loaded yet: the default voice is used
      const local = all.filter((v) => v.localService);
      const en = local.filter((v) => v.lang.toLowerCase().startsWith('en'));
      // Prefer the device's natural-sounding voices over the old robotic ones.
      voice.current = en.find((v) => /natural|neural|enhanced|premium/i.test(v.name)) ?? en[0] ?? local[0];
      setSystemOk(local.length > 0); // no on-device voice: never risk a cloud voice
    };
    pick();
    synth.addEventListener?.('voiceschanged', pick);
    return () => {
      synth.removeEventListener?.('voiceschanged', pick);
      synth.cancel();
    };
  }, [synth]);
  useEffect(() => {
    // A device that downloaded the voice before loads it now (from its own cache), so the first
    // "Read to me" already uses it.
    // Not in the phone apps: there the model loads only when a child first asks to hear an answer,
    // to save memory and battery.
    // On the web the voice is also fetched on a first visit, a few seconds after the chat opens
    // (so it does not slow the first answer), because the first "Read to me" should already sound
    // natural. Skipped in automated browsers (tests).
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (neuralOk && !isNativeApp()) {
      void neuralVoiceCached().then((yes) => {
        if (yes) neuralVoice().warm();
        else if (!navigator.webdriver) timer = setTimeout(() => neuralVoice().warm(), 4000);
      });
    }
    const off = neuralVoice().subscribe(() => rerender((n) => n + 1));
    return () => { if (timer) clearTimeout(timer); off(); neuralVoice().stop(); };
  }, [neuralOk]);

  const clear = useCallback((id: string) => {
    setSpeakingId((cur) => (cur === id ? null : cur));
    setLoadingId((cur) => (cur === id ? null : cur));
  }, []);

  const speakSystem = useCallback((id: string, text: string) => {
    if (!synth || !systemOk || !voice.current?.localService) { clear(id); return; }
    const u = new SpeechSynthesisUtterance(text);
    if (voice.current) u.voice = voice.current;
    u.rate = 0.95;
    u.pitch = 1; // a raised pitch makes the system voices sound more robotic
    u.onend = () => clear(id);
    u.onerror = () => clear(id);
    setSpeakingId(id);
    synth.speak(u);
  }, [synth, systemOk, clear]);

  const toggle = useCallback((id: string, text: string) => {
    const nv = neuralVoice();
    const wasMine = speakingId === id || loadingId === id;
    synth?.cancel();
    nv.stop();
    setSpeakingId(null);
    setLoadingId(null);
    if (wasMine) return;
    const neural = neuralOk && !nv.broken;
    // The neural voice is always preferred: if it is still loading, the button shows
    // "Warming up my voice" with progress rather than reading in a robotic system voice. The
    // installed voice is used only when the neural voice cannot run or fails.
    if (neural) {
      // "Warming up my voice" until the first sentence plays (instant when it was prepared).
      setSpeakingId(id);
      setLoadingId(id);
      nv.speak(text, {
        onStart: () => setLoadingId((cur) => (cur === id ? null : cur)),
        onEnd: () => clear(id),
        onError: () => { clear(id); speakSystem(id, text); },
      });
      return;
    }
    speakSystem(id, text);
  },[synth, neuralOk, systemOk, speakingId, loadingId, clear, speakSystem]);

  /** Prepares the speech for a new answer in the background (only once the voice is loaded). */
  const prepare = useCallback((text: string) => { if (neuralOk) neuralVoice().prepare(text); }, [neuralOk]);

  const nv = neuralVoice();
  return {
    supported: (neuralOk && !nv.broken) || systemOk,
    speakingId,
    loadingId,
    /** Model download percent while the first "Read to me" waits for it, else undefined. */
    loadingPercent: loadingId && !nv.ready && nv.progress > 0 && nv.progress < 100 ? nv.progress : undefined,
    toggle,
    prepare,
  };
}

function isNativeApp(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}
