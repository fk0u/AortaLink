import type { SatusehatConfig } from './satusehat-config.ts';
import { getSatusehatAccessToken } from './satusehat-auth.ts';

// Define minimal types to avoid requiring full types imports if missing
export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: any;
}

export class SatusehatClient {
  private config: SatusehatConfig;

  constructor(config: SatusehatConfig) {
    this.config = config;
  }

  private async getHeaders(): Promise<Headers> {
    const tokenData = await getSatusehatAccessToken(this.config);
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${tokenData.access_token}`);
    headers.append('Content-Type', 'application/json');
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gagal menghubungi SATUSEHAT: ${response.status} ${response.statusText}`;
      if (response.status === 429) {
        errorMessage = 'Terlalu banyak permintaan. Silakan coba lagi nanti.';
      } else if (response.status === 401) {
        errorMessage = 'Sesi tidak valid atau kadaluarsa.';
      }
      throw new Error(`${errorMessage} - Detail: ${errorText}`);
    }
    return response.json() as Promise<T>;
  }

  async getPatient(ihsNumber: string): Promise<FhirResource> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseUrl}/Patient/${ihsNumber}`, { headers });
    return this.handleResponse<FhirResource>(response);
  }

  async searchByNIK(nik: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseUrl}/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`, { headers });
    return this.handleResponse<any>(response);
  }

  async createPatient(fhirPatient: FhirResource): Promise<FhirResource> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseUrl}/Patient`, {
      method: 'POST',
      headers,
      body: JSON.stringify(fhirPatient),
    });
    return this.handleResponse<FhirResource>(response);
  }

  async getObservations(patientId: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseUrl}/Observation?subject=${patientId}`, { headers });
    return this.handleResponse<any>(response);
  }

  async createObservation(fhirObs: FhirResource): Promise<FhirResource> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseUrl}/Observation`, {
      method: 'POST',
      headers,
      body: JSON.stringify(fhirObs),
    });
    return this.handleResponse<FhirResource>(response);
  }

  async createEncounter(encounter: FhirResource): Promise<FhirResource> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseUrl}/Encounter`, {
      method: 'POST',
      headers,
      body: JSON.stringify(encounter),
    });
    return this.handleResponse<FhirResource>(response);
  }
}
