/**
 * Input normalization & validation for clinical data entered by the user.
 */

/**
 * Normalizes free-text clinical input (reading notes, journal entries) for
 * STORAGE. The text is kept exactly as the user typed it: React escapes on
 * render, and FHIR/PDF exports need the raw characters (`5mg/hari`,
 * `kopi & jalan pagi`). HTML-escaping here corrupted notes on every edit
 * (`&` → `&amp;` → `&amp;amp;`) and leaked the entities into FHIR exports.
 * Escape only at a non-React HTML sink, if one is ever added.
 */
export function normalizeClinicalText(input?: string, max = 2000): string {
  if (!input) return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

const LEGACY_ENTITY_PATTERN = /&(amp|lt|gt|quot|#x27|#x2F);/g;
const LEGACY_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#x27': "'",
  '#x2F': '/'
};

/**
 * Reverses the HTML-escaping that the old storage sanitizer applied, including
 * repeated escaping from multiple edits (`&amp;amp;` → `&`). Only the exact
 * entities the old sanitizer produced are decoded.
 */
export function decodeLegacyEscapedText(input: string): string {
  let current = input;
  // Each edit added one escaping layer; a handful of passes covers real data.
  for (let i = 0; i < 8; i++) {
    const next = current.replace(LEGACY_ENTITY_PATTERN, (_, name: string) => LEGACY_ENTITIES[name]);
    if (next === current) break;
    current = next;
  }
  return current;
}

export function validateBPRange(systolic: number, diastolic: number, pulse?: number): { valid: boolean; error?: string } {
  if (typeof systolic !== 'number' || !Number.isFinite(systolic) || isNaN(systolic) || systolic < 40 || systolic > 300) {
    return { valid: false, error: 'Sistolik harus berada di antara 40 dan 300 mmHg.' };
  }
  if (typeof diastolic !== 'number' || !Number.isFinite(diastolic) || isNaN(diastolic) || diastolic < 30 || diastolic > 200) {
    return { valid: false, error: 'Diastolik harus berada di antara 30 dan 200 mmHg.' };
  }
  if (systolic <= diastolic) {
    return { valid: false, error: 'Sistolik (tekanan atas) harus lebih tinggi dari Diastolik (tekanan bawah).' };
  }
  if (pulse !== undefined && pulse !== null) {
    if (typeof pulse !== 'number' || !Number.isFinite(pulse) || isNaN(pulse) || pulse < 30 || pulse > 250) {
      return { valid: false, error: 'Denyut nadi harus berada di antara 30 dan 250 BPM.' };
    }
  }
  return { valid: true };
}
