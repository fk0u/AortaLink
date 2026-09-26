# 🫀 AortaLink — Open-Source ML-Powered Electronic Health Record (EHR) Platform

[![HL7 FHIR R4](https://img.shields.io/badge/HL7%20FHIR-Release%204.0.1-brightgreen.svg)](https://hl7.org/fhir/R4/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)]()

> **AortaLink** (Aorta: *main arterial pathway distributing life*, Link: *clinical data interoperability*) is an open-source **Personal Electronic Health Record (EHR) & Clinical Decision Support System (CDSS)** built on **HL7 FHIR Version R4** standards. Designed for internal medicine precision, family multi-profile care, and **on-device machine learning** over the user's own health data — with **zero mock data and zero external AI dependencies**.

---

## 🌟 Key Architecture Highlights

- **HL7 FHIR Version R4 Standard**: Native data modeling mapping `Patient`, `Observation` (LOINC `85354-9` Vital Signs BP, `14927-8` Blood Urea, `2160-0` Serum Creatinine, `3084-1` Uric Acid), and `MedicationRequest` resources.
- **On-Device Clinical ML Engine** (`src/services/ml/`): pure TypeScript, deterministic, no network:
  - **Trend forecaster** — OLS regression over the user's readings with R² confidence and a 7-day 95% prediction band.
  - **Pattern detector** — white-coat effect, masked hypertension, morning surge, variability, weekend effect, each with disclosed group sizes and honest `not_enough_data` states.
  - **Adherence model** — logistic regression trained on-device (full-batch gradient descent) on labelled days: adherence × sodium × sleep × measurement frequency → odds ratios for BP control.
  - **Local assistant** — deterministic Q&A whose every answer cites the data sources it was computed from. No generative AI, no improvised conclusions, no API keys.
- **Real Sync, Not Fake Sync**: client↔server sync (Express + MongoDB Atlas) with per-record `updatedAt` stamping, merge-by-recency conflict resolution, and deletion tombstones — edits on two devices no longer silently overwrite each other, and deletions propagate.
- **Zero-Mock Data Policy**: no seeded readings, no fake telemetry, no fabricated AI fallbacks, no placeholder contacts. Every number in the UI traces back to data the user actually entered.
- **Circadian Rhythm & Nocturnal Dipping Calculator**: Automatic classification of blood pressure circadian profiles into *Dipper*, *Non-Dipper*, *Riser*, or *Extreme Dipper*.
- **White-Coat Syndrome Defense**: Dynamic vital measurement context modifier (`'Home' | 'Clinic/Hospital' | 'Post-Medication' | 'Stress'`) to filter clinical anomalies from daily home averages.
- **Bluetooth Tensimeter Pairing**: Web Bluetooth GATT Blood Pressure Profile (`0x1810` / `0x2A35`) with IEEE 11073-20601 SFLOAT decoding — readings flow in automatically, no typing.
- **Interactive FHIR Payload Inspector**: Real-time JSON inspector modal for inspecting raw HL7 FHIR R4 payloads and exporting FHIR Bundles.
- **Encrypted Backup**: AES-256-GCM + PBKDF2 `.albackup` exports protected by the user's own password, plus plain JSON backup/restore and clinical PDF reports.

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
- **EHR Engine & Storage**: Dexie.js v4 (IndexedDB, offline-first)
- **Backend**: Express 4 + MongoDB Atlas (JWT auth, bcrypt password hashing)
- **Clinical Standards**: HL7 FHIR Release 4 (JSON-LD) + LOINC + UCUM
- **Styling & UI**: Tailwind CSS v3 + Framer Motion v11 (Hallmark Aesthetic System)
- **Data Visualization**: Recharts v2
- **PDF Export**: jsPDF + AutoTable
- **ML Engine**: Pure TypeScript statistics — no external services

---

## 🚀 Deployment

### Local development

```bash
# Install dependencies
npm install

# Configure the backend (MongoDB Atlas URI + JWT secret)
cp .env.example .env   # then edit with YOUR credentials

# Start API server + dev client
npm run dev

# Run TypeScript type check
npm run lint

# Build production bundle
npm run build
```

### Environment variables

| Variable | Purpose |
| :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas connection string (server-side only — never expose to the browser) |
| `JWT_SECRET` | Token signing secret. Generate with `openssl rand -hex 64`. Without it the server uses an ephemeral random key and all sessions invalidate on restart. |

No AI provider keys are needed — the clinical assistant runs entirely on-device.

### Vercel

`vercel.json` serves the SPA and maps `/api/*` to the Express app as a serverless function. Set `MONGODB_URI` and `JWT_SECRET` in the Vercel project environment.

### Docker (frontend only)

The Dockerfile serves the static SPA via nginx — **it does not include the API server**, so login/sync/AI-proxy endpoints are unavailable in that mode unless you deploy `server/index.js` separately and proxy `/api` to it.

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt; legacy unsalted-SHA-256 accounts are transparently upgraded on login.
- Tokens are Bearer JWTs (no cookies); sessions are stored in `localStorage` — protect the app behind HTTPS in production.
- There is deliberately **no offline authentication**: accounts are created on the server only, so a session can always sync. Guests use an explicit, clearly-labeled local mode.
- Rotate any credentials that were ever committed to this repository's git history.

---

## 📄 License & Contribution

Distributed under the **MIT License**. See `LICENSE` for more information.

We welcome global open-source contributions! Read [`CONTRIBUTING.md`](CONTRIBUTING.md) to get started.
