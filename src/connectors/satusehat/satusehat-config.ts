export type SatusehatEnvironment = 'sandbox' | 'production';

export interface SatusehatConfig {
  environment: SatusehatEnvironment;
  authUrl: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  organizationId: string;
}

export const DEFAULT_SANDBOX_CONFIG: Omit<SatusehatConfig, 'clientId' | 'clientSecret' | 'organizationId'> = {
  environment: 'sandbox',
  authUrl: 'https://api-satusehat.dto.kemkes.go.id/oauth2/v1',
  baseUrl: 'https://api-satusehat.dto.kemkes.go.id/fhir-r4/v1',
};

export const DEFAULT_PROD_CONFIG: Omit<SatusehatConfig, 'clientId' | 'clientSecret' | 'organizationId'> = {
  environment: 'production',
  authUrl: 'https://api-satusehat.kemkes.go.id/oauth2/v1',
  baseUrl: 'https://api-satusehat.kemkes.go.id/fhir-r4/v1',
};
