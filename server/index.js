import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.PUBLIC_MONGODB_URI ||
  process.env.VITE_MONGODB_URI ||
  '';

const DB_NAME = process.env.PUBLIC_MONGODB_ATLAS_DB || 'aortalink_ehr_db';

// Signing secret: MUST come from the environment. Without it we fall back to
// an ephemeral random key — tokens keep working but invalidate on every
// restart, which is loud and safe instead of quiet and forgeable.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('[AortaLink Security] JWT_SECRET is not set — using an EPHEMERAL random secret. Sessions will be invalidated on restart. Set JWT_SECRET in .env (openssl rand -hex 64).');
}

const app = express();

// Explicit CORS middleware for Vercel & Multi-device deployment.
// Auth is Bearer-token based (no cookies), so credentials are not needed.
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

let dbClient = null;
let db = null;
let connectionPromise = null;

// Connect to MongoDB Atlas (Serverless Safe)
async function connectToMongo() {
  if (db) return db;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      console.log('[AortaLink Server] Connecting to MongoDB Atlas Cloud Cluster...');
      if (!dbClient) {
        dbClient = new MongoClient(MONGODB_URI, {
          connectTimeoutMS: 10000,
          serverSelectionTimeoutMS: 10000
        });
      }
      await dbClient.connect();
      db = dbClient.db(DB_NAME);
      console.log(`[AortaLink Server] Connected to MongoDB Atlas Database: "${DB_NAME}"`);
      return db;
    } catch (error) {
      console.error('[AortaLink Server] MongoDB Connection Error:', error);
      db = null;
      dbClient = null;
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

// Helper to get connected DB instance
async function getDatabase() {
  if (db) return db;
  try {
    return await connectToMongo();
  } catch (err) {
    console.error('[AortaLink Server] getDatabase Error:', err);
    return null;
  }
}

// Middleware to ensure DB connection is ready before handling any /api request
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  try {
    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.status(500).json({
        success: false,
        message: 'Gagal terhubung ke MongoDB Atlas Cloud. Pastikan IP Whitelist di MongoDB Atlas diset ke 0.0.0.0/0.'
      });
    }
    next();
  } catch (error) {
    console.error('[AortaLink Server] API DB Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: `Gagal terhubung ke MongoDB Atlas Cloud (${error?.message || 'Koneksi Ditolak'}). Pastikan IP Whitelist di MongoDB Atlas diset ke 0.0.0.0/0.`
    });
  }
});

