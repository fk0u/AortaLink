import type {
  BPReading,
  Profile,
  LabResult,
  MedicationItem,
  FhirObservation,
  FhirObservationComponent,
  FhirPatient,
  FhirMedicationRequest,
  MedicationSchedule,
  ConditionItem,
  ConditionCategory,
  FamilyMemberHistoryItem,
  ImmunizationItem,
  FhirCondition,
  FhirFamilyMemberHistory,
  FhirImmunization
} from '../../types/blood-pressure.ts';
import { classifyBP } from '../../utils/bp-classifier.ts';

export interface FHIRBundleEntry {
  fullUrl: string;
  resource:
    | FhirObservation
    | FhirPatient
    | FhirMedicationRequest
    | FhirCondition
    | FhirFamilyMemberHistory
    | FhirImmunization;
}

export interface FHIRBundleResource {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: FHIRBundleEntry[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Deterministically map an arbitrary id string to a standard RFC 4122 UUID v4-formatted string.
 * Guarantees that:
 * 1. Existing valid UUIDs are preserved unchanged (lowercased).
 * 2. Non-UUIDs (numeric IDs, 'prof-1', etc.) map deterministically to a valid lowercase UUID.
 */
export function toValidUuid(rawId: unknown, namespace = 'aortalink'): string {
  if (isUuid(rawId)) {
    return rawId.toLowerCase();
  }
  const input = `${namespace}:${String(rawId || 'unknown')}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (h1 >>> 16);
    h2 = Math.imul(h2, 0x01000193);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ 0x5a5a5a5a) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h2 ^ 0xa5a5a5a5) >>> 0).toString(16).padStart(8, '0');
  const hex = (p1 + p2 + p3 + p4).slice(0, 32);

  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = '4' + hex.slice(13, 16);
  const part4 = '8' + hex.slice(17, 20);
  const part5 = hex.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}

/**
 * Convert a Profile to HL7 FHIR R4 Patient Resource.
 */
export function convertProfileToFHIR(profile: Profile): FhirPatient {
  const patientId = toValidUuid(profile.id, 'patient');
  return {
    resourceType: 'Patient',
    id: patientId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
    },
    identifier: [
      {
        system: 'http://aortalink.app/fhir/identifier/profile-id',
        value: profile.id
      }
    ],
    active: true,
    name: [
      {
        use: 'official',
        text: profile.name || 'Patient'
      }
    ],
    ...(profile.gender && profile.gender !== 'other' ? { gender: profile.gender } : {}),
    ...(profile.age ? { birthDate: `${new Date().getFullYear() - profile.age}-01-01` } : {}),
    extension: [
      ...(profile.targetSystolic ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/target-systolic', valueInteger: profile.targetSystolic }] : []),
      ...(profile.targetDiastolic ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/target-diastolic', valueInteger: profile.targetDiastolic }] : []),
      ...(profile.relationship ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/relationship', valueString: profile.relationship }] : []),
      ...(profile.avatar ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/avatar', valueString: profile.avatar }] : []),
      ...(profile.guidelinePreference ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/guideline-preference', valueString: profile.guidelinePreference }] : []),
      ...(profile.screeningCompletedAt ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/screening-completed-at', valueDateTime: profile.screeningCompletedAt }] : []),
      ...(profile.createdAt ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/created-at', valueDateTime: profile.createdAt }] : []),
      ...(profile.isDefault !== undefined ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/is-default', valueBoolean: profile.isDefault }] : [])
    ]
  };
}

/**
 * Convert a single BPReading to HL7 FHIR R4 Observation Resource format.
 * Follows LOINC `85354-9` & HL7 FHIR Implementation Guide for Vital Signs BP Profile.
 */
export function convertReadingToFHIR(reading: BPReading, profile?: Profile): FhirObservation {
  const obsId = toValidUuid(reading.id, 'reading');
  const patientId = toValidUuid(reading.profileId || profile?.id || 'default-patient', 'patient');

  const components: FhirObservationComponent[] = [
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
    }
  ];

  if (reading.pulse !== undefined && reading.pulse !== null && reading.pulse > 0) {
    components.push({
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
    });
  }

  const guidelineId = profile?.guidelinePreference || 'esh_perhi';
  const classification = classifyBP(reading.systolic, reading.diastolic, guidelineId, {
    isHomeMeasurement: reading.measurement_context === 'Home'
  });

  let interpCode = 'N';
  let interpDisplay = 'Normal';
  if (classification.key === 'stage3' || classification.key === 'crisis') {
    interpCode = 'HH';
    interpDisplay = 'Critically high';
  } else if (classification.key === 'stage1' || classification.key === 'stage2' || classification.key === 'elevated') {
    interpCode = 'H';
    interpDisplay = 'High';
  } else if (classification.key === 'optimal' || classification.key === 'normal') {
    interpCode = 'N';
    interpDisplay = 'Normal';
  }

  const fhirResource: FhirObservation = {
    resourceType: 'Observation',
    id: obsId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/bp']
    },
    identifier: [
      {
        system: 'http://aortalink.app/fhir/identifier/reading-id',
        value: String(reading.id)
      }
    ],
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
      reference: `urn:uuid:${patientId}`,
      display: profile ? profile.name : 'Patient'
    },
    effectiveDateTime: reading.timestamp,
    interpretation: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: interpCode,
            display: interpDisplay
          }
        ],
        text: classification.label
      }
    ],
    component: components
  };

  const readingExtensions: any[] = [];
  if (reading.measurement_context) {
    readingExtensions.push({
      url: 'https://aortalink.health/fhir/StructureDefinition/measurement-context',
      valueString: reading.measurement_context
    });
  }
  if (reading.position) {
    readingExtensions.push({
      url: 'http://aortalink.app/fhir/StructureDefinition/body-position',
      valueString: reading.position
    });
  }
  if (reading.arm) {
    readingExtensions.push({
      url: 'http://aortalink.app/fhir/StructureDefinition/body-site',
      valueString: reading.arm
    });
  }
  if (reading.tags && reading.tags.length > 0) {
    readingExtensions.push({
      url: 'http://aortalink.app/fhir/StructureDefinition/reading-tag',
      valueString: reading.tags.join(',')
    });
  }
  if (reading.isFlaggedMeasurement !== undefined) {
    readingExtensions.push({
      url: 'http://aortalink.app/fhir/StructureDefinition/is-flagged',
      valueBoolean: reading.isFlaggedMeasurement
    });
  }

  if (readingExtensions.length > 0) {
    fhirResource.extension = readingExtensions;
  }

  if (reading.notes) {
    fhirResource.note = [{ text: reading.notes }];
  }

  return fhirResource;
}

/**
 * Convert a LabResult to HL7 FHIR R4 Observations for Ureum, Kreatinin, and Asam Urat.
 */
export function convertLabResultToFHIR(lab: LabResult, profile?: Profile): FhirObservation[] {
  const patientId = toValidUuid(lab.profileId || profile?.id || 'default-patient', 'patient');
  const subjectRef = { reference: `urn:uuid:${patientId}`, display: profile?.name || 'Patient' };
  const obsList: FhirObservation[] = [];

  const createLabObs = (
    subId: string,
    loincCode: string,
    loincDisplay: string,
    text: string,
    value: number,
    unit: string,
    ucumCode: string
  ): FhirObservation => ({
    resourceType: 'Observation',
    id: toValidUuid(lab.id ? `${lab.id}-${subId}` : `${Date.now()}-${subId}`, `obs-${subId}`),
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Observation']
    },
    ...(lab.id !== undefined
      ? {
          identifier: [
            {
              system: 'http://aortalink.app/fhir/identifier/lab-id',
              value: String(lab.id)
            }
          ]
        }
      : {}),
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: loincCode,
          display: loincDisplay
        }
      ],
      text
    },
    subject: subjectRef,
    effectiveDateTime: lab.timestamp,
    valueQuantity: {
      value,
      unit,
      system: 'http://unitsofmeasure.org',
      code: ucumCode
    }
  });

  if (lab.uricAcid !== undefined) {
    obsList.push(createLabObs('uric', '3084-1', 'Urate [Mass/volume] in Serum or Plasma', 'Asam Urat', lab.uricAcid, 'mg/dL', 'mg/dL'));
  }
  if (lab.serumCreatinine !== undefined) {
    obsList.push(createLabObs('creat', '2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', 'Kreatinin Serum', lab.serumCreatinine, 'mg/dL', 'mg/dL'));
  }
  if (lab.bloodUrea !== undefined) {
    obsList.push(createLabObs('urea', '3091-6', 'Urea [Mass/volume] in Serum or Plasma', 'Ureum Darah', lab.bloodUrea, 'mg/dL', 'mg/dL'));
  }
  if (lab.totalCholesterol !== undefined) {
    obsList.push(createLabObs('chol', '2093-3', 'Cholesterol [Mass/volume] in Serum or Plasma', 'Kolesterol Total', lab.totalCholesterol, 'mg/dL', 'mg/dL'));
  }
  if (lab.ldlCholesterol !== undefined) {
    obsList.push(createLabObs('ldl', '13457-7', 'Cholesterol in LDL [Mass/volume] in Serum or Plasma', 'Kolesterol LDL', lab.ldlCholesterol, 'mg/dL', 'mg/dL'));
  }
  if (lab.hdlCholesterol !== undefined) {
    obsList.push(createLabObs('hdl', '2085-9', 'Cholesterol in HDL [Mass/volume] in Serum or Plasma', 'Kolesterol HDL', lab.hdlCholesterol, 'mg/dL', 'mg/dL'));
  }
  if (lab.triglycerides !== undefined) {
    obsList.push(createLabObs('trig', '2571-8', 'Triglyceride [Mass/volume] in Serum or Plasma', 'Trigliserida', lab.triglycerides, 'mg/dL', 'mg/dL'));
  }
  if (lab.fastingBloodSugar !== undefined) {
    obsList.push(createLabObs('fbs', '1558-6', 'Fasting glucose [Mass/volume] in Serum or Plasma', 'Gula Darah Puasa', lab.fastingBloodSugar, 'mg/dL', 'mg/dL'));
  }
  if (lab.hba1c !== undefined) {
    obsList.push(createLabObs('hba1c', '4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood', 'HbA1c', lab.hba1c, '%', '%'));
  }
  if (lab.potassium !== undefined) {
    obsList.push(createLabObs('k', '2823-3', 'Potassium [Moles/volume] in Serum or Plasma', 'Kalium Serum', lab.potassium, 'mEq/L', 'meq/L'));
  }
  if (lab.sodium !== undefined) {
    obsList.push(createLabObs('na', '2951-2', 'Sodium [Moles/volume] in Serum or Plasma', 'Natrium Serum', lab.sodium, 'mEq/L', 'meq/L'));
  }
  if (lab.eGfr !== undefined) {
    obsList.push(createLabObs('egfr', '33914-3', 'Glomerular filtration rate/1.73 sq M.predicted', 'eGFR', lab.eGfr, 'mL/min/1.73m2', 'mL/min/{1.73_m2}'));
  }

  return obsList;
}

/**
 * Convert MedicationItem into HL7 FHIR R4 MedicationRequest Resource.
 * Custom drugs omit fake RxNorm codings and output text-only medicationCodeableConcept.
 */
export function convertMedicationToFHIR(med: MedicationItem, profile?: Profile): FhirMedicationRequest {
  const patientId = toValidUuid(med.profileId || profile?.id || 'default-patient', 'patient');
  const isAmlodipine = med.name.toLowerCase().includes('amlodipine');

  return {
    resourceType: 'MedicationRequest',
    id: toValidUuid(med.id, 'medreq'),
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest'],
      ...(med.createdAt ? { lastUpdated: med.createdAt } : {})
    },
    identifier: [
      {
        system: 'http://aortalink.app/fhir/identifier/medication-id',
        value: String(med.id)
      }
    ],
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: isAmlodipine
      ? {
          coding: [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: '17767',
              display: `${med.name} ${med.dosage}`
            }
          ],
          text: `${med.name} (${med.drugClass})`
        }
      : {
          text: `${med.name} (${med.drugClass})`
        },
    subject: {
      reference: `urn:uuid:${patientId}`,
      display: profile ? profile.name : 'Patient'
    },
    dosageInstruction: [
      {
        text: `Dose: ${med.dosage}. Schedule: ${med.schedule}. Purpose: ${med.purpose}`
      }
    ],
    extension: [
      ...(med.drugClass ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/drug-class', valueString: med.drugClass }] : []),
      ...(med.purpose ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/purpose', valueString: med.purpose }] : []),
      ...(med.dosage ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/dosage', valueString: med.dosage }] : []),
      ...(med.schedule ? [{ url: 'http://aortalink.app/fhir/StructureDefinition/schedule', valueString: med.schedule }] : [])
    ]
  };
}

/**
 * Export all profile records into HL7 FHIR R4 Bundle Collection JSON.
 * Includes Patient resource so Observation subject references resolve cleanly.
 */
export function exportReadingsToFHIRBundle(readings: BPReading[], profile?: Profile): FHIRBundleResource {
  const entries: FHIRBundleEntry[] = [];

  let patientRef: string;
  if (profile) {
    const patientResource = convertProfileToFHIR(profile);
    patientRef = `urn:uuid:${patientResource.id}`;
    entries.push({
      fullUrl: patientRef,
      resource: patientResource
    });
  } else {
    const defaultPatientId = toValidUuid('default-patient', 'patient');
    patientRef = `urn:uuid:${defaultPatientId}`;
    entries.push({
      fullUrl: patientRef,
      resource: {
        resourceType: 'Patient',
        id: defaultPatientId,
        meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
        active: true,
        name: [{ use: 'official', text: 'Patient' }]
      }
    });
  }

  for (const r of readings) {
    const res = convertReadingToFHIR(r, profile);
    res.subject.reference = patientRef;
    entries.push({
      fullUrl: `urn:uuid:${res.id}`,
      resource: res
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries
  };
}

// ---------------------------------------------------------------------------
// Reverse Converters (fromFHIR -> Domain Models)
// ---------------------------------------------------------------------------

/**
 * Normalize lab values based on UCUM units to standard Indonesian EHR units (mg/dL).
 */
export function normalizeLabQuantity(code: string, rawVal: number, unit?: string, ucumCode?: string): number {
  const u = (unit || ucumCode || '').toLowerCase().trim();
  if (u === 'mmol/l' || u === 'mmol/liter') {
    // Total cholesterol, LDL, HDL: 1 mmol/L = 38.67 mg/dL
    if (code === '2093-3' || code === '13457-7' || code === '2085-9') {
      return Math.round(rawVal * 38.67 * 10) / 10;
    }
    // Triglycerides: 1 mmol/L = 88.57 mg/dL
    if (code === '2571-8') {
      return Math.round(rawVal * 88.57 * 10) / 10;
    }
    // Fasting Glucose: 1 mmol/L = 18.0182 mg/dL
    if (code === '1558-6' || code === '2345-7') {
      return Math.round(rawVal * 18.0182 * 10) / 10;
    }
    // Blood urea: 1 mmol/L = 6.006 mg/dL
    if (code === '3091-6') {
      return Math.round(rawVal * 6.006 * 10) / 10;
    }
  } else if (u === 'umol/l' || u === 'µmol/l') {
    // Serum creatinine: 1 umol/L = 1 / 88.4 mg/dL
    if (code === '2160-0') {
      return Math.round((rawVal / 88.4) * 100) / 100;
    }
    // Uric acid: 1 umol/L = 1 / 59.48 mg/dL
    if (code === '3084-1') {
      return Math.round((rawVal / 59.48) * 100) / 100;
    }
  }
  return rawVal;
}

export function readingFromFHIR(obs: FhirObservation): BPReading {
  let systolic = 0;
  let diastolic = 0;
  let pulse: number | undefined = undefined;

  for (const comp of obs.component || []) {
    const loinc = comp.code?.coding?.find((c) => c.system === 'http://loinc.org' || c.system?.includes('loinc'));
    const code = loinc?.code || comp.code?.coding?.[0]?.code;
    const val = comp.valueQuantity?.value ?? 0;
    if (code === '8480-6') systolic = val;
    else if (code === '8462-4') diastolic = val;
    else if (code === '8867-4' && val > 0) pulse = val;
  }

  const ref = obs.subject?.reference || '';
  const profileId = ref.startsWith('urn:uuid:') ? ref.replace('urn:uuid:', '') : ref.replace(/^Patient\//, '');

  let measurement_context: any = undefined;
  let position: any = undefined;
  let arm: any = undefined;
  let tags: string[] | undefined = undefined;
  let isFlaggedMeasurement: boolean | undefined = undefined;

  for (const ext of obs.extension || []) {
    if (ext.url?.includes('measurement-context')) measurement_context = ext.valueString;
    else if (ext.url?.includes('body-position')) position = ext.valueString;
    else if (ext.url?.includes('body-site')) arm = ext.valueString;
    else if (ext.url?.includes('reading-tag')) tags = ext.valueString ? ext.valueString.split(',') : undefined;
    else if (ext.url?.includes('is-flagged')) isFlaggedMeasurement = ext.valueBoolean;
  }

  const notes = obs.note?.[0]?.text;
  const localId = obs.identifier?.find((i: any) => i.system === 'http://aortalink.app/fhir/identifier/reading-id')?.value;

  return {
    id: localId || obs.id || '',
    profileId,
    systolic,
    diastolic,
    ...(pulse !== undefined && pulse > 0 ? { pulse } : {}),
    timestamp: obs.effectiveDateTime,
    notes,
    measurement_context,
    ...(position ? { position } : {}),
    ...(arm ? { arm } : {}),
    ...(tags ? { tags } : {}),
    ...(isFlaggedMeasurement !== undefined ? { isFlaggedMeasurement } : {})
  };
}

export function labResultFromFHIR(observations: FhirObservation[]): LabResult {
  let uricAcid: number | undefined;
  let serumCreatinine: number | undefined;
  let bloodUrea: number | undefined;
  let totalCholesterol: number | undefined;
  let ldlCholesterol: number | undefined;
  let hdlCholesterol: number | undefined;
  let triglycerides: number | undefined;
  let fastingBloodSugar: number | undefined;
  let hba1c: number | undefined;
  let potassium: number | undefined;
  let sodium: number | undefined;
  let eGfr: number | undefined;
  let timestamp = new Date().toISOString();
  let profileId = '';
  let id: number | undefined;

  for (const obs of observations) {
    if (!profileId && obs.subject?.reference) {
      const ref = obs.subject.reference;
      profileId = ref.startsWith('urn:uuid:') ? ref.replace('urn:uuid:', '') : ref.replace(/^Patient\//, '');
    }
    if (obs.effectiveDateTime) timestamp = obs.effectiveDateTime;
    if (id === undefined) {
      const idFromIdent = obs.identifier?.find((i: any) => i.system === 'http://aortalink.app/fhir/identifier/lab-id')?.value;
      if (idFromIdent && /^\d+$/.test(idFromIdent)) {
        id = Number(idFromIdent);
      } else if (obs.id && /^\d+$/.test(obs.id)) {
        id = Number(obs.id);
      }
    }

    // Match LOINC across all codings
    const loincCoding = obs.code?.coding?.find((c) => c.system === 'http://loinc.org' || c.system?.includes('loinc'));
    const code = loincCoding?.code || obs.code?.coding?.[0]?.code;
    const rawVal = obs.valueQuantity?.value;
    if (rawVal === undefined || rawVal === null) continue;

    const val = normalizeLabQuantity(code || '', rawVal, obs.valueQuantity?.unit, obs.valueQuantity?.code);

    if (code === '3084-1') uricAcid = val;
    else if (code === '2160-0') serumCreatinine = val;
    else if (code === '3091-6') bloodUrea = val;
    else if (code === '2093-3') totalCholesterol = val;
    else if (code === '13457-7') ldlCholesterol = val;
    else if (code === '2085-9') hdlCholesterol = val;
    else if (code === '2571-8') triglycerides = val;
    else if (code === '1558-6' || code === '2345-7') fastingBloodSugar = val;
    else if (code === '4548-4') hba1c = val;
    else if (code === '2823-3') potassium = val;
    else if (code === '2951-2') sodium = val;
    else if (code === '33914-3' || code === '48642-3' || code === '48643-1') eGfr = val;
  }

  return {
    ...(id !== undefined ? { id } : {}),
    profileId,
    timestamp,
    uricAcid: uricAcid ?? 0,
    serumCreatinine: serumCreatinine ?? 0,
    bloodUrea: bloodUrea ?? 0,
    ...(totalCholesterol !== undefined ? { totalCholesterol } : {}),
    ...(ldlCholesterol !== undefined ? { ldlCholesterol } : {}),
    ...(hdlCholesterol !== undefined ? { hdlCholesterol } : {}),
    ...(triglycerides !== undefined ? { triglycerides } : {}),
    ...(fastingBloodSugar !== undefined ? { fastingBloodSugar } : {}),
    ...(hba1c !== undefined ? { hba1c } : {}),
    ...(potassium !== undefined ? { potassium } : {}),
    ...(sodium !== undefined ? { sodium } : {}),
    ...(eGfr !== undefined ? { eGfr } : {})
  };
}

export function medicationFromFHIR(req: FhirMedicationRequest): Partial<MedicationItem> {
  const ref = req.subject?.reference || '';
  const profileId = ref.startsWith('urn:uuid:') ? ref.replace('urn:uuid:', '') : ref.replace(/^Patient\//, '');
  const text = req.medicationCodeableConcept?.text || '';
  const coding = req.medicationCodeableConcept?.coding?.[0];

  const instruction = req.dosageInstruction?.[0]?.text || '';
  const doseMatch = instruction.match(/Dose:\s*([\s\S]+?)(?:\.?\s*(?:Schedule|Purpose):|\.?\s*$)/i);
  const scheduleMatch = instruction.match(/Schedule:\s*([\s\S]+?)(?:\.?\s*Purpose:|\.?\s*$)/i);
  const purposeMatch = instruction.match(/Purpose:\s*([\s\S]+?)(?:\.?\s*$)/i);

  const cleanDose = doseMatch ? doseMatch[1].replace(/[.,;\s]+$/, '').trim() : '';
  const cleanSchedule = scheduleMatch ? scheduleMatch[1].replace(/[.,;\s]+$/, '').trim() : '';
  const cleanPurpose = purposeMatch ? purposeMatch[1].replace(/[.,;\s]+$/, '').trim() : '';

  let drugClassFromExt: string | undefined;
  let purposeFromExt: string | undefined;
  let dosageFromExt: string | undefined;
  let scheduleFromExt: string | undefined;

  for (const ext of (req as any).extension || []) {
    if (ext.url?.endsWith('drug-class')) drugClassFromExt = ext.valueString;
    else if (ext.url?.endsWith('purpose')) purposeFromExt = ext.valueString;
    else if (ext.url?.endsWith('dosage')) dosageFromExt = ext.valueString;
    else if (ext.url?.endsWith('schedule')) scheduleFromExt = ext.valueString;
  }

  const validSchedules: MedicationSchedule[] = ['pagi', 'siang', 'sore', 'malam', 'pagi_malam', 'sesuai_kebutuhan'];
  const rawSchedule = scheduleFromExt || cleanSchedule;
  const schedule: MedicationSchedule = (validSchedules.includes(rawSchedule as MedicationSchedule) ? rawSchedule : 'pagi') as MedicationSchedule;

  const localIdStr = req.identifier?.find((i: any) => i.system === 'http://aortalink.app/fhir/identifier/medication-id')?.value;
  const parsedId = localIdStr && /^\d+$/.test(localIdStr) ? Number(localIdStr) : (req.id && /^\d+$/.test(req.id) ? Number(req.id) : undefined);

  let name = text;
  let drugClass = drugClassFromExt || 'Antihipertensi';
  const nameMatch = text.match(/^(.+?)\s*\((.+?)\)$/);
  if (nameMatch) {
    name = nameMatch[1].trim();
    if (!drugClassFromExt) drugClass = nameMatch[2].trim();
  } else if (coding?.display) {
    name = coding.display.split(' ')[0];
  }

  const dosage = dosageFromExt || cleanDose || (coding?.display?.match(/\d+(?:\.\d+)?\s*(?:mg|mcg|g)/i)?.[0] || '1 tablet');
  const purpose = purposeFromExt || cleanPurpose || 'Hipertensi';

  return {
    ...(parsedId !== undefined ? { id: parsedId } : {}),
    profileId,
    name: name || 'Obat',
    dosage,
    schedule,
    purpose,
    drugClass
  };
}

export function profileFromFHIR(patient: FhirPatient): Partial<Profile> {
  let age: number | undefined;
  if (patient.birthDate) {
    const birthYear = new Date(patient.birthDate).getFullYear();
    if (!isNaN(birthYear)) {
      age = new Date().getFullYear() - birthYear;
    }
  }

  const localId = patient.identifier?.find((i: any) => i.system === 'http://aortalink.app/fhir/identifier/profile-id')?.value;
  let targetSystolic: number | undefined;
  let targetDiastolic: number | undefined;
  let relationship: any = undefined;
  let avatar: string | undefined;
  let guidelinePreference: any = undefined;
  let screeningCompletedAt: string | undefined;
  let createdAt: string | undefined;
  let isDefault: boolean | undefined;

  for (const ext of (patient as any).extension || []) {
    if (ext.url?.endsWith('target-systolic')) targetSystolic = ext.valueInteger;
    else if (ext.url?.endsWith('target-diastolic')) targetDiastolic = ext.valueInteger;
    else if (ext.url?.endsWith('relationship')) relationship = ext.valueString;
    else if (ext.url?.endsWith('avatar')) avatar = ext.valueString;
    else if (ext.url?.endsWith('guideline-preference')) guidelinePreference = ext.valueString;
    else if (ext.url?.endsWith('screening-completed-at')) screeningCompletedAt = ext.valueDateTime;
    else if (ext.url?.endsWith('created-at')) createdAt = ext.valueDateTime;
    else if (ext.url?.endsWith('is-default')) isDefault = ext.valueBoolean;
  }

  const nameObj = patient.name?.[0];
  let patientName = nameObj?.text;
  if (!patientName && nameObj) {
    const parts = [...(nameObj.given || []), nameObj.family].filter(Boolean);
    if (parts.length > 0) patientName = parts.join(' ');
  }

  return {
    id: localId || patient.id,
    name: patientName || 'Pasien',
    gender: patient.gender === 'male' || patient.gender === 'female' ? patient.gender : 'other',
    ...(age !== undefined ? { age } : {}),
    ...(targetSystolic !== undefined ? { targetSystolic } : {}),
    ...(targetDiastolic !== undefined ? { targetDiastolic } : {}),
    ...(relationship ? { relationship } : {}),
    ...(avatar ? { avatar } : {}),
    ...(guidelinePreference ? { guidelinePreference } : {}),
    ...(screeningCompletedAt ? { screeningCompletedAt } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(isDefault !== undefined ? { isDefault } : {})
  };
}

// ---------------------------------------------------------------------------
// Step 03: Condition, Family History & Immunization Converters (FHIR R4)
// ---------------------------------------------------------------------------

export function convertConditionToFHIR(condition: ConditionItem, profile?: Profile): FhirCondition {
  const condId = toValidUuid(condition.id, 'condition');
  const patientId = toValidUuid(condition.profileId || profile?.id || 'default-patient', 'patient');

  const fhir: FhirCondition = {
    resourceType: 'Condition',
    id: condId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Condition']
    },
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: condition.clinicalStatus || 'active',
          display: condition.clinicalStatus || 'Active'
        }
      ]
    },
    ...(condition.verificationStatus
      ? {
          verificationStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: condition.verificationStatus,
                display: condition.verificationStatus
              }
            ]
          }
        }
      : {}),
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
            display: 'Problem List Item'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: condition.codeSystem || 'http://hl7.org/fhir/sid/icd-10',
          code: condition.code,
          display: condition.name
        },
        ...(condition.snomedCode
          ? [
              {
                system: 'http://snomed.info/sct',
                code: condition.snomedCode,
                display: condition.name
              }
            ]
          : [])
      ],
      text: condition.name
    },
    subject: {
      reference: `urn:uuid:${patientId}`,
      display: profile ? profile.name : 'Patient'
    },
    ...(condition.onsetDateTime ? { onsetDateTime: condition.onsetDateTime } : {}),
    recordedDate: condition.recordedDate || new Date().toISOString(),
    ...(condition.notes ? { note: [{ text: condition.notes }] } : {}),
    extension: [
      {
        url: 'https://aortalink.health/fhir/StructureDefinition/condition-category',
        valueString: condition.category
      }
    ]
  };

  if (condition.aortaDetails) {
    const ext = fhir.extension || [];
    if (condition.aortaDetails.diameterMm !== undefined) {
      ext.push({
        url: 'https://aortalink.health/fhir/StructureDefinition/aorta-diameter-mm',
        valueDecimal: condition.aortaDetails.diameterMm
      });
    }
    if (condition.aortaDetails.segment) {
      ext.push({
        url: 'https://aortalink.health/fhir/StructureDefinition/aorta-segment',
        valueString: condition.aortaDetails.segment
      });
    }
    if (condition.aortaDetails.modality) {
      ext.push({
        url: 'https://aortalink.health/fhir/StructureDefinition/aorta-modality',
        valueString: condition.aortaDetails.modality
      });
    }
    if (condition.aortaDetails.measurementMethod) {
      ext.push({
        url: 'https://aortalink.health/fhir/StructureDefinition/aorta-measurement-method',
        valueString: condition.aortaDetails.measurementMethod
      });
    }
    fhir.extension = ext;
  }

  return fhir;
}

export function conditionFromFHIR(fhir: FhirCondition): ConditionItem {
  const ref = fhir.subject?.reference || '';
  const profileId = ref.startsWith('urn:uuid:') ? ref.replace('urn:uuid:', '') : ref.replace(/^Patient\//, '');
  const icd10Coding = fhir.code.coding?.find((c) => c.system === 'http://hl7.org/fhir/sid/icd-10');
  const snomedCoding = fhir.code.coding?.find((c) => c.system === 'http://snomed.info/sct');
  const primaryCoding = icd10Coding || fhir.code.coding?.[0];

  const clinicalStatus = (fhir.clinicalStatus?.coding?.[0]?.code as any) || 'active';
  const verificationStatus = fhir.verificationStatus?.coding?.[0]?.code as any;

  let aortaDetails: any = undefined;
  if (fhir.extension && fhir.extension.length > 0) {
    const diam = fhir.extension.find((e) => e.url.endsWith('aorta-diameter-mm'))?.valueDecimal;
    const seg = fhir.extension.find((e) => e.url.endsWith('aorta-segment'))?.valueString;
    const mod = fhir.extension.find((e) => e.url.endsWith('aorta-modality'))?.valueString;
    const met = fhir.extension.find((e) => e.url.endsWith('aorta-measurement-method'))?.valueString;
    if (diam !== undefined || seg || mod || met) {
      aortaDetails = {
        diameterMm: diam,
        segment: seg,
        modality: mod,
        measurementMethod: met
      };
    }
  }

  const categoryExt = fhir.extension?.find((e) => e.url.endsWith('condition-category'));
  const category = (categoryExt?.valueString as ConditionCategory) || 'aorta_risk';

  return {
    id: fhir.id || '',
    profileId,
    code: primaryCoding?.code || 'unknown',
    codeSystem: primaryCoding?.system,
    snomedCode: snomedCoding?.code,
    category,
    name: fhir.code.text || primaryCoding?.display || 'Kondisi Medis',
    clinicalStatus,
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(fhir.onsetDateTime ? { onsetDateTime: fhir.onsetDateTime } : {}),
    recordedDate: fhir.recordedDate || new Date().toISOString(),
    ...(fhir.note?.[0]?.text ? { notes: fhir.note[0].text } : {}),
    ...(aortaDetails ? { aortaDetails } : {})
  };
}

export function convertFamilyHistoryToFHIR(
  history: FamilyMemberHistoryItem,
  profile?: Profile
): FhirFamilyMemberHistory {
  const fId = toValidUuid(history.id, 'fmh');
  const patientId = toValidUuid(history.profileId || profile?.id || 'default-patient', 'patient');

  return {
    resourceType: 'FamilyMemberHistory',
    id: fId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/FamilyMemberHistory']
    },
    status: 'completed',
    patient: {
      reference: `urn:uuid:${patientId}`,
      display: profile ? profile.name : 'Patient'
    },
    relationship: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
          code: history.relationship,
          display: history.relationshipDisplay || history.relationship
        }
      ],
      text: history.relationshipDisplay
    },
    date: history.recordedDate,
    ...(history.deceasedAge !== undefined && history.deceasedAge > 0
      ? {
          deceasedAge: {
            value: history.deceasedAge,
            unit: 'years',
            system: 'http://unitsofmeasure.org',
            code: 'a'
          }
        }
      : history.deceased !== undefined
      ? { deceasedBoolean: history.deceased }
      : {}),
    condition: [
      {
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: history.conditionCode,
              display: history.conditionName
            },
            ...(history.snomedCode
              ? [
                  {
                    system: 'http://snomed.info/sct',
                    code: history.snomedCode,
                    display: history.conditionName
                  }
                ]
              : [])
          ],
          text: history.conditionName
        },
        ...(history.contributedToDeath !== undefined ? { contributedToDeath: history.contributedToDeath } : {})
      }
    ]
  };
}

export function familyHistoryFromFHIR(fhir: FhirFamilyMemberHistory): FamilyMemberHistoryItem {
  const ref = fhir.patient?.reference || '';
  const profileId = ref.startsWith('urn:uuid:') ? ref.replace('urn:uuid:', '') : ref.replace(/^Patient\//, '');
  const relCode = (fhir.relationship?.coding?.[0]?.code as any) || 'EXT';
  const relDisplay = fhir.relationship?.text || fhir.relationship?.coding?.[0]?.display || 'Keluarga';

  const cond = fhir.condition?.[0];
  const icd10Coding = cond?.code.coding?.find((c) => c.system === 'http://hl7.org/fhir/sid/icd-10');
  const snomedCoding = cond?.code.coding?.find((c) => c.system === 'http://snomed.info/sct');
  const primaryCoding = icd10Coding || cond?.code.coding?.[0];

  const hasDeceasedAge = fhir.deceasedAge?.value !== undefined;
  const deceased = hasDeceasedAge ? true : fhir.deceasedBoolean;

  return {
    id: fhir.id || '',
    profileId,
    relationship: relCode,
    relationshipDisplay: relDisplay,
    conditionCode: primaryCoding?.code || 'unknown',
    conditionName: cond?.code.text || primaryCoding?.display || 'Kondisi Keluarga',
    ...(snomedCoding?.code ? { snomedCode: snomedCoding.code } : {}),
    ...(deceased !== undefined ? { deceased } : {}),
    ...(hasDeceasedAge ? { deceasedAge: fhir.deceasedAge!.value } : {}),
    ...(cond?.contributedToDeath !== undefined ? { contributedToDeath: cond.contributedToDeath } : {}),
    recordedDate: fhir.date || new Date().toISOString()
  };
}

export function convertImmunizationToFHIR(imm: ImmunizationItem, profile?: Profile): FhirImmunization {
  const immId = toValidUuid(imm.id, 'imm');
  const patientId = toValidUuid(imm.profileId || profile?.id || 'default-patient', 'patient');

  return {
    resourceType: 'Immunization',
    id: immId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Immunization']
    },
    status: imm.status || 'completed',
    vaccineCode: {
      coding: [
        {
          system: 'https://aortalink.health/fhir/CodeSystem/vaccines',
          code: imm.vaccineCode,
          display: imm.vaccineName
        },
        ...(imm.cvxCode
          ? [
              {
                system: 'http://hl7.org/fhir/sid/cvx',
                code: imm.cvxCode,
                display: imm.vaccineName
              }
            ]
          : [])
      ],
      text: imm.vaccineName
    },
    patient: {
      reference: `urn:uuid:${patientId}`,
      display: profile ? profile.name : 'Patient'
    },
    occurrenceDateTime: imm.occurrenceDateTime,
    recorded: imm.recordedDate || new Date().toISOString()
  };
}

export function immunizationFromFHIR(fhir: FhirImmunization): ImmunizationItem {
  const ref = fhir.patient?.reference || '';
  const profileId = ref.startsWith('urn:uuid:') ? ref.replace('urn:uuid:', '') : ref.replace(/^Patient\//, '');
  const coding = fhir.vaccineCode.coding?.[0];
  const cvxCoding = fhir.vaccineCode.coding?.find((c) => c.system === 'http://hl7.org/fhir/sid/cvx');

  return {
    id: fhir.id || '',
    profileId,
    vaccineCode: coding?.code || 'unknown',
    vaccineName: fhir.vaccineCode.text || coding?.display || 'Vaksinasi',
    ...(cvxCoding?.code ? { cvxCode: cvxCoding.code } : {}),
    occurrenceDateTime: fhir.occurrenceDateTime,
    status: fhir.status,
    recordedDate: fhir.recorded || new Date().toISOString()
  };
}

export function convertAnthropometryToFHIR(profile: Profile): {
  height?: FhirObservation;
  weight?: FhirObservation;
  bmi?: FhirObservation;
} {
  const patientId = toValidUuid(profile.id, 'patient');
  const subjectRef = { reference: `urn:uuid:${patientId}`, display: profile.name };
  const effectiveDateTime = profile.screeningCompletedAt || profile.createdAt || new Date().toISOString();
  const result: { height?: FhirObservation; weight?: FhirObservation; bmi?: FhirObservation } = {};

  let heightId: string | undefined;
  if (profile.heightCm && profile.heightCm > 0) {
    heightId = toValidUuid(`${profile.id}-height`, 'obs-height');
    result.height = {
      resourceType: 'Observation',
      id: heightId,
      meta: { profile: ['http://hl7.org/fhir/StructureDefinition/vitalsigns'] },
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
        coding: [{ system: 'http://loinc.org', code: '8302-2', display: 'Body height' }],
        text: 'Tinggi Badan'
      },
      subject: subjectRef,
      effectiveDateTime,
      valueQuantity: {
        value: profile.heightCm,
        unit: 'cm',
        system: 'http://unitsofmeasure.org',
        code: 'cm'
      }
    };
  }

  let weightId: string | undefined;
  if (profile.weightKg && profile.weightKg > 0) {
    weightId = toValidUuid(`${profile.id}-weight`, 'obs-weight');
    result.weight = {
      resourceType: 'Observation',
      id: weightId,
      meta: { profile: ['http://hl7.org/fhir/StructureDefinition/vitalsigns'] },
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
        coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
        text: 'Berat Badan'
      },
      subject: subjectRef,
      effectiveDateTime,
      valueQuantity: {
        value: profile.weightKg,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg'
      }
    };
  }

  if (profile.bmi && profile.bmi > 0) {
    const bmiId = toValidUuid(`${profile.id}-bmi`, 'obs-bmi');
    const derivedFrom: Array<{ reference: string; display?: string }> = [];
    if (heightId) derivedFrom.push({ reference: `urn:uuid:${heightId}`, display: 'Body Height' });
    if (weightId) derivedFrom.push({ reference: `urn:uuid:${weightId}`, display: 'Body Weight' });

    result.bmi = {
      resourceType: 'Observation',
      id: bmiId,
      meta: { profile: ['http://hl7.org/fhir/StructureDefinition/vitalsigns'] },
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
        coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI) [Ratio]' }],
        text: 'Indeks Massa Tubuh (BMI)'
      },
      subject: subjectRef,
      effectiveDateTime,
      valueQuantity: {
        value: profile.bmi,
        unit: 'kg/m2',
        system: 'http://unitsofmeasure.org',
        code: 'kg/m2'
      },
      ...(derivedFrom.length > 0 ? { derivedFrom } : {})
    };
  }

  return result;
}

export function convertSocialHistoryToFHIR(profile: Profile): FhirObservation[] {
  const patientId = toValidUuid(profile.id, 'patient');
  const subjectRef = { reference: `urn:uuid:${patientId}`, display: profile.name };
  const effectiveDateTime = profile.screeningCompletedAt || profile.createdAt || new Date().toISOString();
  const obsList: FhirObservation[] = [];

  if (profile.smokingStatus && profile.smokingStatus !== 'unknown') {
    const snomedSmokingMap: Record<string, { code: string; display: string }> = {
      current: { code: '449868002', display: 'Current every day smoker' },
      former: { code: '8517006', display: 'Former smoker' },
      never: { code: '266919005', display: 'Never smoked tobacco' }
    };
    const sInfo = snomedSmokingMap[profile.smokingStatus] || { code: '266919005', display: 'Never smoked tobacco' };

    obsList.push({
      resourceType: 'Observation',
      id: toValidUuid(`${profile.id}-smoking`, 'obs-smoking'),
      meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Observation'] },
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'social-history',
              display: 'Social History'
            }
          ]
        }
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: '72166-2', display: 'Tobacco smoking status' }],
        text: 'Status Merokok'
      },
      subject: subjectRef,
      effectiveDateTime,
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: sInfo.code,
            display: sInfo.display
          }
        ],
        text: profile.smokingStatus === 'current' ? 'Perokok Aktif' : profile.smokingStatus === 'former' ? 'Mantan Perokok' : 'Bukan Perokok'
      }
    });
  }

  if (profile.alcoholConsumption && profile.alcoholConsumption !== 'unknown') {
    const snomedAlcoholMap: Record<string, { code: string; display: string; text: string }> = {
      none: { code: '228274009', display: 'Lifetime non-drinker', text: 'Tidak Mengonsumsi' },
      occasional: { code: '228276006', display: 'Occasional drinker', text: 'Jarang / Kadang-kadang' },
      moderate: { code: '43783005', display: 'Moderate drinker', text: 'Moderat / Sedang' },
      heavy: { code: '160577002', display: 'Heavy drinker', text: 'Sering / Berat' }
    };
    const aInfo = snomedAlcoholMap[profile.alcoholConsumption] || {
      code: '228274009',
      display: 'Lifetime non-drinker',
      text: profile.alcoholConsumption
    };

    obsList.push({
      resourceType: 'Observation',
      id: toValidUuid(`${profile.id}-alcohol`, 'obs-alcohol'),
      meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Observation'] },
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'social-history',
              display: 'Social History'
            }
          ]
        }
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: '11331-6', display: 'History of Alcohol use' }],
        text: 'Riwayat Konsumsi Alkohol'
      },
      subject: subjectRef,
      effectiveDateTime,
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: aInfo.code,
            display: aInfo.display
          }
        ],
        text: aInfo.text
      }
    });
  }

  return obsList;
}

export function exportCompleteFHIRBundle(options: {
  profile?: Profile;
  readings?: BPReading[];
  labResults?: LabResult[];
  medications?: MedicationItem[];
  conditions?: ConditionItem[];
  familyHistory?: FamilyMemberHistoryItem[];
  immunizations?: ImmunizationItem[];
}): FHIRBundleResource {
  const {
    profile,
    readings = [],
    labResults = [],
    medications = [],
    conditions = [],
    familyHistory = [],
    immunizations = []
  } = options;

  const entries: FHIRBundleEntry[] = [];

  let patientRef: string;
  if (profile) {
    const patientResource = convertProfileToFHIR(profile);
    patientRef = `urn:uuid:${patientResource.id}`;
    entries.push({
      fullUrl: patientRef,
      resource: patientResource
    });

    // Anthropometry observations (Height, Weight, BMI)
    const anthro = convertAnthropometryToFHIR(profile);
    if (anthro.height) {
      entries.push({ fullUrl: `urn:uuid:${anthro.height.id}`, resource: anthro.height });
    }
    if (anthro.weight) {
      entries.push({ fullUrl: `urn:uuid:${anthro.weight.id}`, resource: anthro.weight });
    }
    if (anthro.bmi) {
      entries.push({ fullUrl: `urn:uuid:${anthro.bmi.id}`, resource: anthro.bmi });
    }

    // Social history observations (Smoking, Alcohol)
    const social = convertSocialHistoryToFHIR(profile);
    for (const s of social) {
      entries.push({ fullUrl: `urn:uuid:${s.id}`, resource: s });
    }
  } else {
    const defaultPatientId = toValidUuid('default-patient', 'patient');
    patientRef = `urn:uuid:${defaultPatientId}`;
    entries.push({
      fullUrl: patientRef,
      resource: {
        resourceType: 'Patient',
        id: defaultPatientId,
        meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
        active: true,
        name: [{ use: 'official', text: 'Patient' }]
      }
    });
  }

  for (const r of readings) {
    const res = convertReadingToFHIR(r, profile);
    res.subject.reference = patientRef;
    entries.push({
      fullUrl: `urn:uuid:${res.id}`,
      resource: res
    });
  }

  for (const l of labResults) {
    const obs = convertLabResultToFHIR(l, profile);
    for (const o of obs) {
      o.subject.reference = patientRef;
      entries.push({
        fullUrl: `urn:uuid:${o.id}`,
        resource: o
      });
    }
  }

  for (const m of medications) {
    const medRes = convertMedicationToFHIR(m, profile);
    medRes.subject.reference = patientRef;
    entries.push({
      fullUrl: `urn:uuid:${medRes.id}`,
      resource: medRes
    });
  }

  for (const c of conditions) {
    const condRes = convertConditionToFHIR(c, profile);
    condRes.subject.reference = patientRef;
    entries.push({
      fullUrl: `urn:uuid:${condRes.id}`,
      resource: condRes
    });
  }

  for (const f of familyHistory) {
    const fRes = convertFamilyHistoryToFHIR(f, profile);
    fRes.patient.reference = patientRef;
    entries.push({
      fullUrl: `urn:uuid:${fRes.id}`,
      resource: fRes
    });
  }

  for (const im of immunizations) {
    const immRes = convertImmunizationToFHIR(im, profile);
    immRes.patient.reference = patientRef;
    entries.push({
      fullUrl: `urn:uuid:${immRes.id}`,
      resource: immRes
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries
  };
}


