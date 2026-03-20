/**
 * shareUrl.ts
 *
 * Encodes/decodes party data in a URL hash for clipboard-based sharing.
 * Portraits are stripped before encoding to keep URLs small.
 *
 * Format: #share=<base64url(deflate-raw(JSON))>
 */

import type { Character } from '../types/character';
import {
  type PartyExport,
  validatePartyExport,
  migrateCharacters,
  CURRENT_EXPORT_VERSION,
} from './importExport';

// ── Compression helpers ────────────────────────────────────────────────────

async function compress(text: string): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(text));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(bytes as unknown as Uint8Array<ArrayBuffer>);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(out);
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Public API ─────────────────────────────────────────────────────────────

export const SHARE_HASH_PREFIX = 'share=';

/** Build a shareable URL with party data encoded in the hash. Portraits are stripped. */
export async function buildShareUrl(
  characters: Character[],
  selectedId: string | null,
): Promise<string> {
  const stripped = characters.map((ch) => ({ ...ch, portrait: '' }));
  const payload: PartyExport = {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    selectedId,
    characters: stripped,
  };
  const compressed = await compress(JSON.stringify(payload));
  const encoded = toBase64Url(compressed);
  const url = new URL(window.location.href);
  url.hash = `${SHARE_HASH_PREFIX}${encoded}`;
  return url.toString();
}

/** Parse a share hash (with or without leading #). Returns null if not a valid share. */
export async function parseShareHash(hash: string): Promise<PartyExport | null> {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(SHARE_HASH_PREFIX)) return null;
  const encoded = raw.slice(SHARE_HASH_PREFIX.length);
  try {
    const bytes = fromBase64Url(encoded);
    const json = await decompress(bytes);
    const validated = validatePartyExport(JSON.parse(json));
    validated.characters = migrateCharacters(validated.characters);
    return validated;
  } catch {
    return null;
  }
}