// Middleware to verify JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Sesi tidak valid atau telah kadaluwarsa.' });
    }
    req.user = user;
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const activeDb = await getDatabase();
  res.json({
    status: 'ok',
    app: 'AortaLink Open-Source EHR Backend API',
    databaseConnected: !!activeDb,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

/**
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, tier = 'pro_ehr' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan kata sandi wajib diisi.' });
    }

    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung. Silakan coba beberapa saat lagi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersCollection = activeDb.collection('users');

    const existingUser = await usersCollection.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Alamat email ini sudah terdaftar. Silakan login.' });
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = 'usr-mongo-' + Date.now();
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const createdAt = new Date().toISOString();

    const newUserDoc = {
      userId,
      name,
      email: cleanEmail,
      passwordHash,
      authProvider: 'email',
      subscriptionTier: tier,
      avatarUrl,
      createdAt,
      updatedAt: createdAt
    };

    await usersCollection.insertOne(newUserDoc);

    const userSession = {
      id: userId,
      name,
      email: cleanEmail,
      avatarUrl,
      authProvider: 'email',
      subscriptionTier: tier,
      loginAt: createdAt
    };

    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '60d' });

    return res.status(201).json({
      success: true,
      message: 'Registrasi akun MongoDB Atlas berhasil!',
      token,
      user: { ...userSession, token }
    });
  } catch (error) {
    console.error('[AortaLink Auth] Register Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal merespons registrasi.' });
  }
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi.' });
    }

    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung. Pastikan Network Access di MongoDB Atlas mengizinkan 0.0.0.0/0.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersCollection = activeDb.collection('users');

    const userDoc = await usersCollection.findOne({ email: cleanEmail });
    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'Akun dengan email ini belum terdaftar. Silakan daftar dulu.' });
    }

    let isMatch = false;
    if (userDoc.passwordHash) {
      isMatch = await bcrypt.compare(password, userDoc.passwordHash);
      if (!isMatch) {
        // Legacy-account migration path: very old accounts stored an
        // unsalted SHA-256 hex digest. If it matches, transparently upgrade
        // the account to bcrypt. Plaintext comparison is NEVER accepted.
        const legacySha256 = /^[a-f0-9]{64}$/i.test(userDoc.passwordHash) &&
          crypto.createHash('sha256').update(password).digest('hex') === userDoc.passwordHash;
        if (legacySha256) {
          const upgradedHash = await bcrypt.hash(password, 10);
          await usersCollection.updateOne({ _id: userDoc._id }, { $set: { passwordHash: upgradedHash } });
          isMatch = true;
        }
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kata sandi yang Anda masukkan salah. Silakan coba lagi.' });
    }

    const userSession = {
      id: userDoc.userId || userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      avatarUrl: userDoc.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userDoc.name)}`,
      authProvider: userDoc.authProvider || 'email',
      subscriptionTier: userDoc.subscriptionTier || 'pro_ehr',
      loginAt: new Date().toISOString()
    };

    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '60d' });

    return res.json({
      success: true,
      message: 'Autentikasi MongoDB Atlas Berhasil!',
      token,
      user: { ...userSession, token }
    });
  } catch (error) {
    console.error('[AortaLink Auth] Login Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal memproses login.' });
  }
});


/**
 * GET /api/auth/me
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.json({ success: true, user: req.user });
    }
    const usersCollection = activeDb.collection('users');
    const userDoc = await usersCollection.findOne({ email: req.user.email });
    if (userDoc) {
      const userSession = {
        id: userDoc.userId || req.user.id,
        name: userDoc.name,
        email: userDoc.email,
        avatarUrl: userDoc.avatarUrl,
        authProvider: userDoc.authProvider || 'email',
        subscriptionTier: userDoc.subscriptionTier || 'pro_ehr',
        token: req.headers['authorization'].split(' ')[1],
        loginAt: req.user.loginAt || new Date().toISOString()
      };
      return res.json({ success: true, user: userSession });
    }
    return res.json({ success: true, user: req.user });
  } catch (error) {
    return res.json({ success: true, user: req.user });
  }
});

// ==========================================
// FULL CLOUD DATA SYNC ENDPOINTS (14 ENTITIES + SETTINGS)
// ==========================================

/**
 * POST /api/sync/push
 * Push ALL 14 local EHR tables & settings to MongoDB Atlas
 */
app.post('/api/sync/push', authenticateToken, async (req, res) => {
  try {
    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const userId = req.user.id;
    const {
      readings = [],
      medications = [],
      medicationLogs = [],
      labResults = [],
      habits = [],
      sodiumLogs = [],
      sleepLogs = [],
      gamification = [],
      profiles = [],
      reminders = [],
      fhirPatients = [],
      fhirObservations = [],
      fhirMedicationRequests = [],
      fhirMedicationStatements = [],
      ascvdProfiles = [],
      clinicalNotes = [],
      conditions = [],
      familyHistory = [],
      immunizations = [],
      tombstones = [],
      userSettings = null
    } = req.body;

    let totalSynced = 0;
    let conflictSkipped = 0;

    /**
     * updatedAt-aware upsert: the incoming record only wins when its
     * clientUpdatedAt (stamped by the device that last modified it) is at
     * least as new as the stored one, AND the record does not have a newer
     * tombstone. This prevents a stale device from silently resurrecting
     * deleted records or overwriting newer edits made on another device (A3).
     */
    const upsertCollection = async (collName, items, tableName, keyField = 'id') => {
      if (!Array.isArray(items) || items.length === 0) return { applied: 0, skipped: 0 };
      const collection = activeDb.collection(collName);
      let applied = 0;
      let skipped = 0;
      for (const item of items) {
        if (item[keyField] === undefined || item[keyField] === null) continue;
        const idStr = String(item[keyField]);
        const idNum = Number(idStr);
        const query = { [keyField]: item[keyField], userId };
        const clientUpdatedAt = item.updatedAt || item.createdAt || null;
        const editTime = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : 0;

        // A3: Check if this record already has a tombstone.
        // If a tombstone exists and tombstone.deletedAt >= clientUpdatedAt, the record was
        // deleted at or after this edit. Reject the stale upsert so dead records don't resurrect.
        const idQuery = [
          { recordId: idStr },
          { id: idStr },
          ...(Number.isFinite(idNum) ? [{ recordId: idNum }, { id: idNum }] : [])
        ];
        const tombstone = await activeDb.collection('tombstones').findOne({
          userId,
          table: tableName,
          $or: idQuery
        });

        if (tombstone && tombstone.deletedAt) {
          const tombstoneTime = new Date(tombstone.deletedAt).getTime();
          if (tombstoneTime >= editTime) {
            skipped++;
            continue;
          }
        }

        const existing = await collection.findOne(query, { projection: { clientUpdatedAt: 1 } });
        if (existing && existing.clientUpdatedAt && clientUpdatedAt &&
            new Date(existing.clientUpdatedAt).getTime() > new Date(clientUpdatedAt).getTime()) {
          skipped++;
          continue;
        }
        await collection.updateOne(
          query,
          { $set: { ...item, userId, clientUpdatedAt, serverReceivedAt: new Date().toISOString() } },
          { upsert: true }
        );
        // A record written after its deletion (e.g. restored from a backup)
        // retires the older tombstone, or other devices would delete it again.
        if (clientUpdatedAt) {
          await activeDb.collection('tombstones').deleteMany({
            userId,
            table: tableName,
            $or: idQuery,
            deletedAt: { $lt: clientUpdatedAt }
          });
        }
        applied++;
      }
      return { applied, skipped };
    };

    const syncResults = await Promise.all([
      upsertCollection('observations', readings, 'readings'),
      upsertCollection('medications', medications, 'medications'),
      upsertCollection('medication_logs', medicationLogs, 'medicationLogs'),
      upsertCollection('lab_results', labResults, 'labResults'),
      upsertCollection('habits', habits, 'habits'),
      upsertCollection('sodium_logs', sodiumLogs, 'sodiumLogs'),
      upsertCollection('sleep_logs', sleepLogs, 'sleepLogs'),
      upsertCollection('gamification', gamification, 'gamification'),
      upsertCollection('profiles', profiles, 'profiles'),
      upsertCollection('reminders', reminders, 'reminders'),
      upsertCollection('fhir_patients', fhirPatients, 'fhirPatients'),
      upsertCollection('fhir_observations', fhirObservations, 'fhirObservations'),
      upsertCollection('fhir_medication_requests', fhirMedicationRequests, 'fhirMedicationRequests'),
      upsertCollection('fhir_medication_statements', fhirMedicationStatements, 'fhirMedicationStatements'),
      upsertCollection('ascvd_profiles', ascvdProfiles, 'ascvdProfiles'),
      upsertCollection('clinical_notes', clinicalNotes, 'clinicalNotes'),
      upsertCollection('conditions', conditions, 'conditions'),
      upsertCollection('family_history', familyHistory, 'familyHistory'),
      upsertCollection('immunizations', immunizations, 'immunizations')
    ]);
    for (const result of syncResults) {
      totalSynced += result.applied;
      conflictSkipped += result.skipped;
    }

    // Tombstones: user deletions must propagate to every device. Store the
    // marker and immediately remove the record from its data collection.
    const tombstoneCollection = activeDb.collection('tombstones');
    const TABLE_TO_COLLECTION = {
      readings: 'observations',
      medications: 'medications',
      medicationLogs: 'medication_logs',
      labResults: 'lab_results',
      habits: 'habits',
      sodiumLogs: 'sodium_logs',
      sleepLogs: 'sleep_logs',
      gamification: 'gamification',
      profiles: 'profiles',
      reminders: 'reminders',
      fhirPatients: 'fhir_patients',
      fhirObservations: 'fhir_observations',
      fhirMedicationRequests: 'fhir_medication_requests',
      fhirMedicationStatements: 'fhir_medication_statements',
      ascvdProfiles: 'ascvd_profiles',
      clinicalNotes: 'clinical_notes',
      conditions: 'conditions',
      familyHistory: 'family_history',
      immunizations: 'immunizations'
    };
    if (Array.isArray(tombstones) && tombstones.length > 0) {
      for (const t of tombstones) {
        // Clients send `recordId` (see SyncTombstone); `id` is accepted for
        // older builds. Checking only `t.id` used to drop every deletion.
        const recordId = t?.recordId ?? t?.id;
        if (recordId === undefined || recordId === null || recordId === '' || !t.table) continue;
        const idStr = String(recordId);
        const table = String(t.table);
        await tombstoneCollection.updateOne(
          { recordId: idStr, table, userId },
          { $set: { recordId: idStr, table, userId, deletedAt: t.deletedAt || new Date().toISOString() } },
          { upsert: true }
        );
        const collName = TABLE_TO_COLLECTION[table];
        if (collName) {
          // Auto-increment tables store numeric ids, UUID tables strings.
          const asNum = Number(idStr);
          await activeDb.collection(collName).deleteOne({
            userId,
            $or: [{ id: idStr }, ...(Number.isFinite(asNum) ? [{ id: asNum }] : [])]
          });
        }
        totalSynced++;
      }
    }

    // Save User Settings (Theme, Active Profile, Layout)
    if (userSettings) {
      await activeDb.collection('user_settings').updateOne(
        { userId },
        { $set: { ...userSettings, userId, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      totalSynced += 1;
    }

    return res.json({
      success: true,
      totalSynced,
      conflictSkipped,
      message: `Berhasil menyinkronkan ${totalSynced} item rekam medis ke MongoDB Atlas Cloud.` +
        (conflictSkipped > 0 ? ` ${conflictSkipped} item dilewati karena versi di server lebih baru atau telah dihapus.` : ''),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AortaLink Sync] Push Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal mengunggah data sync.' });
  }
});

/**
 * GET /api/sync/pull
 * Pull ALL 14 EHR tables & settings from MongoDB Atlas to restore on any device
 */
app.get('/api/sync/pull', authenticateToken, async (req, res) => {
  try {
    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const userId = req.user.id;

    const [
      readings,
      medications,
      medicationLogs,
      labResults,
      habits,
      sodiumLogs,
      sleepLogs,
      gamification,
      profiles,
      reminders,
      fhirPatients,
      fhirObservations,
      fhirMedicationRequests,
      fhirMedicationStatements,
      ascvdProfiles,
      clinicalNotes,
      tombstones,
      userSettingsDoc
    ] = await Promise.all([
      activeDb.collection('observations').find({ userId }).toArray(),
      activeDb.collection('medications').find({ userId }).toArray(),
      activeDb.collection('medication_logs').find({ userId }).toArray(),
      activeDb.collection('lab_results').find({ userId }).toArray(),
      activeDb.collection('habits').find({ userId }).toArray(),
      activeDb.collection('sodium_logs').find({ userId }).toArray(),
      activeDb.collection('sleep_logs').find({ userId }).toArray(),
      activeDb.collection('gamification').find({ userId }).toArray(),
      activeDb.collection('profiles').find({ userId }).toArray(),
      activeDb.collection('reminders').find({ userId }).toArray(),
      activeDb.collection('fhir_patients').find({ userId }).toArray(),
      activeDb.collection('fhir_observations').find({ userId }).toArray(),
      activeDb.collection('fhir_medication_requests').find({ userId }).toArray(),
      activeDb.collection('fhir_medication_statements').find({ userId }).toArray(),
      activeDb.collection('ascvd_profiles').find({ userId }).toArray(),
      activeDb.collection('clinical_notes').find({ userId }).toArray(),
      activeDb.collection('conditions').find({ userId }).toArray(),
      activeDb.collection('family_history').find({ userId }).toArray(),
      activeDb.collection('immunizations').find({ userId }).toArray(),
      activeDb.collection('tombstones').find({ userId }, { projection: { _id: 0, userId: 0 } }).toArray(),
      activeDb.collection('user_settings').findOne({ userId })
    ]);

    const totalCount =
      readings.length +
      medications.length +
      medicationLogs.length +
      labResults.length +
      habits.length +
      sodiumLogs.length +
      sleepLogs.length +
      gamification.length +
      profiles.length +
      reminders.length +
      fhirPatients.length +
      fhirObservations.length +
      fhirMedicationRequests.length +
      fhirMedicationStatements.length +
      ascvdProfiles.length +
      clinicalNotes.length +
      conditions.length +
      familyHistory.length +
      immunizations.length +
      (userSettingsDoc ? 1 : 0);

    return res.json({
      success: true,
      data: {
        readings,
        medications,
        medicationLogs,
        labResults,
        habits,
        sodiumLogs,
        sleepLogs,
        gamification,
        profiles,
        reminders,
        fhirPatients,
        fhirObservations,
        fhirMedicationRequests,
        fhirMedicationStatements,
        ascvdProfiles,
        clinicalNotes,
        conditions,
        familyHistory,
        immunizations,
        tombstones,
        userSettings: userSettingsDoc || null
      },
      syncedCount: totalCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AortaLink Sync] Pull Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal mengunduh data sync.' });
  }
});

/**
 * DELETE /api/profiles/:profileId
 * Delete profile and all its associated EHR observations, medications, and labs from MongoDB Atlas
 */
app.delete('/api/profiles/:profileId', authenticateToken, async (req, res) => {
  try {
    const activeDb = await getDatabase();
    if (!activeDb) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const userId = req.user.id;
    const profileId = req.params.profileId;

    if (!profileId) {
      return res.status(400).json({ success: false, message: 'Profile ID harus disertakan.' });
    }

    // Delete profile and cascade related records
    await Promise.all([
      activeDb.collection('profiles').deleteOne({ id: profileId, userId }),
      activeDb.collection('observations').deleteMany({ profileId, userId }),
      activeDb.collection('medications').deleteMany({ profileId, userId }),
      activeDb.collection('medication_logs').deleteMany({ profileId, userId }),
      activeDb.collection('lab_results').deleteMany({ profileId, userId }),
      activeDb.collection('habits').deleteMany({ profileId, userId }),
      activeDb.collection('sodium_logs').deleteMany({ profileId, userId }),
      activeDb.collection('sleep_logs').deleteMany({ profileId, userId }),
      activeDb.collection('reminders').deleteMany({ profileId, userId }),
      activeDb.collection('fhir_patients').deleteOne({ id: profileId, userId }),
      activeDb.collection('fhir_observations').deleteMany({ profileId, userId }),
      activeDb.collection('fhir_medication_requests').deleteMany({ profileId, userId }),
      activeDb.collection('fhir_medication_statements').deleteMany({ profileId, userId }),
      activeDb.collection('ascvd_profiles').deleteMany({ profileId, userId }),
      activeDb.collection('clinical_notes').deleteMany({ profileId, userId }),
      activeDb.collection('conditions').deleteMany({ profileId, userId }),
      activeDb.collection('family_history').deleteMany({ profileId, userId }),
      activeDb.collection('immunizations').deleteMany({ profileId, userId })
    ]);

    return res.json({
      success: true,
      message: `Profil ${profileId} dan seluruh data rekam medisnya berhasil dihapus permanen dari cloud.`
    });
  } catch (error) {
    console.error('[AortaLink Delete Profile] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal menghapus profil dari cloud.' });
  }
});

// Static SPA serving (Docker / self-host mode) — the API and the frontend
// ship together, so a single container is a complete deployment.
if (!process.env.VERCEL) {
  const distDir = path.resolve(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Start Server (Standalone local mode)
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AortaLink Open-Source API] Backend server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
