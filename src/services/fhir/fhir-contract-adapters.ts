/**
 * HL7 FHIR R4 System Boundary Contract Adapters
 *
 * Implements ADR 002 (docs/v3/ADR_FHIR_INTERNAL_CONTRACT.md).
 * Provides standardized bidirectional conversion between Dexie.js local flat entities
 * and HL7 FHIR R4 JSON resources across system boundaries (Cloud Sync, Export/Import, Connectors).
 */

import type {
  Profile,
  BPReading,
  LabResult,
  MedicationItem,
  ConditionItem,
  FamilyMemberHistoryItem,
  ImmunizationItem,
  FhirPatient,
  FhirObservation,
  FhirMedicationRequest,
  FhirCondition,
  FhirFamilyMemberHistory,
  FhirImmunization
} from '../../types/blood-pressure.ts';

import {
  toValidUuid,
  convertProfileToFHIR,
  profileFromFHIR,
  convertReadingToFHIR,
  readingFromFHIR,
  convertLabResultToFHIR,
  labResultFromFHIR,
  convertMedicationToFHIR,
  medicationFromFHIR,
  convertConditionToFHIR,
  conditionFromFHIR,
  convertFamilyHistoryToFHIR,
  familyHistoryFromFHIR,
  convertImmunizationToFHIR,
  immunizationFromFHIR,
  convertAnthropometryToFHIR,
  convertSocialHistoryToFHIR,
  type FHIRBundleResource,
  type FHIRBundleEntry
} from './fhir-exporter.ts';

export interface ClinicalEntitiesSnapshot {
  profiles?: Profile[];
  readings?: BPReading[];
  labResults?: LabResult[];
  medications?: MedicationItem[];
  conditions?: ConditionItem[];
  familyHistory?: FamilyMemberHistoryItem[];
  immunizations?: ImmunizationItem[];
}

/**
 * Extract target UUID string from a reference like "urn:uuid:abc-123" or "Patient/abc-123".
 */
