#!/usr/bin/env node
/**
 * One-off migration script to clean up legacy duplicate readings in MongoDB Atlas (audit P0-5, issue #10).
 *
 * Background:
 * Before PR #8 (v9 UUID migration), each sync pull minted a new random UUID for numeric-id readings
 * without deleting the old record from the cloud. As a result, readings duplicated every ~30 seconds.
 *
 * Behavior:
 * 1. Groups readings in the 'observations' collection by:
 *    userId + profileId + timestamp + systolic + diastolic + pulse.
 * 2. Selects the primary record to keep (prioritizing true UUID strings and newest timestamps).
 * 3. In --dry-run mode (default), logs the plan without mutating the database.
 * 4. In --apply (or --execute) mode:
 *    - Deletes duplicate documents from 'observations'.
 *    - Writes tombstones into 'tombstones' so other devices prune their local Dexie copies on next pull.
 * 5. Fully idempotent: subsequent runs find 0 duplicate groups.
 *
 * Usage:
 *   node scripts/cleanup-legacy-duplicate-readings.js             # Dry-run mode
 *   node scripts/cleanup-legacy-duplicate-readings.js --apply     # Execute changes
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

export function pickRecordToKeep(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return null;
  if (docs.length === 1) return docs[0];

  const isStandardUuid = (id) =>
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const isLegacyPrefixed = (id) =>
    typeof id === 'string' && id.startsWith('legacy-reading-');

  const getTime = (doc) => {
    const raw = doc.updatedAt || doc.createdAt || doc.serverReceivedAt || null;
    return raw ? new Date(raw).getTime() : 0;
  };

  // Rank docs:
  // Score 3: standard UUID string
  // Score 2: legacy-reading- prefix
  // Score 1: non-numeric string
  // Score 0: numeric / undefined
  const getScore = (doc) => {
    const id = doc.id;
    if (isStandardUuid(id)) return 3;
    if (isLegacyPrefixed(id)) return 2;
    if (typeof id === 'string' && Number.isNaN(Number(id))) return 1;
    return 0;
  };

  const sorted = [...docs].sort((a, b) => {
    const scoreDiff = getScore(b) - getScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const timeDiff = getTime(b) - getTime(a);
    if (timeDiff !== 0) return timeDiff;
    // Tie-break with ObjectId timestamp or string comparison
    return String(b._id).localeCompare(String(a._id));
  });

  return sorted[0];
}

export async function runCleanup({ uri, isDryRun = true, dbName = 'aortalink_ehr_db' }) {
  if (!uri) {
    throw new Error('MongoDB connection string not provided. Set MONGODB_URI in environment or .env file.');
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const observations = db.collection('observations');
    const tombstones = db.collection('tombstones');

    console.log(`[AortaLink Cleanup] Connected to database: ${dbName}`);
    console.log(`[AortaLink Cleanup] Mode: ${isDryRun ? 'DRY-RUN (read-only, no changes applied)' : 'APPLY (live mutations)'}`);

    const duplicateGroups = await observations
      .aggregate([
        {
          $group: {
            _id: {
              userId: '$userId',
              profileId: '$profileId',
              timestamp: '$timestamp',
              systolic: '$systolic',
              diastolic: '$diastolic',
              pulse: '$pulse'
            },
            count: { $sum: 1 },
            docs: {
              $push: {
                _id: '$_id',
                id: '$id',
                userId: '$userId',
                profileId: '$profileId',
                timestamp: '$timestamp',
                systolic: '$systolic',
                diastolic: '$diastolic',
                pulse: '$pulse',
                updatedAt: '$updatedAt',
                createdAt: '$createdAt',
                serverReceivedAt: '$serverReceivedAt'
              }
            }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ])
      .toArray();

    console.log(`[AortaLink Cleanup] Found ${duplicateGroups.length} duplicate group(s) across observations.`);

    let totalRemoved = 0;
    let totalTombstoned = 0;

    for (const group of duplicateGroups) {
      const { userId, timestamp, systolic, diastolic, pulse } = group._id;
      const keepDoc = pickRecordToKeep(group.docs);
      const toRemove = group.docs.filter((d) => String(d._id) !== String(keepDoc._id));

      console.log(
        `\nGroup [user=${userId}, time=${timestamp}, BP=${systolic}/${diastolic}, pulse=${pulse}]:` +
        `\n  - Total records: ${group.docs.length}` +
        `\n  - Keeping record id: "${keepDoc.id}" (_id: ${keepDoc._id})` +
        `\n  - Duplicate records to remove: ${toRemove.map((d) => `"${d.id}"`).join(', ')}`
      );

      for (const dup of toRemove) {
        totalRemoved++;
        const recordIdStr = String(dup.id);

        if (!isDryRun) {
          // 1. Delete duplicate document from observations
          await observations.deleteOne({ _id: dup._id });

          // 2. Insert tombstone so local Dexie instances prune their local duplicates on next pull
          await tombstones.updateOne(
            { recordId: recordIdStr, table: 'readings', userId },
            {
              $set: {
                recordId: recordIdStr,
                table: 'readings',
                userId,
                deletedAt: new Date().toISOString()
              }
            },
            { upsert: true }
          );
          totalTombstoned++;
        }
      }
    }

    console.log('\n---------------------------------------------------------');
    console.log(`[AortaLink Cleanup Summary]`);
    console.log(`- Duplicate groups: ${duplicateGroups.length}`);
    console.log(`- Total duplicates ${isDryRun ? 'identified to remove' : 'removed'}: ${totalRemoved}`);
    if (!isDryRun) {
      console.log(`- Total tombstones written: ${totalTombstoned}`);
      console.log('[SUCCESS] Cloud duplicate cleanup completed and tombstones registered.');
    } else {
      console.log('[DRY RUN COMPLETE] No records were modified. To execute changes, run with: --apply or --execute');
    }
    console.log('---------------------------------------------------------');

    return {
      duplicateGroups: duplicateGroups.length,
      totalRemoved,
      totalTombstoned,
      isDryRun
    };
  } finally {
    await client.close();
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply') || args.includes('--execute');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  runCleanup({ uri, isDryRun: !isApply })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[AortaLink Cleanup Error]:', err.message);
      process.exit(1);
    });
}
