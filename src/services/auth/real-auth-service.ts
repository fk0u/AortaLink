import { UserSession, SubscriptionTier } from '../../store/useAuthStore';

/**
 * Real authentication against the Express + MongoDB Atlas backend.
 * There is deliberately NO offline fallback: without a reachable server no
 * account can be created or used, because a "session" that never touched the
 * server could never sync and would be indistinguishable from a real one.
 */
export class RealAuthService {
  private API_BASE_URL = '/api/auth';

  constructor() {
    // Purge any legacy local user cache — older versions stored the raw
    // password there. That data must never live in localStorage.
    localStorage.removeItem('aortalink_mongodb_users_cache');
  }

  private connectionError(): Error {
    return new Error(
      'Tidak dapat terhubung ke server AortaLink. Registrasi dan login membutuhkan koneksi internet. ' +
      'Anda masih bisa memakai Mode Lokal dari halaman masuk — datanya tetap nyata dan tersimpan di perangkat ini.'
    );
  }

  public async registerUser(
    name: string,
    email: string,
    passwordRaw: string,
    tier: SubscriptionTier = 'pro_ehr'
  ): Promise<UserSession> {
    const cleanEmail = email.trim().toLowerCase();

    let res: Response;
    try {
      res = await fetch(`${this.API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: cleanEmail, password: passwordRaw, tier })
      });
    } catch {
      throw this.connectionError();
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mendaftarkan akun di server.');
    }
    return data.user as UserSession;
  }

  public async loginUser(email: string, passwordRaw: string): Promise<UserSession> {
    const cleanEmail = email.trim().toLowerCase();

    let res: Response;
    try {
      res = await fetch(`${this.API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordRaw })
      });
    } catch {
      throw this.connectionError();
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal melakukan login.');
    }
    return data.user as UserSession;
  }

  public async verifySessionToken(token: string): Promise<UserSession | null> {
    try {
      const res = await fetch(`${this.API_BASE_URL}/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        return data.user as UserSession;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const realAuthService = new RealAuthService();
