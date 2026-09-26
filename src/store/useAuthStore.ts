import { create } from 'zustand';
import { realAuthService } from '../services/auth/real-auth-service';
import { mongoDbAtlasService } from '../services/db/mongodb-service';
import { clearLocalEhrDatabase, seedInitialData } from '../db';
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

interface AuthState {
  isAuthenticated: boolean;
  user: UserSession | null;
  isLoading: boolean;
  
  // Actions
  loginWithEmail: (email: string, password: string) => Promise<UserSession>;
  registerWithEmail: (name: string, email: string, password: string, tier?: SubscriptionTier) => Promise<UserSession>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
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
      const saved = localStorage.getItem('aortalink_saas_user_session');
      if (saved) {
        const parsed = JSON.parse(saved) as UserSession;
        set({ isAuthenticated: true, user: parsed });
        
        // Verify token with backend if not guest
        if (parsed.token && parsed.authProvider !== 'guest') {
          const verified = await realAuthService.verifySessionToken(parsed.token);
          if (verified) {
            set({ user: verified });
            localStorage.setItem('aortalink_saas_user_session', JSON.stringify(verified));
          }
        }
      }
    } catch {
      localStorage.removeItem('aortalink_saas_user_session');
    }
  },

  continueAsGuest: async () => {
    const guestUser: UserSession = {
      id: 'usr-guest-' + Date.now(),
      name: 'Tamu Lokal',
      email: 'tamu@aortalink.local',
      authProvider: 'guest',
      subscriptionTier: 'free',
      token: 'jwt-aortalink-guest',
      loginAt: new Date().toISOString()
    };
    localStorage.setItem('aortalink_saas_user_session', JSON.stringify(guestUser));
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

  loginWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      // 1. Clear any leftover local data before switching account
      await clearLocalEhrDatabase();

      // 2. Authenticate user
      const session = await realAuthService.loginUser(email, password);
      localStorage.setItem('aortalink_saas_user_session', JSON.stringify(session));
      set({ isAuthenticated: true, user: session, isLoading: false });
      
      // 3. Restore only this user's cloud data from MongoDB Atlas
      const pullResult = await mongoDbAtlasService.pullAndRestoreUserData();
      
      // 4. If new or empty account, ensure default profile exists with user name
      if (pullResult.restoredCount === 0) {
        await seedInitialData(session.name);
      }

      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  registerWithEmail: async (name, email, password, tier = 'pro_ehr') => {
    set({ isLoading: true });
    try {
      // 1. Completely clear local database so previous account/guest data does NOT stick to new account!
      await clearLocalEhrDatabase();

      // 2. Seed clean fresh profile with the registered user's real name
      await seedInitialData(name);
      useAppStore.getState().setActiveProfileId('profile-self-default');

      // 3. Register user on MongoDB Atlas
      const session = await realAuthService.registerUser(name, email, password, tier);
      localStorage.setItem('aortalink_saas_user_session', JSON.stringify(session));
      set({ isAuthenticated: true, user: session, isLoading: false });
      
      // 4. Push this clean initial user profile to MongoDB Atlas cloud
      await mongoDbAtlasService.pushUserData();
      
      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    localStorage.removeItem('aortalink_saas_user_session');
    set({ isAuthenticated: false, user: null });
    
    // Clear local database on logout to prevent cross-account leakage
    await clearLocalEhrDatabase();
    await seedInitialData();
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
