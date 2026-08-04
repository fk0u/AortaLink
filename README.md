# 🫀 AortaLink — Open-Source AI-Powered Electronic Health Record (EHR) Platform

[![HL7 FHIR R4](https://img.shields.io/badge/HL7%20FHIR-Release%204.0.1-brightgreen.svg)](https://hl7.org/fhir/R4/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)]()
[![Docker Ready](https://img.shields.io/badge/Docker-Production%20Ready-blue)](docker-compose.yml)

> **AortaLink** (Aorta: *main arterial pathway distributing life*, Link: *clinical data interoperability*) is an open-source, enterprise-grade **Personal Electronic Health Record (EHR) & Clinical Decision Support System (CDSS)** built on **HL7 FHIR Version R4** standards. Designed for internal medicine precision, multi-tenant patient care, and AI-driven clinical trend prediction.

---

## 🌟 Key Architecture Highlights

- **HL7 FHIR Version R4 Standard**: Native data modeling mapping `Patient`, `Observation` (LOINC `85354-9` Vital Signs BP, `14927-8` Blood Urea, `2160-0` Serum Creatinine, `3084-1` Uric Acid), and `MedicationRequest` resources.
- **AI Clinical Decision Support System (CDSS)**: Embedded `ClinicalSummarizer` and `PredictiveAlert` engines generating structured physician prompts, cardiovascular risk evaluation, and anomaly flags.
- **Circadian Rhythm & Nocturnal Dipping Calculator**: Automatic classification of blood pressure sirkadian profiles into *Dipper*, *Non-Dipper*, *Riser*, or *Extreme Dipper*.
- **White-Coat Syndrome Defense**: Dynamic vital measurement context modifier (`'Home' | 'Clinic/Hospital' | 'Post-Medication' | 'Stress'`) to filter clinical anomalies from daily home averages.
- **Combination Therapy Regimen Tracking**: Timestamped tracking for combination drug therapy (Amlodipine 5mg CCB, Candesartan 8mg ARB, Allopurinol 100mg Anti-gout).
- **Interactive FHIR Payload Inspector**: Real-time JSON inspector modal for inspecting raw HL7 FHIR R4 payloads and exporting FHIR Bundles.
- **Production Dockerization**: Containerized with Nginx Alpine and multi-stage Docker build ready for instant cloud or local deployment.

---

## 📊 HL7 FHIR R4 Resource Mapping

| Resource Type | LOINC / System Code | Description |
| :--- | :--- | :--- |
| `Patient` | SMART on FHIR | Multi-tenant profile & user authentication foundation |
| `Observation` (Vitals) | `85354-9` | Blood pressure panel (Systolic `8480-6`, Diastolic `8462-4`, Heart Rate `8867-4`) |
| `Observation` (Lab) | `14927-8` | Blood Urea / Ureum Darah (mg/dL) |
| `Observation` (Lab) | `2160-0` | Serum Creatinine / Kreatinin Darah (mg/dL) |
| `Observation` (Lab) | `3084-1` | Blood Uric Acid / Asam Urat Darah (mg/dL) |
| `MedicationRequest` | RxNorm / Custom | Timestamped combination drug therapy regimen |

---

## 🛠️ Technology Stack

- **Core Framework**: React 19 + TypeScript 5.6
- **Bundler & Build Tool**: Rsbuild v2 (Rspack engine)
- **EHR Engine & Storage**: Dexie.js v4 (IndexedDB with dynamic JSONB FHIR stores)
- **Clinical Standards**: HL7 FHIR Release 4 (JSON-LD) + LOINC + UCUM
- **Styling & UI**: Tailwind CSS v3 + Framer Motion v11 (Hallmark Aesthetic System)
- **Data Visualization**: Recharts v2
- **PDF Export**: jsPDF + AutoTable
- **Deployment**: Docker + Docker Compose + Nginx Alpine

---

## 🚀 Instant Docker Deployment

Run AortaLink instantly using Docker Compose:

```bash
# Clone repository
git clone https://github.com/fk0u/HeartSync.git
cd HeartSync

# Launch production container
docker-compose up -d --build
```

Access the application in your browser at `http://localhost:8173` or `http://localhost:80`.

---

## 💻 Local Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript type check
npm run lint

# Build production bundle
npm run build
```

---

## 🤖 AI CDSS Architecture Scaffolding

The AI Clinical Decision Support System is scaffolded under `src/services/ai/`:

- `clinical-summarizer.ts`: Converts FHIR R4 Observation & MedicationRequest bundles into structured prompts for LLM providers (e.g. Gemini / OpenAI).
- `predictive-alert.ts`: Detects longitudinal trend anomalies in nocturnal dipping, hyperuricemia (> 7.0 mg/dL), and hypertensive crisis.
- `cdss-engine.ts`: Unified pipeline for CDSS patient assessment.

---

## 📄 License & Contribution

Distributed under the **MIT License**. See `LICENSE` for more information.

We welcome global open-source contributions! Read [`CONTRIBUTING.md`](CONTRIBUTING.md) to get started.
