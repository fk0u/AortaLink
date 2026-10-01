import { create } from 'zustand';
import { realAuthService } from '../services/auth/real-auth-service';
import { mongoDbAtlasService } from '../services/db/mongodb-service';
import { clearLocalEhrDatabase, db, seedInitialData } from '../db';
import {
  GUEST_DATA_OWNER,
  countUnsyncedChanges,
  getLocalDataOwner,
  hasUserEnteredData,
  mergeLocalSnapshot,
  restoreLocalSnapshot,
  setLocalDataOwner,
  snapshotLocalData
} from '../db/local-data';
import { useAppStore } from './useAppStore';

export type SubscriptionTier = 'free' | 'free_trial' | 'pro_ehr' | 'clinic_tenant';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  authProvider: 'email' | 'guest';
  subscriptionTier: SubscriptionTier;
  token: string;
  loginAt: string;
}

export interface AuthOptions {
  /** Move Mode Lokal (guest) data on this device into the account instead of discarding it. */
  migrateLocalData?: boolean;
}

export type LogoutResult =
  | { loggedOut: true }
  | { loggedOut: false; unsyncedCount: number; message: string };

const SESSION_KEY = 'aortalink_saas_user_session';

/**
 * Called only AFTER the server accepted the credentials, so a typo, a down
 * server or an unknown email can never cost the user their local data.
 *
 * - Local data already belongs to this account → keep it; sync merges it.
 * - Local data is Mode Lokal and the user opted in → migrate it into the account.
 * - Anything else (another account, unknown owner, opted out) → wipe, so one
 *   account's records never show up under another.
 */
async function adoptLocalDataForSession(
  session: UserSession,
  mode: 'login' | 'register',
  migrateLocalData: boolean
): Promise<void> {
  const owner = getLocalDataOwner();

  if (owner === session.id) {
    await mongoDbAtlasService.pullAndRestoreUserData();
    await mongoDbAtlasService.pushUserData();
    return;
  }

  const migrate = migrateLocalData && owner === GUEST_DATA_OWNER && (await hasUserEnteredData());

  if (migrate && mode === 'register') {
    // Brand-new account: nothing in the cloud to collide with.
    await seedInitialData(session.name);
    await mongoDbAtlasService.pushUserData();
    return;
  }

  if (migrate) {
    const guestSnapshot = await snapshotLocalData();
    await clearLocalEhrDatabase();
    const pull = await mongoDbAtlasService.pullAndRestoreUserData();
    if (!pull.success) {
      // Merging blind could overwrite account records that share an id. Put
      // the guest data back untouched and fail the login instead.
      await restoreLocalSnapshot(guestSnapshot);
      throw new Error(
        `Data akun belum bisa diunduh (${pull.message}). Data Mode Lokal Anda tidak diubah, silakan coba lagi.`
      );
    }
    if (pull.restoredCount === 0) await seedInitialData(session.name);
    await mergeLocalSnapshot(guestSnapshot);
    await mongoDbAtlasService.pushUserData();
    return;
  }

  await clearLocalEhrDatabase();
  if (mode === 'register') {
    await seedInitialData(session.name);
    await mongoDbAtlasService.pushUserData();
    return;
  }
  const pull = await mongoDbAtlasService.pullAndRestoreUserData();
  if (pull.restoredCount === 0) await seedInitialData(session.name);
}

