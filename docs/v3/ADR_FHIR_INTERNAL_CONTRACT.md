# ADR 002: Standarisasi Kontrak Data Internal & Batas Modul Berbasis HL7 FHIR R4 JSON

- **Status**: Accepted
- **Tanggal**: 2026-10-03
- **Penulis**: Lead Systems Architect & Core Maintainers
- **Terkait**: Issue #12 (`[v3.0] Kontrak data internal FHIR R4 JSON`), [FLOW_NOTES.md](./FLOW_NOTES.md), [RESEARCH_ANALYSIS.md](./RESEARCH_ANALYSIS.md#34-fhir-r4-json-only-pipeline)

---

## 1. Konteks & Problem Statement

Notulensi AortaLink v3.0 ([`FLOW_NOTES.md`](./FLOW_NOTES.md)) menetapkan keputusan strategis:
> *"Semua pesan pipeline internal distandardisasi sepenuhnya pada payload HL7 FHIR R4 JSON, dan representasi intermediate warisan (legacy) didepresiasi."*

Pada implementasi sebelumnya (v1–v2):
1. **Representasi Intermediate Ganda:** Terdapat tabel Dexie tiruan (`fhirPatients`, `fhirObservations`, `fhirMedicationRequests`, `fhirMedicationStatements`) yang dibuat pada skema v6, namun tidak pernah disinkronkan secara konsisten saat pengguna menambah tensi, obat, atau kondisi klinis baru di UI.
2. **Ketergantungan Struktur Flat:** Query UI Dexie.js (`useLiveQuery`) mengandalkan tabel datar (`readings`, `profiles`, `medications`, `conditions`, `labResults`) dengan indeks komposit untuk latensi render sub-milidetik. Mengubah penyimpanan lokal Dexie secara total menjadi hierarki resource FHIR R4 murni akan menurunkan performa query filtering/sorting serta memaksa refactoring masif pada seluruh layar antarmuka.
3. **Kebutuhan Interoperabilitas Nyata:** Standar nasional SATUSEHAT (Permenkes 24/2022) dan interoperabilitas HIE/EHR menuntut seluruh data yang keluar/masuk sistem berupa resource HL7 FHIR R4 valid tanpa ekstensi kosong atau kode terminologi sembarangan (audit P1-7, P1-8).

---

## 2. Decision Drivers

- **Kepatuhan FHIR R4 Mutlak:** Seluruh pertukaran data lintas batas sistem (Sync Cloud, Ekspor/Impor berkas, Konektor SATUSEHAT, pipeline ML/AI) wajib menggunakan payload HL7 FHIR R4 JSON standar.
- **Performa UI Tanpa Penurunan:** Penyimpanan lokal IndexedDB (Dexie) tetap memakai struktur data terindeks datar agar operasional offline-first dan reaktivitas komponen tetap instan (<5ms).
- **Eliminasi Stale Cache & Duplikasi:** Menghapus tabel intermediate lokal yang redundan (`fhirPatients`, `fhirObservations`, `fhirMedicationRequests`, `fhirMedicationStatements`). Resource FHIR dihasilkan secara deterministik on-demand melalui adapter resmi.
- **Backward & Dual-Stack Compatibility:** Cloud sync server dan client mendukung FHIR R4 Bundle secara penuh dengan fallback format transisi agar migrasi multi-perangkat berjalan mulus tanpa data loss.

---

## 3. Keputusan Arsitektur

Diputuskan untuk menerapkan **Pola Adapter Batas Sistem (System Boundary Adapters) berbasis HL7 FHIR R4 JSON**:

```
+-------------------------------------------------------------------------+
|                        AortaLink Local Core (PWA)                      |
|                                                                         |
|  +-----------------------+                 +-------------------------+  |
|  |   UI & React Hooks    |                 |   Dexie IndexedDB v12   |  |
|  | (useProfiles, liveQ)  | <=============> |  (readings, profiles,   |  |
|  +-----------------------+   Flat Index    |   conditions, meds...)  |  |
|                                            +-------------------------+  |
|                                                         ^               |
|                                                         | Local Models  |
|                                                         v               |
|                      +---------------------------------------+          |
|                      |  Canonical FHIR R4 Contract Adapters  |          |
|                      | (toFhir / fromFhir / Bundle Mappers)  |          |
|                      +---------------------------------------+          |
+------------------------------------------+------------------------------+
                                           |
               Boundary Payload: Standard  |  HL7 FHIR R4 JSON Bundle
               (Patient, Observation,      |  Condition, FamilyMemberHistory,
               MedicationRequest, Imm...)  |  DiagnosticReport, etc.
                                           v
+-------------------------------------------------------------------------+
|                           Boundary Targets                              |
|                                                                         |
|  1. Cloud Sync (MongoDB Atlas / Express /api/sync/push & pull)          |
|  2. FHIR R4 Bundle File Export & Import (.json)                         |
|  3. Future /connectors/satusehat (SATUSEHAT Kemenkes RME)              |
|  4. Clinical AI / Health Score Engine Ingestion Pipeline                |
+-------------------------------------------------------------------------+
```

