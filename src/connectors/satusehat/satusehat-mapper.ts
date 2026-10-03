import { SATUSEHAT_PROFILES, SATUSEHAT_IDENTIFIER_SYSTEMS } from './satusehat-profiles.ts';
import type { FhirResource } from './satusehat-client.ts';

export interface LocalPatient {
  id: string;
  name: string;
  nik?: string;
  ihsNumber?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
}

export interface LocalObservation {
  id: string;
  patientId: string;
  code: string;
  value: number;
  unit: string;
  date: string;
  encounterId?: string;
}

export function mapPatientToSatusehat(localPatient: LocalPatient, organizationId: string): FhirResource {
  const identifiers = [];
  
  if (localPatient.nik) {
    identifiers.push({
      use: 'official',
      system: SATUSEHAT_IDENTIFIER_SYSTEMS.NIK,
      value: localPatient.nik
    });
  }
  
  if (localPatient.ihsNumber) {
    identifiers.push({
      use: 'official',
      system: SATUSEHAT_IDENTIFIER_SYSTEMS.IHS_NUMBER,
      value: localPatient.ihsNumber
    });
  }

  return {
    resourceType: 'Patient',
    meta: {
      profile: [SATUSEHAT_PROFILES.Patient]
    },
    identifier: identifiers.length > 0 ? identifiers : undefined,
    active: true,
    name: [
      {
        use: 'official',
        text: localPatient.name
      }
    ],
    gender: localPatient.gender,
    birthDate: localPatient.birthDate,
    managingOrganization: {
      reference: `Organization/${organizationId}`
    }
  };
}

export function mapObservationToSatusehat(localObs: LocalObservation, organizationId: string): FhirResource {
  const observation: FhirResource = {
    resourceType: 'Observation',
    meta: {
      profile: [SATUSEHAT_PROFILES.Observation]
    },
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: localObs.code
        }
      ]
    },
    subject: {
      reference: `Patient/${localObs.patientId}`
    },
    effectiveDateTime: localObs.date,
    valueQuantity: {
      value: localObs.value,
      unit: localObs.unit,
      system: 'http://unitsofmeasure.org',
      code: localObs.unit
    }
  };

  if (localObs.encounterId) {
    observation.encounter = {
      reference: `Encounter/${localObs.encounterId}`
    };
  }

  return observation;
}

export function mapFromSatusehat(resource: FhirResource): any {
  if (resource.resourceType === 'Patient') {
    const nik = resource.identifier?.find((i: any) => i.system === SATUSEHAT_IDENTIFIER_SYSTEMS.NIK)?.value;
    const ihsNumber = resource.identifier?.find((i: any) => i.system === SATUSEHAT_IDENTIFIER_SYSTEMS.IHS_NUMBER)?.value;
    return {
      id: resource.id,
      name: resource.name?.[0]?.text,
      nik,
      ihsNumber,
      gender: resource.gender,
      birthDate: resource.birthDate
    };
  }
  return resource;
}
