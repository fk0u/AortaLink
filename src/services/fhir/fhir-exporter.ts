import { BPReading, Profile, LabResult, MedicationItem, FhirObservation, FhirPatient, FhirMedicationRequest } from '../../types/blood-pressure';

export interface FHIRBundleResource {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FhirObservation | FhirPatient | FhirMedicationRequest;
  }>;
}

/**
 * Convert a single BPReading to HL7 FHIR R4 Observation Resource format.
 * Follows LOINC `85354-9` & HL7 FHIR Implementation Guide for Vital Signs.
 */
export function convertReadingToFHIR(reading: BPReading, profile?: Profile): FhirObservation {
  const components = [
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8480-6',
            display: 'Systolic blood pressure'
          }
        ]
      },
      valueQuantity: {
        value: reading.systolic,
        unit: 'mmHg',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]'
      }
    },
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8462-4',
            display: 'Diastolic blood pressure'
          }
        ]
      },
      valueQuantity: {
        value: reading.diastolic,
        unit: 'mmHg',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]'
      }
    },
    {
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }
        ]
      },
      valueQuantity: {
        value: reading.pulse,
        unit: 'beats/min',
        system: 'http://unitsofmeasure.org',
        code: '/min'
      }
    }
  ];

  const fhirResource: FhirObservation = {
    resourceType: 'Observation',
    id: `aortalink-obs-bp-${reading.id || Date.now()}`,
    profileId: reading.profileId,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure panel with all children optional'
        }
      ],
      text: 'Blood Pressure Panel'
    },
    subject: {
      reference: `Patient/${reading.profileId}`,
      display: profile ? profile.name : 'Patient'
    },
    effectiveDateTime: reading.timestamp,
    component: components,
    extension: reading.measurement_context ? [
      {
        url: 'https://aortalink.health/fhir/StructureDefinition/measurement-context',
        valueString: reading.measurement_context
      }
    ] : []
  };

  if (reading.notes) {
    fhirResource.note = [{ text: reading.notes }];
  }

  return fhirResource;
}

/**
 * Convert a LabResult to HL7 FHIR R4 Observations for Ureum, Kreatinin, and Asam Urat.
 */
export function convertLabResultToFHIR(lab: LabResult, profile?: Profile): FhirObservation[] {
  const subjectRef = { reference: `Patient/${lab.profileId}`, display: profile?.name || 'Patient' };
  const obsList: FhirObservation[] = [];

  if (lab.uricAcid !== undefined) {
    obsList.push({
      resourceType: 'Observation',
      id: `aortalink-obs-uric-${lab.id || Date.now()}`,
      profileId: lab.profileId,
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '3084-1', display: 'Urate [Mass/volume] in Blood' }], text: 'Asam Urat' },
      subject: subjectRef,
      effectiveDateTime: lab.timestamp,
      valueQuantity: { value: lab.uricAcid, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' }
    });
  }

  if (lab.serumCreatinine !== undefined) {
    obsList.push({
      resourceType: 'Observation',
      id: `aortalink-obs-creat-${lab.id || Date.now()}`,
      profileId: lab.profileId,
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma' }], text: 'Kreatinin Serum' },
      subject: subjectRef,
      effectiveDateTime: lab.timestamp,
      valueQuantity: { value: lab.serumCreatinine, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' }
    });
  }

  if (lab.bloodUrea !== undefined) {
    obsList.push({
      resourceType: 'Observation',
      id: `aortalink-obs-urea-${lab.id || Date.now()}`,
      profileId: lab.profileId,
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '14927-8', display: 'Urea nitrogen [Mass/volume] in Blood' }], text: 'Ureum Darah' },
      subject: subjectRef,
      effectiveDateTime: lab.timestamp,
      valueQuantity: { value: lab.bloodUrea, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' }
    });
  }

  return obsList;
}

/**
 * Convert MedicationItem into HL7 FHIR R4 MedicationRequest Resource.
 */
export function convertMedicationToFHIR(med: MedicationItem, profile?: Profile): FhirMedicationRequest {
  return {
    resourceType: 'MedicationRequest',
    id: `aortalink-medreq-${med.id || Date.now()}`,
    profileId: med.profileId,
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: med.name.toLowerCase().includes('amlodipine') ? '17767' : 'custom',
          display: `${med.name} ${med.dosage}`
        }
      ],
      text: `${med.name} (${med.drugClass})`
    },
    subject: {
      reference: `Patient/${med.profileId}`,
    },
    dosageInstruction: [
      {
        text: `Schedule: ${med.schedule}. Purpose: ${med.purpose}`
      }
    ]
  };
}

/**
 * Export all profile records into HL7 FHIR R4 Bundle Collection JSON.
 */
export function exportReadingsToFHIRBundle(readings: BPReading[], profile?: Profile): FHIRBundleResource {
  const entries = readings.map((r) => {
    const res = convertReadingToFHIR(r, profile);
    return {
      fullUrl: `urn:uuid:${res.id}`,
      resource: res
    };
  });

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries
  };
}