/** Points the UI at an existing profile after the local data set changed. */
async function ensureActiveProfileExists(): Promise<void> {
  const app = useAppStore.getState();
  if (app.activeProfileId && (await db.profiles.get(app.activeProfileId))) return;
  const fallback = (await db.profiles.toArray()).find((p) => p.isDefault) ?? (await db.profiles.toCollection().first());
  if (fallback) app.setActiveProfileId(fallback.id);
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserSession | null;
  isLoading: boolean;
  
  // Actions
  loginWithEmail: (email: string, password: string, options?: AuthOptions) => Promise<UserSession>;
  registerWithEmail: (name: string, email: string, password: string, tier?: SubscriptionTier, options?: AuthOptions) => Promise<UserSession>;
  continueAsGuest: () => Promise<void>;
  /** Pushes pending changes first; returns `loggedOut: false` if that fails, unless `force`. */
  logout: (options?: { force?: boolean }) => Promise<LogoutResult>;
  updateSubscriptionTier: (tier: SubscriptionTier) => void;
  initSessionFromStorage: () => Promise<void>;
  syncCloudData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,

  initSessionFromStorage: async () => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserSession;
        set({ isAuthenticated: true, user: parsed });
        // Backfill the owner marker for sessions created before it existed.
        if (!getLocalDataOwner()) {
          setLocalDataOwner(parsed.authProvider === 'guest' ? GUEST_DATA_OWNER : parsed.id);
        }
        
        // Verify token with backend if not guest
        if (parsed.token && parsed.authProvider !== 'guest') {
          const verified = await realAuthService.verifySessionToken(parsed.token);
          if (verified) {
            set({ user: verified });
            localStorage.setItem(SESSION_KEY, JSON.stringify(verified));
          }
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  continueAsGuest: async () => {
    // Never show a cloud account's leftover records to a guest.
    const owner = getLocalDataOwner();
    if (owner && owner !== GUEST_DATA_OWNER) {
      await clearLocalEhrDatabase();
      await seedInitialData();
    }
    setLocalDataOwner(GUEST_DATA_OWNER);

    const guestUser: UserSession = {
      id: 'usr-guest-' + Date.now(),
      name: 'Tamu Lokal',
      email: 'tamu@aortalink.local',
      authProvider: 'guest',
      subscriptionTier: 'free',
      token: 'jwt-aortalink-guest',
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(guestUser));
    set({ isAuthenticated: true, user: guestUser });
  },

  syncCloudData: async () => {
    if (get().user?.authProvider === 'guest') return;
    // Errors intentionally propagate so the sync badge can show real failures.
    // 1. Pull data from cloud (MongoDB Atlas) to local Dexie.js
    await mongoDbAtlasService.pullAndRestoreUserData();
    // 2. Push any local records to MongoDB Atlas
    await mongoDbAtlasService.pushUserData();
  },

  loginWithEmail: async (email, password, options = {}) => {
    set({ isLoading: true });
    try {
      // 1. Authenticate FIRST — a failed login must never touch local data.
      const session = await realAuthService.loginUser(email, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      // 2. Keep, migrate, or wipe local data depending on whose it is.
      try {
        await adoptLocalDataForSession(session, 'login', options.migrateLocalData ?? false);
      } catch (err) {
        localStorage.removeItem(SESSION_KEY);
        throw err;
      }
      setLocalDataOwner(session.id);
      await ensureActiveProfileExists();

      set({ isAuthenticated: true, user: session, isLoading: false });
      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  registerWithEmail: async (name, email, password, tier = 'pro_ehr', options = {}) => {
    set({ isLoading: true });
    try {
      // 1. Create the account FIRST — a failed registration must never touch local data.
      const session = await realAuthService.registerUser(name, email, password, tier);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      // 2. Carry Mode Lokal data into the new account, or start clean.
      await adoptLocalDataForSession(session, 'register', options.migrateLocalData ?? false);
      setLocalDataOwner(session.id);
      await ensureActiveProfileExists();

      set({ isAuthenticated: true, user: session, isLoading: false });
      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async ({ force = false } = {}) => {
    const user = get().user;

    if (user && user.authProvider !== 'guest') {
      // The cloud is the only other copy: push before wiping this device.
      if (!force) {
        const push = await mongoDbAtlasService.pushUserData();
        if (!push.success) {
          const unsyncedCount = await countUnsyncedChanges(mongoDbAtlasService.getLastSyncTime());
          if (unsyncedCount > 0) {
            return { loggedOut: false, unsyncedCount, message: push.message };
          }
        }
      }
      localStorage.removeItem(SESSION_KEY);
      set({ isAuthenticated: false, user: null });
      // Clear local database on logout to prevent cross-account leakage
      await clearLocalEhrDatabase();
      await seedInitialData();
      setLocalDataOwner(null);
      return { loggedOut: true };
    }

    // Mode Lokal data exists nowhere else; keep it on the device. It can be
    // resumed as guest or moved into an account on the next login.
    localStorage.removeItem(SESSION_KEY);
    set({ isAuthenticated: false, user: null });
    return { loggedOut: true };
  },

  updateSubscriptionTier: (tier) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, subscriptionTier: tier };
      localStorage.setItem('aortalink_saas_user_session', JSON.stringify(updated));
      return { user: updated };
    });
  }
}));
