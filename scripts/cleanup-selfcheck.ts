// Self-check for legacy duplicate reading selection & stale upsert rejection. Run: node --experimental-strip-types scripts/cleanup-selfcheck.ts
import assert from 'node:assert/strict';
import { pickRecordToKeep } from './cleanup-legacy-duplicate-readings.js';

// 1. pickRecordToKeep tests
const uuidA = 'c028e3b5-31a4-4a46-88d4-f6b0f1e1cb01';
const uuidB = 'd139f4c6-42b5-5b57-99e5-07c1f2f2dc02';

// Prefers standard UUID over numeric id
const docNumeric = { _id: 'mongo1', id: 42, updatedAt: '2026-09-01T10:00:00.000Z' };
const docUuid = { _id: 'mongo2', id: uuidA, updatedAt: '2026-09-01T10:00:00.000Z' };
assert.equal(pickRecordToKeep([docNumeric, docUuid])?.id, uuidA);

// Prefers standard UUID over legacy-reading- prefix
const docLegacy = { _id: 'mongo3', id: 'legacy-reading-42', updatedAt: '2026-09-01T12:00:00.000Z' };
assert.equal(pickRecordToKeep([docLegacy, docUuid])?.id, uuidA);

// Prefers legacy-reading- prefix over numeric
assert.equal(pickRecordToKeep([docNumeric, docLegacy])?.id, 'legacy-reading-42');

// Between two standard UUIDs, prefers newer updatedAt
const docUuidOlder = { _id: 'mongo4', id: uuidA, updatedAt: '2026-09-01T08:00:00.000Z' };
const docUuidNewer = { _id: 'mongo5', id: uuidB, updatedAt: '2026-09-01T14:00:00.000Z' };
assert.equal(pickRecordToKeep([docUuidOlder, docUuidNewer])?.id, uuidB);

// Edge cases
assert.equal(pickRecordToKeep([]), null);
assert.equal(pickRecordToKeep([docNumeric])?.id, 42);

// 2. Logic check: stale upsert rejection condition (A3)
function shouldRejectStaleUpsert(tombstoneDeletedAt: string | null | undefined, clientUpdatedAt: string | null | undefined): boolean {
  if (!tombstoneDeletedAt) return false;
  const tombstoneTime = new Date(tombstoneDeletedAt).getTime();
  const editTime = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : 0;
  return tombstoneTime >= editTime;
}

// Deleted at 12:00, stale device pushes edit from 10:00 -> MUST REJECT (true)
assert.equal(shouldRejectStaleUpsert('2026-10-02T12:00:00.000Z', '2026-10-02T10:00:00.000Z'), true);

// Deleted at 12:00, stale device pushes edit from exactly 12:00 -> MUST REJECT (true)
assert.equal(shouldRejectStaleUpsert('2026-10-02T12:00:00.000Z', '2026-10-02T12:00:00.000Z'), true);

// Deleted at 12:00, user restores/edits at 13:00 -> ALLOW (false, newer than deletion)
assert.equal(shouldRejectStaleUpsert('2026-10-02T12:00:00.000Z', '2026-10-02T13:00:00.000Z'), false);

// No tombstone -> ALLOW (false)
assert.equal(shouldRejectStaleUpsert(null, '2026-10-02T10:00:00.000Z'), false);

console.log('cleanup-selfcheck: all checks passed');
