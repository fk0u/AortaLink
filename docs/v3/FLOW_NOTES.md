# AortaLink — Notulensi Draft Flow (V 3.0, 1 Okt 2026)

> Source: `Notulensi Draft Flow AortaLink.docx` / [Google Doc](https://docs.google.com/document/d/1EGmHdRKn31xWXXW4bVWV4Z8Aa4se9GAU8xEehWnHU6g) (copied 2026-10-01 for future development). The Google Doc is the source of truth; re-read it if it may have changed.

## 1. Overview
AortaLink is an all-in-one platform for cardiovascular and aorta health education, disease prevention and hypertension management, built on **HL7 FHIR R4** for standardized exchange of cardiovascular and patient telemetry data.

## 2. Goals
- **Health education & prevention**: cardiovascular and aorta education and prevention tools.
- **Standardization**: onboarding screening and telemetry aligned with FHIR R4 resources.
- **Telemetry integration**: blood pressure (BP) via Bluetooth device sync and manual entry.
- **AI diagnostics**: AI/ML diagnostic summary plus a personalized **AortaLink Health Score**.
- **Clinical guidelines**: ACC, AHA and ESC/ESH guidelines for hypertension stratification, aortic disease management (aortic dissection, TAA, AAA) and decision pathways.

### Architecture components
1. User access & authentication (registration/login)
2. Health Screening Engine: onboarding metrics, lifestyle, history and vaccination, mapped to FHIR R4
3. Telemetry Sync: Bluetooth digital sphygmomanometer plus manual input
4. AI Processing Core: diagnostic summary and Health Score engine
5. Positioning: a digital companion (*aplikasi pendamping*) for patients, doctors and practitioners that complements, never replaces, professionals
6. Knowledge Base & Multi-Tier Guidance: complication studies, non-pharmacological, pharmacological and complementary therapy guidance, plus a web-crawling ingestion pipeline
7. International Guidelines Framework (ACC, AHA, ESC/ESH)

## 3. User Flow v3.0
| Step | Stage | Description | Artifacts / Standards |
|---|---|---|---|
| 01 | User Access | Landing/home page with features and education overview | Landing Page, Feature Catalog |
| 02 | Auth Flow | Register / login | OAuth2 / Registration Module |
| 03 | Onboarding Health Screening | Height, weight, BMI, lifestyle, medical history, vaccination | FHIR R4: Patient, Observation, FamilyMemberHistory, Condition, Immunization |
| 04 | BP Measurement & Telemetry | Bluetooth auto sync or manual entry | Bluetooth telemetry, manual form |
| 05 | AI Processing & Health Score | Diagnostic summary and AortaLink Health Score | AI/ML inference, Health Score model |
| 06 | Post-Diagnostic Engagement | Personalized recommendations, therapy guidelines, care routing | Care Routing Module |
| 07 | Knowledge Base & Multi-Tier Guidance | Complication studies, therapy guidance; content from developer datasets and crawling | Knowledge Base, Crawling Pipeline |

Details:
- **Onboarding**: weight and height with automatic BMI; family history, smoking, alcohol, diet, past conditions, vaccination.
- **BP**: Option A Bluetooth auto sync, Option B manual input.
- **Step 7**:
  - Complications module covering recovery and long-term management.
  - Multi-tier guidance: non-pharmacological (lifestyle, diet, exercise, stress), pharmacological (medication reference, adherence tracking, monitoring) and complementary (evidence-based).
  - Content comes from curated developer datasets plus automated web-crawling ingestion.

## 4. Next actions & open questions
- Define Step 7 details: post-diagnostic engagement, knowledge base, complication studies, multi-tier therapy guidance.
- Finalize the Bluetooth tensimeter integration spec and the manual-input fallback protocol.
- Validate the FHIR R4 profile mapping for onboarding attributes (Patient, Observation, Condition, Immunization).
- Scope future iterations of the Health Score AI model.

**Decisions from meetings**
- Internal pipeline messaging is standardized entirely on FHIR R4 JSON payloads, and legacy intermediate representations are deprecated.
- Open source: before public release, the repo will be partitioned into `/core` engine and `/connectors` modules.

## 5. Glossary / research keywords
- **Nyeri Dada Akut** (acute chest pain): the top-priority symptom, needing triage, risk stratification and an emergency protocol.
- **Diseksi Aorta** (aortic dissection): a vascular emergency and the target of the core diagnostic pathways; needs specialized medical data crawling.
- **Sistematis Rekomendasi**: structured guideline and recommendation pipelines behind the multi-tier protocols.
- **Autoimun**: autoimmune and inflammatory vascular etiologies, for advanced risk-assessment literature.
- **Laboratorium Test**: biomarker panel (D-dimer, Troponin) mapped for FHIR R4 diagnostic ingestion.
- **Imaging**: CTA, echocardiogram and X-ray for confirming aortic pathology.
- **Rekomendasi Diagnosis Work Up**: diagnostic workflow recommendations driving decision pathways and care routing.
- **ACC/AHA** and **ESC/ESH** clinical guidelines.

## Relevance to the Aorta audit
- The FHIR R4 JSON-only pipeline decision makes audit findings P1-7 and P1-8 (invalid FHIR export, wrong LOINC codes) blockers, not polish.
- Onboarding needs new FHIR resources (FamilyMemberHistory, Condition, Immunization) that the Dexie schema does not have yet.
- Step 04 Bluetooth: audit P1-6 (SFLOAT special values, hardcoded position/arm) must be fixed before the integration spec is final.
- Guidelines: audit P2-7 (classifier claims "AHA/WHO" but uses ACC/AHA 130/80) lines up with the ACC/AHA vs ESC/ESH framework; make the guideline selectable.
