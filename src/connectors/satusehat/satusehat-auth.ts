import type { SatusehatConfig } from './satusehat-config.ts';

export interface SatusehatTokenResponse {
  access_token: string;
  expires_in: string; // usually string in satusehat
  token_type: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Retrieves a SATUSEHAT access token using the client credentials flow.
 * NOTE: This flow is designed for server-to-server communication.
 * In production, this should go through a backend proxy rather than directly from the client.
 */
export async function getSatusehatAccessToken(config: SatusehatConfig, forceRefresh = false): Promise<SatusehatTokenResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now) {
    return {
      access_token: cachedToken.token,
      expires_in: Math.floor((cachedToken.expiresAt - now) / 1000).toString(),
      token_type: 'Bearer',
    };
  }

  const url = `${config.authUrl}/accesstoken?grant_type=client_credentials`;
  const headers = new Headers();
  headers.append('Content-Type', 'application/x-www-form-urlencoded');

  const body = new URLSearchParams();
  body.append('client_id', config.clientId);
  body.append('client_secret', config.clientSecret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gagal mendapatkan akses token: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as SatusehatTokenResponse;
    const expiresIn = parseInt(data.expires_in, 10);
    
    // Buffer of 60 seconds to avoid expiration during flight
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (expiresIn - 60) * 1000,
    };

    return data;
  } catch (error) {
    console.error('Error fetching SATUSEHAT token:', error);
    throw error;
  }
}
