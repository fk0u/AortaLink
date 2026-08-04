import { create } from 'zustand';

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
  
  // Actions
  loginWithEmail: (email: string, name?: string) => void;
  loginWithGoogle: () => void;
  logout: () => void;
  updateSubscriptionTier: (tier: SubscriptionTier) => void;
  initSessionFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,

  initSessionFromStorage: () => {
    try {
      const saved = localStorage.getItem('aortalink_saas_user_session');
      if (saved) {
        const parsed = JSON.parse(saved) as UserSession;
        set({ isAuthenticated: true, user: parsed });
      }
    } catch {
      localStorage.removeItem('aortalink_saas_user_session');
    }
  },

  loginWithEmail: (email, name) => {
    const userObj: UserSession = {
      id: 'usr-' + Date.now(),
      name: name || email.split('@')[0] || 'Pengguna AortaLink',
      email,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      authProvider: 'email',
      subscriptionTier: 'pro_ehr',
      token: 'jwt-aortalink-email-' + Math.random().toString(36).substring(2, 9),
      loginAt: new Date().toISOString()
    };
    localStorage.setItem('aortalink_saas_user_session', JSON.stringify(userObj));
    set({ isAuthenticated: true, user: userObj });
  },

  loginWithGoogle: () => {
    const userObj: UserSession = {
      id: 'usr-google-' + Date.now(),
      name: 'Google Health User',
      email: 'user.google@health.org',
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      authProvider: 'google',
      subscriptionTier: 'pro_ehr',
      token: 'jwt-aortalink-oauth-google-' + Math.random().toString(36).substring(2, 9),
      loginAt: new Date().toISOString()
    };
    localStorage.setItem('aortalink_saas_user_session', JSON.stringify(userObj));
    set({ isAuthenticated: true, user: userObj });
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
