import { create } from 'zustand';
import { realAuthService } from '../services/auth/real-auth-service';
import { tokenManager } from '../services/auth/token-manager';
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
  healthDataConsent?: boolean;
}

export interface AuthOptions {
  /** Move Mode Lokal (guest) data on this device into the account instead of discarding it. */
  migrateLocalData?: boolean;
  healthDataConsent?: boolean;
}

export type LogoutResult =
  | { loggedOut: true }
  | { loggedOut: false; unsyncedCount: number; message: string };

const SESSION_KEY = 'aortalink_saas_user_session';
let refreshInterval: ReturnType<typeof setInterval> | null = null;

async function adoptLocalDataForSession(
  session: UserSession,
  mode: 'login' | 'register',
  migrateLocalData: boolean
): Promise<void> {
  const owner = getLocalDataOwner();

  if (owner === session.id) {
    const pull = await mongoDbAtlasService.pullAndRestoreUserData();
    if (!pull.success) {
      throw new Error(`Data akun belum bisa diunduh (${pull.message}).`);
    }
    const push = await mongoDbAtlasService.pushUserData();
    if (!push.success) {
      throw new Error(`Data akun belum bisa diunggah (${push.message}).`);
    }
    return;
  }

  const migrate = migrateLocalData && owner === GUEST_DATA_OWNER && (await hasUserEnteredData());

  if (migrate && mode === 'register') {
    await seedInitialData(session.name);
    await mongoDbAtlasService.pushUserData();
    return;
  }

  if (migrate) {
    const guestSnapshot = await snapshotLocalData();
    await clearLocalEhrDatabase();
    const pull = await mongoDbAtlasService.pullAndRestoreUserData();
    if (!pull.success) {
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
  if (!pull.success) {
    throw new Error(`Data akun belum bisa diunduh (${pull.message}).`);
  }
  if (pull.restoredCount === 0) await seedInitialData(session.name);
}

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
  logout: (options?: { force?: boolean }) => Promise<LogoutResult>;
  updateSubscriptionTier: (tier: SubscriptionTier) => void;
  initSessionFromStorage: () => Promise<void>;
  syncCloudData: () => Promise<void>;
  handleSessionExpired: () => void;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,

  refreshSession: async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      get().handleSessionExpired();
      return;
    }
    
    try {
      const { user, tokens } = await realAuthService.refreshAccessToken(refreshToken);
      tokenManager.storeTokens(tokens);
      set({ user });
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      get().handleSessionExpired();
    }
  },

  initSessionFromStorage: async () => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserSession;
        set({ isAuthenticated: true, user: parsed });
        
        if (!getLocalDataOwner()) {
          setLocalDataOwner(parsed.authProvider === 'guest' ? GUEST_DATA_OWNER : parsed.id);
        }
        
        if (parsed.authProvider !== 'guest') {
          // Check token expiry
          const refreshToken = tokenManager.getRefreshToken();
          const accessToken = tokenManager.getAccessToken();
          
          if (!accessToken && refreshToken) {
            // Need to refresh
            await get().refreshSession();
          } else if (accessToken) {
            const verified = await realAuthService.verifySessionToken(accessToken);
            if (verified) {
              set({ user: verified });
              localStorage.setItem(SESSION_KEY, JSON.stringify(verified));
            } else {
              // Might be expired on server, try refresh
              await get().refreshSession();
            }
          } else {
            get().handleSessionExpired();
            return;
          }
          
          // Setup periodic refresh (every 5 mins check)
          if (refreshInterval) clearInterval(refreshInterval);
          refreshInterval = setInterval(() => {
            const tk = tokenManager.getAccessToken();
            if (!tk && tokenManager.getRefreshToken()) {
              get().refreshSession();
            }
          }, 5 * 60 * 1000);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      tokenManager.clearTokens();
    }
  },

  continueAsGuest: async () => {
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
    tokenManager.clearTokens();
    set({ isAuthenticated: true, user: guestUser });
  },

  handleSessionExpired: () => {
    localStorage.removeItem(SESSION_KEY);
    tokenManager.clearTokens();
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    set({ isAuthenticated: false, user: null });
    useAppStore.getState().addToast({
      type: 'warning',
      title: 'Sesi Berakhir',
      message: 'Sesi login telah kadaluwarsa. Silakan masuk kembali untuk melanjutkan sinkronisasi cloud.'
    });
  },

  syncCloudData: async () => {
    if (get().user?.authProvider === 'guest') return;
    const pull = await mongoDbAtlasService.pullAndRestoreUserData();
    if (!pull.success) {
      if (pull.isAuthError || pull.statusCode === 401 || pull.statusCode === 403) {
        get().handleSessionExpired();
      }
      throw new Error(pull.message || 'Gagal mengunduh data dari cloud.');
    }

    const push = await mongoDbAtlasService.pushUserData();
    if (!push.success) {
      if (push.isAuthError || push.statusCode === 401 || push.statusCode === 403) {
        get().handleSessionExpired();
      }
      throw new Error(push.message || 'Gagal mengunggah data ke cloud.');
    }
  },

  loginWithEmail: async (email, password, options = {}) => {
    set({ isLoading: true });
    try {
      const { user: session, tokens } = await realAuthService.loginUser(email, password);
      
      if (options.healthDataConsent) {
        session.healthDataConsent = true;
      }
      
      tokenManager.storeTokens(tokens);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      try {
        await adoptLocalDataForSession(session, 'login', options.migrateLocalData ?? false);
      } catch (err) {
        localStorage.removeItem(SESSION_KEY);
        tokenManager.clearTokens();
        throw err;
      }
      setLocalDataOwner(session.id);
      await ensureActiveProfileExists();

      // Setup periodic refresh
      if (refreshInterval) clearInterval(refreshInterval);
      refreshInterval = setInterval(() => {
        if (!tokenManager.getAccessToken() && tokenManager.getRefreshToken()) {
          get().refreshSession();
        }
      }, 5 * 60 * 1000);

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
      const { user: session, tokens } = await realAuthService.registerUser(name, email, password, tier);
      
      if (options.healthDataConsent) {
        session.healthDataConsent = true;
      }
      
      tokenManager.storeTokens(tokens);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      await adoptLocalDataForSession(session, 'register', options.migrateLocalData ?? false);
      setLocalDataOwner(session.id);
      await ensureActiveProfileExists();
      
      // Setup periodic refresh
      if (refreshInterval) clearInterval(refreshInterval);
      refreshInterval = setInterval(() => {
        if (!tokenManager.getAccessToken() && tokenManager.getRefreshToken()) {
          get().refreshSession();
        }
      }, 5 * 60 * 1000);

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
      if (!force) {
        const push = await mongoDbAtlasService.pushUserData();
        if (!push.success) {
          const unsyncedCount = await countUnsyncedChanges(mongoDbAtlasService.getLastSyncTime());
          if (unsyncedCount > 0) {
            return { loggedOut: false, unsyncedCount, message: push.message };
          }
        }
      }
      
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await realAuthService.revokeRefreshToken(refreshToken);
      }
      
      localStorage.removeItem(SESSION_KEY);
      tokenManager.clearTokens();
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      set({ isAuthenticated: false, user: null });
      await clearLocalEhrDatabase();
      await seedInitialData();
      setLocalDataOwner(null);
      return { loggedOut: true };
    }

    localStorage.removeItem(SESSION_KEY);
    tokenManager.clearTokens();
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    set({ isAuthenticated: false, user: null });
    return { loggedOut: true };
  },

  updateSubscriptionTier: (tier) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, subscriptionTier: tier };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return { user: updated };
    });
  }
}));
