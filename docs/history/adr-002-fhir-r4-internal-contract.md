# ADR 002: Standarisasi Kontrak Data Internal & Batas Modul Berbasis HL7 FHIR R4 JSON

- **Status**: Accepted
- **Tanggal**: 2026-10-03
- **Penulis**: Lead Systems Architect & Core Maintainers
- **Dokumentasi Lengkap**: Lihat [`../v3/ADR_FHIR_INTERNAL_CONTRACT.md`](../v3/ADR_FHIR_INTERNAL_CONTRACT.md)

## Summary
AortaLink v3.0 menstandarkan seluruh pertukaran data lintas batas sistem (Sync Cloud MongoDB Atlas, Ekspor/Impor berkas, Konektor SATUSEHAT, dan pipeline AI) menggunakan payload HL7 FHIR R4 JSON resmi (Patient, Observation, MedicationRequest, Condition, FamilyMemberHistory, Immunization).

Tabel lokal Dexie.js tetap terindeks datar untuk efisiensi kueri UI lokal, sedangkan tabel intermediate redundan warisan (`fhirPatients`, `fhirObservations`, `fhirMedicationRequests`, `fhirMedicationStatements`) didepresiasi dan dihapus pada skema Dexie v12.
