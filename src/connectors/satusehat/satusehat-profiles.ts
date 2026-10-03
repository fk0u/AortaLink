/**
 * URLs untuk FHIR Profiles yang dipersyaratkan oleh SATUSEHAT.
 * Sumber: SATUSEHAT Implementation Guide
 */
export const SATUSEHAT_PROFILES = {
  Patient: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Patient',
  Organization: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Organization',
  Location: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Location',
  Encounter: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Encounter',
  Condition: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Condition',
  Observation: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Observation',
  Medication: 'https://fhir.kemkes.go.id/r4/StructureDefinition/Medication',
  MedicationRequest: 'https://fhir.kemkes.go.id/r4/StructureDefinition/MedicationRequest',
};

export const SATUSEHAT_IDENTIFIER_SYSTEMS = {
  NIK: 'https://fhir.kemkes.go.id/id/nik',
  IHS_NUMBER: 'https://fhir.kemkes.go.id/id/ihs-number',
};
