import react from '@vitejs/plugin-react';
import { realpathSync } from 'node:fs';
import { join, sep } from 'node:path';
import { defineConfig } from 'vite';

// The speech engine (onnxruntime-web) used by kokoro-js, served from this app instead of a CDN so
// the read-aloud voice works offline, on school networks that block CDNs, and in the native apps.
// pnpm keeps it two levels down (kokoro-js -> @huggingface/transformers -> onnxruntime-web).
const transformers = realpathSync(join(realpathSync('node_modules/kokoro-js'), '..', '@huggingface', 'transformers'));
const posix = (p: string) => p.split(sep).join('/');
const ortDist =join(realpathSync(join(transformers, '..', '..', 'onnxruntime-web')), 'dist');

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Regex aliases, so the "?url" suffix is kept.
    alias: [
      { find: /^sprout-ort-wasm/, replacement: posix(join(ortDist, 'ort-wasm-simd-threaded.jsep.wasm')) },
      { find: /^sprout-ort-mjs/, replacement: posix(join(ortDist, 'ort-wasm-simd-threaded.jsep.mjs')) },
    ],
  },
  test: { include: ['src/**/*.test.ts'] },
});
