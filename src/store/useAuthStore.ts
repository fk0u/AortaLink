import { create } from 'zustand';
import { realAuthService } from '../services/auth/real-auth-service';
import { mongoDbAtlasService } from '../services/db/mongodb-service';

export type SubscriptionTier = 'free_trial' | 'pro_ehr' | 'clinic_tenant';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  authProvider: 'google' | 'email';
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
  loginWithGoogle: (googleProfile?: { name?: string; email?: string; picture?: string }) => Promise<UserSession>;
  logout: () => void;
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
        
        // Verify token with backend
        if (parsed.token) {
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

  syncCloudData: async () => {
    try {
      // 1. Pull data from cloud (MongoDB Atlas) to local Dexie.js
      await mongoDbAtlasService.pullAndRestoreUserData();
      // 2. Push any local records to MongoDB Atlas
      await mongoDbAtlasService.pushUserData();
    } catch (err) {
      console.warn('[useAuthStore] Cloud sync warning:', err);
    }
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const session = await realAuthService.loginUser(email, password);
      localStorage.setItem('aortalink_saas_user_session', JSON.stringify(session));
      set({ isAuthenticated: true, user: session, isLoading: false });
      
      // Auto restore cloud data for multi-device experience
      get().syncCloudData();
      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  registerWithEmail: async (name, email, password, tier = 'pro_ehr') => {
    set({ isLoading: true });
    try {
      const session = await realAuthService.registerUser(name, email, password, tier);
      localStorage.setItem('aortalink_saas_user_session', JSON.stringify(session));
      set({ isAuthenticated: true, user: session, isLoading: false });
      
      // Push initial local data to cloud
      get().syncCloudData();
      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async (googleProfile) => {
    set({ isLoading: true });
    try {
      const session = await realAuthService.loginWithGoogleOAuth(googleProfile);
      localStorage.setItem('aortalink_saas_user_session', JSON.stringify(session));
      set({ isAuthenticated: true, user: session, isLoading: false });
      
      get().syncCloudData();
      return session;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('aortalink_saas_user_session');
    set({ isAuthenticated: false, user: null });
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
