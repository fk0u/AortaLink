export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

const TOKENS_KEY = 'aortalink_saas_tokens';

class TokenManager {
  public storeTokens(pair: TokenPair): void {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(pair));
  }

  private getTokens(): TokenPair | null {
    const saved = localStorage.getItem(TOKENS_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as TokenPair;
    } catch {
      return null;
    }
  }

  public getAccessToken(): string | null {
    const tokens = this.getTokens();
    if (!tokens) return null;
    if (this.isAccessTokenExpired(tokens)) {
      if (this.isRefreshTokenExpired(tokens)) {
        this.clearTokens();
      }
      return null;
    }
    return tokens.accessToken;
  }

  public getRefreshToken(): string | null {
    const tokens = this.getTokens();
    if (!tokens) return null;
    if (this.isRefreshTokenExpired(tokens)) {
      this.clearTokens();
      return null;
    }
    return tokens.refreshToken;
  }

  public isAccessTokenExpired(tokens?: TokenPair): boolean {
    const t = tokens || this.getTokens();
    if (!t) return true;
    return Date.now() >= t.accessExpiresAt;
  }

  public isRefreshTokenExpired(tokens?: TokenPair): boolean {
    const t = tokens || this.getTokens();
    if (!t) return true;
    return Date.now() >= t.refreshExpiresAt;
  }

  public clearTokens(): void {
    localStorage.removeItem(TOKENS_KEY);
  }

  public getTokenExpiry(): { accessExpiresIn: number; refreshExpiresIn: number } {
    const tokens = this.getTokens();
    if (!tokens) return { accessExpiresIn: 0, refreshExpiresIn: 0 };
    const now = Date.now();
    return {
      accessExpiresIn: Math.max(0, tokens.accessExpiresAt - now),
      refreshExpiresIn: Math.max(0, tokens.refreshExpiresAt - now),
    };
  }

  public createTokenPair(accessToken: string, refreshToken: string): TokenPair {
    return {
      accessToken,
      refreshToken,
      accessExpiresAt: Date.now() + 15 * 60 * 1000,
      refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }
}

export const tokenManager = new TokenManager();