export function extractRefUuid(ref?: string): string | null {
  if (!ref || typeof ref !== 'string') return null;
  if (ref.startsWith('urn:uuid:')) {
    return ref.replace('urn:uuid:', '').toLowerCase();
  }
  const parts = ref.split('/');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Parse anthropometry and social history observations back into profile attributes.
 */
export function anthropometryAndSocialHistoryFromFHIR(observations: FhirObservation[]): Partial<Profile> {
  const result: Partial<Profile> = {};

  for (const obs of observations) {
    if (!obs || obs.resourceType !== 'Observation' || !obs.code?.coding) continue;

    for (const coding of obs.code.coding) {
      // LOINC 8302-2: Body height
      if (coding.code === '8302-2' && obs.valueQuantity?.value !== undefined) {
        result.heightCm = obs.valueQuantity.value;
      }
      // LOINC 29463-7: Body weight
      else if (coding.code === '29463-7' && obs.valueQuantity?.value !== undefined) {
        result.weightKg = obs.valueQuantity.value;
      }
      // LOINC 39156-5: BMI
      else if (coding.code === '39156-5' && obs.valueQuantity?.value !== undefined) {
        result.bmi = obs.valueQuantity.value;
      }
      // LOINC 72166-2: Tobacco smoking status
      else if (coding.code === '72166-2' && obs.valueCodeableConcept?.coding) {
        for (const c of obs.valueCodeableConcept.coding) {
          if (c.code === '449868002') result.smokingStatus = 'current';
          else if (c.code === '8517006') result.smokingStatus = 'former';
          else if (c.code === '266919005') result.smokingStatus = 'never';
        }
      }
      // LOINC 11331-6: Alcohol consumption
      else if (coding.code === '11331-6' && obs.valueCodeableConcept?.coding) {
        for (const c of obs.valueCodeableConcept.coding) {
          if (c.code === '228274009') result.alcoholConsumption = 'none';
          else if (c.code === '228276006') result.alcoholConsumption = 'occasional';
          else if (c.code === '43783005') result.alcoholConsumption = 'moderate';
          else if (c.code === '160577002') result.alcoholConsumption = 'heavy';
        }
      }
    }
  }

  return result;
}

/**
 * Compile all local clinical entities into a unified HL7 FHIR R4 Bundle.
 */
export function entitiesToFhirBundle(snapshot: ClinicalEntitiesSnapshot): FHIRBundleResource {
  const {
    profiles = [],
    readings = [],
    labResults = [],
    medications = [],
    conditions = [],
    familyHistory = [],
    immunizations = []
  } = snapshot;

  const entries: FHIRBundleEntry[] = [];
  const profileIdToUuid = new Map<string, string>();

  // 1. Process Profiles -> Patient + Anthropometry + Social History Observations
  for (const prof of profiles) {
    const patientResource = convertProfileToFHIR(prof);
    const patientUuid = patientResource.id;
    profileIdToUuid.set(prof.id, patientUuid);
    const patientRef = `urn:uuid:${patientUuid}`;

    entries.push({
      fullUrl: patientRef,
      resource: patientResource
    });

    const anthro = convertAnthropometryToFHIR(prof);
    if (anthro.height) {
      anthro.height.subject = { reference: patientRef, display: prof.name };
      entries.push({ fullUrl: `urn:uuid:${anthro.height.id}`, resource: anthro.height });
    }
    if (anthro.weight) {
      anthro.weight.subject = { reference: patientRef, display: prof.name };
      entries.push({ fullUrl: `urn:uuid:${anthro.weight.id}`, resource: anthro.weight });
    }
    if (anthro.bmi) {
      anthro.bmi.subject = { reference: patientRef, display: prof.name };
      entries.push({ fullUrl: `urn:uuid:${anthro.bmi.id}`, resource: anthro.bmi });
    }

    const social = convertSocialHistoryToFHIR(prof);
    for (const s of social) {
      s.subject = { reference: patientRef, display: prof.name };
      entries.push({ fullUrl: `urn:uuid:${s.id}`, resource: s });
    }
  }

  // Fallback default patient reference if no profiles supplied
  const defaultPatientUuid = toValidUuid('default-patient', 'patient');
  const defaultPatientRef = `urn:uuid:${defaultPatientUuid}`;
  if (profiles.length === 0) {
    entries.push({
      fullUrl: defaultPatientRef,
      resource: {
        resourceType: 'Patient',
        id: defaultPatientUuid,
        meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
        active: true,
        name: [{ use: 'official', text: 'Patient' }]
      }
    });
  }

  const getPatientRef = (profileId?: string): string => {
    if (profileId && profileIdToUuid.has(profileId)) {
      return `urn:uuid:${profileIdToUuid.get(profileId)}`;
    }
    return profiles.length > 0 && profiles[0].id && profileIdToUuid.has(profiles[0].id)
      ? `urn:uuid:${profileIdToUuid.get(profiles[0].id)}`
      : defaultPatientRef;
  };

  // 2. Readings -> Observations (LOINC 85354-9)
  for (const r of readings) {
    const matchingProfile = profiles.find((p) => p.id === r.profileId);
    const obs = convertReadingToFHIR(r, matchingProfile);
    obs.subject.reference = getPatientRef(r.profileId);
    entries.push({
      fullUrl: `urn:uuid:${obs.id}`,
      resource: obs
    });
  }

  // 3. Lab Results -> Observations
  for (const l of labResults) {
    const matchingProfile = profiles.find((p) => p.id === l.profileId);
    const labObsList = convertLabResultToFHIR(l, matchingProfile);
    const ref = getPatientRef(l.profileId);
    for (const o of labObsList) {
      o.subject.reference = ref;
      entries.push({
        fullUrl: `urn:uuid:${o.id}`,
        resource: o
      });
    }
  }

  // 4. Medications -> MedicationRequests
  for (const m of medications) {
    const matchingProfile = profiles.find((p) => p.id === m.profileId);
    const medRes = convertMedicationToFHIR(m, matchingProfile);
    medRes.subject.reference = getPatientRef(m.profileId);
    entries.push({
      fullUrl: `urn:uuid:${medRes.id}`,
      resource: medRes
    });
  }

  // 5. Conditions -> Conditions (ICD-10 + SNOMED CT)
  for (const c of conditions) {
    const matchingProfile = profiles.find((p) => p.id === c.profileId);
    const condRes = convertConditionToFHIR(c, matchingProfile);
    condRes.subject.reference = getPatientRef(c.profileId);
    entries.push({
      fullUrl: `urn:uuid:${condRes.id}`,
      resource: condRes
    });
  }

  // 6. Family History -> FamilyMemberHistory
  for (const f of familyHistory) {
    const matchingProfile = profiles.find((p) => p.id === f.profileId);
    const fRes = convertFamilyHistoryToFHIR(f, matchingProfile);
    fRes.patient.reference = getPatientRef(f.profileId);
    entries.push({
      fullUrl: `urn:uuid:${fRes.id}`,
      resource: fRes
    });
  }

  // 7. Immunizations -> Immunization
  for (const im of immunizations) {
    const matchingProfile = profiles.find((p) => p.id === im.profileId);
    const immRes = convertImmunizationToFHIR(im, matchingProfile);
    immRes.patient.reference = getPatientRef(im.profileId);
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

/**
 * Parse an HL7 FHIR R4 Bundle into local Dexie.js flat entities.
 */
export function fhirBundleToEntities(bundle: FHIRBundleResource): ClinicalEntitiesSnapshot {
  if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
    return {
      profiles: [],
      readings: [],
      labResults: [],
      medications: [],
      conditions: [],
      familyHistory: [],
      immunizations: []
    };
  }

  const profilesMap = new Map<string, Profile>();
  const anthroObsByPatient = new Map<string, FhirObservation[]>();
  const readings: BPReading[] = [];
  const labObsByPatientAndDate = new Map<string, FhirObservation[]>();
  const medications: MedicationItem[] = [];
  const conditions: ConditionItem[] = [];
  const familyHistory: FamilyMemberHistoryItem[] = [];
  const immunizations: ImmunizationItem[] = [];

  // Pass 1: Extract Patients
  for (const entry of bundle.entry) {
    const res = entry.resource;
    if (!res) continue;

    if (res.resourceType === 'Patient') {
      const patient = res as FhirPatient;
      const partialProfile = profileFromFHIR(patient);
      const profileId = patient.id || toValidUuid(`prof-${profilesMap.size + 1}`, 'patient');
      const profile: Profile = {
        id: profileId,
        name: partialProfile.name || 'Pasien',
        relationship: 'self',
        avatar: 'user',
        gender: partialProfile.gender || 'other',
        age: partialProfile.age,
        targetSystolic: 120,
        targetDiastolic: 80,
        isDefault: profilesMap.size === 0,
        createdAt: new Date().toISOString()
      };
      profilesMap.set(profileId, profile);
    }
  }

  // Helper to resolve profileId from a subject/patient reference
  const resolveProfileId = (ref?: string): string => {
    const uuid = extractRefUuid(ref);
    if (uuid && profilesMap.has(uuid)) {
      return uuid;
    }
    // If not found by direct id, check first profile
    const first = profilesMap.values().next().value;
    return first ? first.id : (uuid || 'default-patient');
  };

  // Pass 2: Extract Clinical Resources & Observations
  for (const entry of bundle.entry) {
    const res = entry.resource;
    if (!res) continue;

    switch (res.resourceType) {
      case 'Observation': {
        const obs = res as FhirObservation;
        const code = obs.code?.coding?.[0]?.code;
        const pId = resolveProfileId(obs.subject?.reference);

        // Anthropometry & Social History LOINCs
        if (code && ['8302-2', '29463-7', '39156-5', '72166-2', '11331-6'].includes(code)) {
          if (!anthroObsByPatient.has(pId)) anthroObsByPatient.set(pId, []);
          anthroObsByPatient.get(pId)!.push(obs);
          break;
        }

        // Blood Pressure Panel LOINC 85354-9 or components
        const hasBpComponents = Array.isArray(obs.component) && obs.component.some((c) =>
          c.code?.coding?.some((cod) => cod.code === '8480-6' || cod.code === '8462-4')
        );

        if (code === '85354-9' || hasBpComponents) {
          const reading = readingFromFHIR(obs);
          reading.profileId = pId;
          readings.push(reading);
          break;
        }

        // Lab Observations (Category laboratory or specific LOINCs)
        const isLabCategory = obs.category?.some((cat) =>
          cat.coding?.some((c) => c.code === 'laboratory')
        );
        const labCodes = ['3091-6', '2160-0', '2093-3', '13457-7', '2085-9', '2571-8', '2345-7', '4548-4', '48065-7', '6598-7'];
        if (isLabCategory || (code && labCodes.includes(code))) {
          const groupKey = `${pId}::${obs.effectiveDateTime?.slice(0, 10) || 'default'}`;
          if (!labObsByPatientAndDate.has(groupKey)) labObsByPatientAndDate.set(groupKey, []);
          labObsByPatientAndDate.get(groupKey)!.push(obs);
        }
        break;
      }

      case 'MedicationRequest': {
        const medReq = res as FhirMedicationRequest;
        const partialMed = medicationFromFHIR(medReq);
        const pId = resolveProfileId(medReq.subject?.reference);
        const medId = medReq.id && /^\d+$/.test(medReq.id) ? Number(medReq.id) : (medications.length + 1);
        medications.push({
          id: medId,
          profileId: pId,
          name: partialMed.name || 'Obat',
          dosage: partialMed.dosage || '1 tablet',
          schedule: partialMed.schedule || 'pagi',
          purpose: partialMed.purpose || 'Hipertensi',
          drugClass: partialMed.drugClass || 'Antihipertensi',
          createdAt: medReq.meta?.lastUpdated || new Date().toISOString()
        } as MedicationItem);
        break;
      }

      case 'Condition': {
        const cond = res as FhirCondition;
        const condItem = conditionFromFHIR(cond);
        condItem.profileId = resolveProfileId(cond.subject?.reference);
        conditions.push(condItem);
        break;
      }

      case 'FamilyMemberHistory': {
        const fam = res as FhirFamilyMemberHistory;
        const famItem = familyHistoryFromFHIR(fam);
        famItem.profileId = resolveProfileId(fam.patient?.reference);
        familyHistory.push(famItem);
        break;
      }

      case 'Immunization': {
        const imm = res as FhirImmunization;
        const immItem = immunizationFromFHIR(imm);
        immItem.profileId = resolveProfileId(imm.patient?.reference);
        immunizations.push(immItem);
        break;
      }

      default:
        break;
    }
  }

  // Pass 3: Fold Anthropometry and Social History into Profiles
  for (const [pId, obsList] of anthroObsByPatient.entries()) {
    const profile = profilesMap.get(pId);
    if (profile) {
      const extra = anthropometryAndSocialHistoryFromFHIR(obsList);
      Object.assign(profile, extra);
    }
  }

  // Pass 4: Fold Lab Observations into LabResult items
  let labIndex = 1;
  const labResults: LabResult[] = [];
  for (const [groupKey, obsList] of labObsByPatientAndDate.entries()) {
    const [pId] = groupKey.split('::');
    const lab = labResultFromFHIR(obsList);
    lab.id = labIndex++;
    lab.profileId = pId;
    labResults.push(lab);
  }

  return {
    profiles: Array.from(profilesMap.values()),
    readings,
    labResults,
    medications,
    conditions,
    familyHistory,
    immunizations
  };
}

/**
 * Universal table adapter map for direct entity-level conversions.
 */
export const fhirTableAdapters = {
  profiles: {
    toFhir: convertProfileToFHIR,
    fromFhir: profileFromFHIR
  },
  readings: {
    toFhir: convertReadingToFHIR,
    fromFhir: readingFromFHIR
  },
  labResults: {
    toFhir: convertLabResultToFHIR,
    fromFhir: labResultFromFHIR
  },
  medications: {
    toFhir: convertMedicationToFHIR,
    fromFhir: medicationFromFHIR
  },
  conditions: {
    toFhir: convertConditionToFHIR,
    fromFhir: conditionFromFHIR
  },
  familyHistory: {
    toFhir: convertFamilyHistoryToFHIR,
    fromFhir: familyHistoryFromFHIR
  },
  immunizations: {
    toFhir: convertImmunizationToFHIR,
    fromFhir: immunizationFromFHIR
  }
};
