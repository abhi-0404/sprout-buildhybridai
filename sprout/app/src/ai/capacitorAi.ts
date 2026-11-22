import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { AiClient, AiRequest, AiResult, DeviceStatus } from './types';

// Native implementation of AiClient. It talks to the "SproutAi" Capacitor plugin, whose sources
// live in native/android/SproutAiPlugin.kt and native/ios/SproutAiPlugin.swift. Both call the
// Firebase AI Logic hybrid inference SDKs and report where each request really ran.

export interface SproutAiPlugin {
  deviceStatus(): Promise<{ status: DeviceStatus }>;
  /** Downloads or prepares the on-device model. Progress arrives on the 'downloadProgress' event. */
  prepareDevice(): Promise<void>;
  generate(options: {
    task: string;
    mode: string;
    prompt: string;
    /** JSON schema as a string; the native side appends it to the prompt on Android. */
    jsonSchema?: string;
  }): Promise<{ text: string; source: 'device' | 'cloud'; latencyMs: number }>;
  addListener(
    eventName: 'downloadProgress',
    listener: (event: { fraction: number }) => void,
  ): Promise<PluginListenerHandle>;
}

export const SproutAi = registerPlugin<SproutAiPlugin>('SproutAi');

/** True when running inside the Android or iOS Capacitor shell (not in a browser). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export class CapacitorAi implements AiClient {
  readonly platform: 'android' | 'ios';

  constructor() {
    const p = Capacitor.getPlatform();
    if (p !== 'android' && p !== 'ios') throw new Error(`CapacitorAi needs a native platform, got "${p}"`);
    this.platform = p;
  }

  async deviceStatus(): Promise<DeviceStatus> {
    try {
      return (await SproutAi.deviceStatus()).status;
    } catch {
      return 'unavailable';
    }
  }

  async prepareDevice(onProgress?: (fraction: number) => void): Promise<void> {
    let handle: PluginListenerHandle | undefined;
    if (onProgress) {
      handle = await SproutAi.addListener('downloadProgress', (e) => onProgress(e.fraction));
    }
    try {
      await SproutAi.prepareDevice();
    } finally {
      await handle?.remove();
    }
  }

  async generate(req: AiRequest): Promise<AiResult> {
    const res = await SproutAi.generate({
      task: req.task,
      mode: req.mode,
      prompt: req.prompt,
      jsonSchema: req.jsonSchema ? JSON.stringify(req.jsonSchema) : undefined,
    });
    return { text: res.text, source: res.source, latencyMs: res.latencyMs };
  }
}
