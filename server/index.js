import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
  process.env.VITE_MONGODB_URI ||
  'mongodb+srv://kousozo:Koureal323@cluster0.2pnjht.mongodb.net/?appName=Cluster0';
const DB_NAME = process.env.PUBLIC_MONGODB_ATLAS_DB || 'aortalink_ehr_db';
const JWT_SECRET = process.env.JWT_SECRET || 'aortalink_secret_jwt_key_2026_safe';

const app = express();

// Explicit CORS middleware for Vercel & Multi-device deployment
app.use(cors({ origin: '*', credentials: true }));
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

// Middleware to ensure DB connection is ready before handling any /api request
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  try {
    await connectToMongo();
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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AortaLink Open-Source EHR Backend API',
    databaseConnected: !!db,
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

    if (!db) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersCollection = db.collection('users');

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

    if (!db) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersCollection = db.collection('users');

    const userDoc = await usersCollection.findOne({ email: cleanEmail });
    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'Akun dengan email ini belum terdaftar. Silakan daftar dulu.' });
    }

    let isMatch = false;
    if (userDoc.passwordHash) {
      isMatch = await bcrypt.compare(password, userDoc.passwordHash);
      if (!isMatch) {
        const crypto = await import('crypto');
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        isMatch = userDoc.passwordHash === sha256 || userDoc.passwordHash === password;
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
 * POST /api/auth/google
 */
app.post('/api/auth/google', async (req, res) => {
  try {
    const { googleProfile } = req.body;
    const email = (googleProfile?.email || 'user.google@aortalink.health').trim().toLowerCase();
    const name = googleProfile?.name || 'Google Health User';
    const avatarUrl = googleProfile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    if (!db) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const usersCollection = db.collection('users');
    let userDoc = await usersCollection.findOne({ email });

    if (!userDoc) {
      const userId = 'usr-google-' + Date.now();
      userDoc = {
        userId,
        name,
        email,
        authProvider: 'google',
        subscriptionTier: 'pro_ehr',
        avatarUrl,
        createdAt: new Date().toISOString()
      };
      await usersCollection.insertOne(userDoc);
    }

    const userSession = {
      id: userDoc.userId || userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      avatarUrl: userDoc.avatarUrl,
      authProvider: 'google',
      subscriptionTier: userDoc.subscriptionTier || 'pro_ehr',
      loginAt: new Date().toISOString()
    };

    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '60d' });

    return res.json({
      success: true,
      message: 'Autentikasi Google OAuth Berhasil!',
      token,
      user: { ...userSession, token }
    });
  } catch (error) {
    console.error('[AortaLink Auth] Google OAuth Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal memproses Google OAuth.' });
  }
});

/**
 * GET /api/auth/me
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.json({ success: true, user: req.user });
    }
    const usersCollection = db.collection('users');
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
    if (!db) {
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
      userSettings = null
    } = req.body;

    let totalSynced = 0;

    const upsertCollection = async (collName, items, keyField = 'id') => {
      if (!Array.isArray(items) || items.length === 0) return 0;
      const collection = db.collection(collName);
      for (const item of items) {
        const query = { [keyField]: item[keyField], userId };
        await collection.updateOne(
          query,
          { $set: { ...item, userId, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
      return items.length;
    };

    totalSynced += await upsertCollection('observations', readings);
    totalSynced += await upsertCollection('medications', medications);
    totalSynced += await upsertCollection('medication_logs', medicationLogs);
    totalSynced += await upsertCollection('lab_results', labResults);
    totalSynced += await upsertCollection('habits', habits);
    totalSynced += await upsertCollection('sodium_logs', sodiumLogs);
    totalSynced += await upsertCollection('sleep_logs', sleepLogs);
    totalSynced += await upsertCollection('gamification', gamification);
    totalSynced += await upsertCollection('profiles', profiles);
    totalSynced += await upsertCollection('reminders', reminders);
    totalSynced += await upsertCollection('fhir_patients', fhirPatients);
    totalSynced += await upsertCollection('fhir_observations', fhirObservations);
    totalSynced += await upsertCollection('fhir_medication_requests', fhirMedicationRequests);
    totalSynced += await upsertCollection('fhir_medication_statements', fhirMedicationStatements);

    // Save User Settings (Theme, Active Profile, Layout)
    if (userSettings) {
      await db.collection('user_settings').updateOne(
        { userId },
        { $set: { ...userSettings, userId, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      totalSynced += 1;
    }

    return res.json({
      success: true,
      totalSynced,
      message: `Berhasil menyinkronkan ${totalSynced} item rekam medis ke MongoDB Atlas Cloud.`,
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
    if (!db) {
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
      userSettingsDoc
    ] = await Promise.all([
      db.collection('observations').find({ userId }).toArray(),
      db.collection('medications').find({ userId }).toArray(),
      db.collection('medication_logs').find({ userId }).toArray(),
      db.collection('lab_results').find({ userId }).toArray(),
      db.collection('habits').find({ userId }).toArray(),
      db.collection('sodium_logs').find({ userId }).toArray(),
      db.collection('sleep_logs').find({ userId }).toArray(),
      db.collection('gamification').find({ userId }).toArray(),
      db.collection('profiles').find({ userId }).toArray(),
      db.collection('reminders').find({ userId }).toArray(),
      db.collection('fhir_patients').find({ userId }).toArray(),
      db.collection('fhir_observations').find({ userId }).toArray(),
      db.collection('fhir_medication_requests').find({ userId }).toArray(),
      db.collection('fhir_medication_statements').find({ userId }).toArray(),
      db.collection('user_settings').findOne({ userId })
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
 * POST /api/fhir/sync
 * Sync FHIR Bundle / Resource to MongoDB Atlas fhir_resources collection
 */
app.post('/api/fhir/sync', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database MongoDB Atlas belum terhubung.' });
    }

    const { resource, bundle, timestamp = new Date().toISOString() } = req.body;
    const userId = req.user.id;

    const collection = db.collection('fhir_resources');
    const doc = {
      userId,
      resourceType: resource?.resourceType || bundle?.resourceType || 'Bundle',
      payload: resource || bundle,
      syncedAt: timestamp
    };

    await collection.insertOne(doc);

    return res.json({
      success: true,
      message: 'FHIR Bundle R4 berhasil disimpan di MongoDB Atlas Cloud.',
      syncedAt: timestamp
    });
  } catch (error) {
    console.error('[AortaLink FHIR] Sync Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Gagal menyimpan FHIR bundle.' });
  }
});

// Start Server (Standalone local mode)
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AortaLink Open-Source API] Backend server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
