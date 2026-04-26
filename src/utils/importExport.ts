/**
 * importExport.ts
 *
 * Pure utility functions for serialising and deserialising party state.
 * Nothing here touches React, the store, or the DOM (except `triggerDownload`,
 * which is isolated so it can be easily replaced in tests).
 *
 * Export format versioning
 * ────────────────────────
 * The `version` field lets us write migration paths in `migrateCharacters` as
 * the schema evolves, without breaking saves created by older releases.
 * Current format: v1.
 */

import { type Character, createCharacter, normalizeSkillTraining } from '../types/character';
import type { BattleMapExport } from '../store/useBattleMapStore';

// ── Public types ──────────────────────────────────────────────────────────────

export const CURRENT_EXPORT_VERSION = 2;

/** The shape written to / read from the JSON file. */
export interface PartyExport {
  version: number;
  exportedAt: string;   // ISO-8601 timestamp
  selectedId: string | null;
  characters: Character[];
  battleMap?: BattleMapExport;
}

/** Structured error thrown when an import file is malformed. */
export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates that `data` conforms to the PartyExport shape.
 *
 * Throws `ImportValidationError` with a human-readable message on any
 * structural problem so the UI can surface it to the user.
 *
 * Does NOT deep-validate individual character fields — missing fields are
 * handled by `migrateCharacters` which fills them from the template defaults.
 */
export function validatePartyExport(data: unknown): PartyExport {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ImportValidationError('File does not contain a JSON object.');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    throw new ImportValidationError(
      'Missing or invalid "version" field — this may not be a PhandaLedger save file.'
    );
  }

  if (obj.version > CURRENT_EXPORT_VERSION) {
    throw new ImportValidationError(
      `Save file is version ${obj.version}, but this app only supports up to v${CURRENT_EXPORT_VERSION}. ` +
      `Please update PhandaLedger.`
    );
  }

  if (!Array.isArray(obj.characters)) {
    throw new ImportValidationError('Missing or invalid "characters" array.');
  }

  // Each character must have at minimum an id (string) so we can identity-check it.
  obj.characters.forEach((ch, i) => {
    if (typeof ch !== 'object' || ch === null) {
      throw new ImportValidationError(`Character at index ${i} is not an object.`);
    }
    if (typeof (ch as Record<string, unknown>).id !== 'string') {
      throw new ImportValidationError(`Character at index ${i} is missing a string "id" field.`);
    }
  });

  const result: PartyExport = {
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    selectedId: typeof obj.selectedId === 'string' ? obj.selectedId : null,
    characters: obj.characters as Character[],
  };

  // v2+: optional battle map state
  if (obj.battleMap && typeof obj.battleMap === 'object' && !Array.isArray(obj.battleMap)) {
    result.battleMap = obj.battleMap as BattleMapExport;
  }

  return result;
}

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * Fills any missing fields on each imported character using the current
 * `createCharacter()` template as the source of defaults.
 *
 * This is the same strategy used in `useStore.hydrate()`, making it safe to
 * import saves created by older versions of the app.
 */
export function migrateCharacters(characters: Character[]): Character[] {
  const template = createCharacter();
  return characters.map((ch) => {
    const migrated = { ...ch };
    for (const key of Object.keys(template) as (keyof Character)[]) {
      if (!(key in migrated)) {
        // @ts-expect-error — intentional dynamic assignment for migration
        migrated[key] = template[key];
      }
    }
    normalizeSkillTraining(migrated);
    return migrated;
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Builds the serialisable export object from the current app state.
 * Does not trigger any side-effects — call `triggerDownload` separately.
 */
export function buildExport(
  characters: Character[],
  selectedId: string | null,
  battleMap?: BattleMapExport,
): PartyExport {
  const result: PartyExport = {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    selectedId,
    characters,
  };
  if (battleMap) result.battleMap = battleMap;
  return result;
}

/**
 * Triggers a browser file download for a JSON blob.
 *
 * Isolated from `exportParty` so unit tests can verify the export shape
 * without needing a DOM.
 */
export function triggerDownload(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after a tick to give the browser time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Builds and immediately downloads the party as a timestamped JSON file.
 * Filename example: `phandaLedger-2026-03-19.json`
 */
export function exportParty(
  characters: Character[],
  selectedId: string | null,
  battleMap?: BattleMapExport,
): void {
  const data = buildExport(characters, selectedId, battleMap);
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(`phandaLedger-${date}.json`, data);
}

// ── Import ────────────────────────────────────────────────────────────────────

/**
 * Reads a File object, parses the JSON, and validates its structure.
 *
 * Resolves with a validated + migrated `PartyExport` ready to be handed to
 * the store's `replaceParty` action.
 *
 * Rejects with `ImportValidationError` for structural problems, or a generic
 * Error for unreadable / non-JSON files.
 */
export async function parseImportFile(file: File): Promise<PartyExport> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportValidationError('File is not valid JSON.');
  }

  const validated = validatePartyExport(parsed);

  // Apply schema migrations so the store receives fully-formed characters.
  validated.characters = migrateCharacters(validated.characters);

  return validated;
}