### Rincian Implementasi:

1. **Adapter Dua Arah per Entitas Klinis (`src/services/fhir/fhir-contract-adapters.ts`):**
   - `Profile` ⟷ `Patient` (LOINC/RFC 4122 UUID, identifier, gender, birthDate, official name)
   - `BPReading` ⟷ `Observation` (Vital Signs BP Profile LOINC `85354-9`, systolic `8480-6`, diastolic `8462-4`, heart rate `8867-4`)
   - `LabResult` ⟷ `Observation[]` (LOINC lab panel: ureum `3091-6`, kreatinin `2160-0`, lipid panel, HbA1c, D-dimer, troponin)
   - `Profile` (Tinggi, Berat, BMI, Merokok, Alkohol) ⟷ `Observation[]` (LOINC `8302-2`, `29463-7`, `39156-5`, `72166-2`, `11331-6`)
   - `MedicationItem` ⟷ `MedicationRequest` (Status active, intent order, dosage, timing; pelacakan status stopped/selesai direncanakan pada iterasi medication management v3.1)
   - `ConditionItem` ⟷ `Condition` (Category problem-list-item/comorbidity, ICD-10-WHO + SNOMED CT)
   - `FamilyMemberHistoryItem` ⟷ `FamilyMemberHistory` (Relationship SNOMED CT, condition ICD-10)
   - `ImmunizationItem` ⟷ `Immunization` (CDC CVX vaccine coding)

2. **Bundle Pipeline Contract:**
   - Seluruh data klinis dikompilasi menjadi satu `FHIRBundleResource` (`resourceType: 'Bundle'`, `type: 'collection'`) dengan `fullUrl: urn:uuid:<rfc4122>` valid.
   - Fungsi `entitiesToFhirBundle()` dan `fhirBundleToEntities()` menyediakan serialisasi dan deserialisasi round-trip lengkap.

3. **Cloud Sync Protocol:**
   - **`POST /api/sync/push`:** Mengirim payload berstruktur `{ fhirBundle, appState, tombstones }`. Server memvalidasi struktur FHIR Bundle dan menyimpan resource ke database. Field legacy tetap disediakan untuk backward compatibility.
   - **`GET /api/sync/pull`:** Server mengembalikan response berisi `{ success: true, fhirBundle, appState, tombstones, data }`. Klien memprioritaskan pemulihan melalui adapter `fhirBundleToEntities()`.

4. **Depresiasi Tabel Intermediate Dexie (Skema v12):**
   - Menghapus tabel `fhirPatients`, `fhirObservations`, `fhirMedicationRequests`, `fhirMedicationStatements` dari Dexie v12 (`stores({ ...: null })`).
   - Kode penghapusan cascading profil dan sync dibersihkan dari referensi tabel intermediate tersebut.

---

## 4. Konsekuensi

### Positif:
- **Zero Ambiguity:** Satu-satunya kontrak data standar untuk pertukaran data adalah HL7 FHIR R4 JSON.
- **Ekspor/Impor Langsung Interoperabel:** Berkas backup JSON menyertakan canonical FHIR R4 Bundle di bawah properti `fhirBundle` yang dapat diekstrak dan divalidasi langsung oleh validator resmi HL7 FHIR (`$validate`), serta didukung impor langsung berkas FHIR R4 Bundle mandiri.
- **Penyimpanan Lokal Efisien:** Indeks Dexie tetap ramping dan cepat tanpa beban duplikasi data ke tabel tiruan.
- **Kesiapan Modul `/core` & `/connectors`:** Menjamin pemisahan bersih antara logika inti domain dan konektor eksternal (Issue #22 & #24).

### Netral / Trade-off:
- Perlu proses mapping adapter saat sinkronisasi cloud atau ekspor, namun beban komputasi di sisi klien sangat kecil (<10ms untuk ribuan rekor).
