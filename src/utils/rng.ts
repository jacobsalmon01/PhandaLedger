/**
 * Cryptographically-strong uniform integer in [1, faces] using rejection sampling
 * to avoid modulo bias. Falls back to Math.random only if crypto is unavailable.
 */
export function rollDie(faces: number): number {
  if (faces <= 0) return 0;
  const c: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (c && typeof c.getRandomValues === 'function') {
    const max = 0x100000000; // 2^32
    const limit = max - (max % faces);
    const buf = new Uint32Array(1);
    // Rejection sample to stay unbiased.
    // In practice this loop almost never iterates more than once.
    while (true) {
      c.getRandomValues(buf);
      if (buf[0] < limit) return (buf[0] % faces) + 1;
    }
  }
  return Math.floor(Math.random() * faces) + 1;
}
