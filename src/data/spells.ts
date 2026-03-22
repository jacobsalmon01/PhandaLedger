import rawCsv from './spells.csv?raw';

export interface SpellEntry {
  name: string;
  slug: string;
  description: string;
  higherLevels: string;
  level: number; // 0 = cantrip, 1–9 = leveled
  school: string;
  classes: string[];
  duration: string;
  ritual: boolean;
  castingTime: string;
  range: string;
  components: { v: boolean; s: boolean; m: boolean; materials: string };
  concentration: boolean;
  /** Pre-computed lowercase name for search */
  _nameLower: string;
}

/** Parses one CSV row, respecting double-quoted fields with embedded commas */
function parseRow(row: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < row.length) {
    if (row[i] === '"') {
      i++; // skip opening quote
      let field = '';
      while (i < row.length) {
        if (row[i] === '"' && row[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (row[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += row[i++];
        }
      }
      fields.push(field);
      if (row[i] === ',') i++;
    } else {
      const end = row.indexOf(',', i);
      if (end === -1) {
        fields.push(row.slice(i));
        break;
      } else {
        fields.push(row.slice(i, end));
        i = end + 1;
      }
    }
  }
  return fields;
}

const lines = rawCsv.trim().split('\n');

// columns: name,image,description,higher_levels,level,school,classes,duration,ritual,casting_time,range,component_v,component_s,component_m,materials
export const SPELLS: SpellEntry[] = lines
  .slice(1)
  .filter((l) => l.trim())
  .map((line) => {
    const f = parseRow(line);
    const [name, , description, higherLevels, level, school, classes,
           duration, ritual, castingTime, range,
           componentV, componentS, componentM, materials] = f;
    return {
      name:        name?.trim() ?? '',
      slug:        (name?.trim() ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: description ?? '',
      higherLevels: higherLevels ?? '',
      level:       (level?.trim() === 'cantrip') ? 0 : (parseInt(level?.trim() ?? '0', 10) || 0),
      school:      school?.trim() ?? '',
      classes:     classes ? classes.split(',').map((c) => c.trim()).filter(Boolean) : [],
      duration:    duration?.trim() ?? '',
      ritual:      ritual?.trim() === '1',
      castingTime: castingTime?.trim() ?? '',
      range:       range?.trim() ?? '',
      components: {
        v:         componentV?.trim() === '1',
        s:         componentS?.trim() === '1',
        m:         componentM?.trim() === '1',
        materials: materials?.trim() ?? '',
      },
      concentration: (duration ?? '').toLowerCase().includes('concentration'),
      _nameLower: (name?.trim() ?? '').toLowerCase(),
    };
  });

/** Unique class names across all spells, sorted */
export const ALL_CLASSES: string[] = [...new Set(SPELLS.flatMap((s) => s.classes))].sort();

const LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
export function levelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? `${level}th`;
}
