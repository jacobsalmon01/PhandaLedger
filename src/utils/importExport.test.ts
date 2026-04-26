import { describe, it, expect } from 'vitest';
import {
  validatePartyExport,
  migrateCharacters,
  buildExport,
  ImportValidationError,
  CURRENT_EXPORT_VERSION,
} from './importExport';
import { createCharacter, passivePerception, skillBonus, skillProficiencyMultiplier } from '../types/character';

// ── validatePartyExport ───────────────────────────────────────────────────────

describe('validatePartyExport', () => {
  function validPayload() {
    return {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: '2026-03-19T21:00:00.000Z',
      selectedId: 'abc-123',
      characters: [{ id: 'abc-123', name: 'Aldric' }],
    };
  }

  it('accepts a well-formed export object', () => {
    const result = validatePartyExport(validPayload());
    expect(result.version).toBe(CURRENT_EXPORT_VERSION);
    expect(result.characters).toHaveLength(1);
    expect(result.selectedId).toBe('abc-123');
  });

  it('accepts an empty characters array', () => {
    const result = validatePartyExport({ ...validPayload(), characters: [] });
    expect(result.characters).toEqual([]);
  });

  it('falls back to null selectedId when field is absent', () => {
    const payload = validPayload();
    delete (payload as Partial<typeof payload>).selectedId;
    const rest = payload;
    const result = validatePartyExport(rest);
    expect(result.selectedId).toBeNull();
  });

  it('throws when input is not an object', () => {
    expect(() => validatePartyExport('not an object')).toThrow(ImportValidationError);
    expect(() => validatePartyExport(null)).toThrow(ImportValidationError);
    expect(() => validatePartyExport([1, 2])).toThrow(ImportValidationError);
  });

  it('throws when version is missing', () => {
    const payload = validPayload();
    delete (payload as Partial<typeof payload>).version;
    const rest = payload;
    expect(() => validatePartyExport(rest)).toThrow(ImportValidationError);
  });

  it('throws when version is not a number', () => {
    expect(() => validatePartyExport({ ...validPayload(), version: '1' })).toThrow(ImportValidationError);
  });

  it('throws when the file version is newer than the app supports', () => {
    expect(() =>
      validatePartyExport({ ...validPayload(), version: CURRENT_EXPORT_VERSION + 1 })
    ).toThrow(ImportValidationError);
  });

  it('throws when characters is not an array', () => {
    expect(() => validatePartyExport({ ...validPayload(), characters: 'nope' })).toThrow(ImportValidationError);
  });

  it('throws when a character entry is not an object', () => {
    expect(() =>
      validatePartyExport({ ...validPayload(), characters: ['not-an-object'] })
    ).toThrow(ImportValidationError);
  });

  it('throws when a character is missing an id', () => {
    expect(() =>
      validatePartyExport({ ...validPayload(), characters: [{ name: 'No ID' }] })
    ).toThrow(ImportValidationError);
  });

  it('throws when a character id is not a string', () => {
    expect(() =>
      validatePartyExport({ ...validPayload(), characters: [{ id: 42, name: 'Bad ID' }] })
    ).toThrow(ImportValidationError);
  });
});

// ── migrateCharacters ─────────────────────────────────────────────────────────

describe('migrateCharacters', () => {
  it('passes through a fully-formed character unchanged', () => {
    const ch = createCharacter('Aldric');
    const [result] = migrateCharacters([ch]);
    // All fields present in the template should be present on the output.
    expect(result.id).toBe(ch.id);
    expect(result.name).toBe('Aldric');
    expect(result.abilities).toEqual(ch.abilities);
  });

  it('fills in missing fields from the createCharacter template', () => {
    // Simulate a character saved before `shortRestsUsed` was added.
    const partial = { id: 'x', name: 'Old Save' } as unknown;
    const [result] = migrateCharacters([partial as ReturnType<typeof createCharacter>]);

    // Fields from the template should be present.
    expect(result.shortRestsUsed).toBe(0);
    expect(result.abilities).toBeDefined();
    expect(result.spellSlots).toEqual([]);
    expect(result.skillExpertise).toEqual([]);
  });

  it('does not overwrite fields that are already present', () => {
    const ch = { ...createCharacter(), name: 'Preserved', level: 10 };
    const [result] = migrateCharacters([ch]);
    expect(result.name).toBe('Preserved');
    expect(result.level).toBe(10);
  });

  it('handles an empty array', () => {
    expect(migrateCharacters([])).toEqual([]);
  });

  it('keeps expertise skills proficient when migrating', () => {
    const ch = { ...createCharacter(), skillProficiencies: [], skillExpertise: ['stealth'] };
    const [result] = migrateCharacters([ch]);
    expect(result.skillProficiencies).toContain('stealth');
    expect(result.skillExpertise).toEqual(['stealth']);
  });
});

// ── Skill expertise helpers ─────────────────────────────────────────────────

describe('skill expertise helpers', () => {
  it('doubles only proficiency bonus for expertise skills', () => {
    const ch = createCharacter('Keswick');
    ch.level = 4;
    ch.abilities.dex = 18;
    ch.skillProficiencies = ['stealth'];
    ch.skillExpertise = ['stealth'];

    expect(skillProficiencyMultiplier(ch, 'stealth')).toBe(2);
    expect(skillBonus(ch, 'stealth', 'dex')).toBe(8);
  });

  it('includes expertise in passive perception', () => {
    const ch = createCharacter('Scout');
    ch.level = 4;
    ch.abilities.wis = 14;
    ch.skillProficiencies = ['perception'];
    ch.skillExpertise = ['perception'];

    expect(passivePerception(ch)).toBe(16);
  });
});

// ── buildExport ───────────────────────────────────────────────────────────────

describe('buildExport', () => {
  it('produces the correct structure', () => {
    const ch = createCharacter('Thorn');
    const result = buildExport([ch], ch.id);
    expect(result.version).toBe(CURRENT_EXPORT_VERSION);
    expect(result.characters).toHaveLength(1);
    expect(result.selectedId).toBe(ch.id);
    expect(typeof result.exportedAt).toBe('string');
  });

  it('accepts an empty party with null selectedId', () => {
    const result = buildExport([], null);
    expect(result.characters).toEqual([]);
    expect(result.selectedId).toBeNull();
  });
});
