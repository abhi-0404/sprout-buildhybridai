import { useCallback, useEffect, useRef, useState } from 'react';

// Local-only speech helpers. Privacy promise: no audio ever goes to a cloud speech service.
// Voice input is offered ONLY when the browser can recognise speech on the device itself,
// and read-aloud only ever uses a voice installed on the device.

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
  const [supported, setSupported] = useState(Boolean(synth));
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);

  useEffect(() => {
    if (!synth) return;
    const pick = () => {
      const all = synth.getVoices();
      if (!all.length) return; // not loaded yet: the default voice is used
      const local = all.filter((v) => v.localService);
      voice.current = local.find((v) => v.lang.toLowerCase().startsWith('en')) ?? local[0];
      setSupported(local.length > 0); // no on-device voice: hide the button rather than risk a cloud voice
    };
    pick();
    synth.addEventListener?.('voiceschanged', pick);
    return () => {
      synth.removeEventListener?.('voiceschanged', pick);
      synth.cancel();
    };
  }, [synth]);

  const toggle = useCallback((id: string, text: string) => {
    if (!synth) return;
    if (speakingId === id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice.current) u.voice = voice.current;
    u.rate = 0.95;
    u.pitch = 1.05;
    u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
    u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    setSpeakingId(id);
    synth.speak(u);
  }, [synth, speakingId]);

  return { supported, speakingId, toggle };
}
