// Text preparation for the neural read-aloud voice: short chunks so the first words play fast.

const EMOJI = /\p{Extended_Pictographic}|️|‍/gu;

/** Splits an answer into speakable chunks of about one sentence (at most `max` characters). */
export function speechChunks(text: string, max = 220): string[] {
  const clean = text.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?:])\s+/);
  const out: string[] = [];
  for (const s of sentences) {
    if (s.length <= max) { out.push(s); continue; }
    // A very long sentence: break at commas, then at spaces.
    let rest = s;
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf(', ', max), rest.lastIndexOf(' ', max));
      const at = cut > max / 3 ? cut + 1 : max;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  // Join tiny fragments ("Yes!") onto the next chunk so the voice does not stutter.
  const merged: string[] = [];
  for (const c of out) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.length < 25 && last.length + c.length + 1 <= max) merged[merged.length - 1] = `${last} ${c}`;
    else merged.push(c);
  }
  return merged.filter((c) => /[\p{L}\p{N}]/u.test(c));
}
