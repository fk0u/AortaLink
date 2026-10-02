# 🫀 AortaLink — Cardiovascular & Aorta Health Companion

[![HL7 FHIR R4](https://img.shields.io/badge/HL7%20FHIR-R4-brightgreen.svg)](https://hl7.org/fhir/R4/)
[![Roadmap v3.0](https://img.shields.io/badge/roadmap-v3.0-5319e7.svg)](https://github.com/fk0u/AortaLink/issues/25)

> **AortaLink** (Aorta: *main arterial pathway distributing life*, Link: *clinical data interoperability*) is an open-source, offline-first **companion app (aplikasi pendamping)** for cardiovascular and aorta health education, blood-pressure tracking and hypertension self-management, built on **HL7 FHIR R4**. It runs its statistics **on-device**, with zero mock data and no external AI services.

> [!IMPORTANT]
> **Not a medical device.** The public release of AortaLink is an education and tracking tool. It does not diagnose, does not recommend starting, stopping or changing medication, and does not replace a doctor. If you have chest or back pain, shortness of breath, sudden weakness on one side, slurred speech or fainting, **call 119** (Indonesia) or go to the nearest emergency department.

---

## 🧭 Positioning & release modes (v3.0)

AortaLink v3.0 is **engineered to Software-as-a-Medical-Device (SaMD) discipline** (risk management, traceability, tests, versioned algorithms) but is **not registered** as a medical device under Kepmenkes HK.01.07/MENKES/951/2026. It therefore ships in two modes ([#28](https://github.com/fk0u/AortaLink/issues/28)):

| Mode | Who | What is enabled |
| :--- | :--- | :--- |
| **Public** (default) | Everyone | Education, BP / medication / lab tracking, FHIR export, reminders, a static emergency screen (119 / 112). No diagnostic or treatment claims. |
| **Research / Academic** | Researchers with ethics approval (KEPK) and a physician as PI or clinical supervisor | SaMD-grade features: guideline classification, Health Score, red-flag routing, ML analytics, de-identified data export, algorithm-version logging for reproducible papers, theses and *skripsi*. |

> [!TIP]
> **Syarat Penggunaan Mode Riset:** Wajib mengantongi persetujuan Komisi Etik Penelitian Kesehatan (KEPK) terakreditasi dan memiliki dokter spesialis berlisensi sebagai Principal Investigator (PI) atau pembimbing klinis. Diaktifkan di dalam aplikasi menggunakan Study ID resmi protokol penelitian dan informed consent partisipan ter-pseudonimisasi.

**Default guideline:** ESH 2023 / PERHI (hypertension ≥140/90 office, ≥135/85 home). ACC/AHA 2025 and ESC 2024 will be selectable ([#15](https://github.com/fk0u/AortaLink/issues/15)).

---

## 🗺️ v3.0 roadmap & documents

| Document | Contents |
| :--- | :--- |
| [`docs/v3/FLOW_NOTES.md`](docs/v3/FLOW_NOTES.md) | v3.0 user flow (7 steps: access → auth → FHIR onboarding → BP telemetry → Health Score → care routing → knowledge base) |
| [`docs/v3/RESEARCH_ANALYSIS.md`](docs/v3/RESEARCH_ANALYSIS.md) | Research & gap analysis: guidelines, aortic disease, FHIR/SATUSEHAT, Bluetooth, regulation |
| [`docs/v3/CLINICAL_REVIEW.md`](docs/v3/CLINICAL_REVIEW.md) | Simulated multi-persona clinical pre-review (not clinical validation) |
| [`docs/AUDIT_LOGOS_AORTA.md`](docs/AUDIT_LOGOS_AORTA.md) | Systematic code audit against the 7 *Logos Aorta* principles |
| [Tracking issue #25](https://github.com/fk0u/AortaLink/issues/25) | All v3.0 work items, by phase |

---

## 🌟 What it does today

- **Offline-first records**: Dexie (IndexedDB) is the single source of truth; multi-profile family care.
- **Cloud sync**: Express + MongoDB Atlas with per-record `updatedAt`, merge-by-recency and deletion tombstones (open hardening items: [#10](https://github.com/fk0u/AortaLink/issues/10)).
- **Bluetooth BP cuffs**: Web Bluetooth GATT Blood Pressure Profile (`0x1810` / `0x2A35`) with IEEE 11073 SFLOAT decoding, Chromium browsers only; manual entry everywhere else (spec hardening: [#14](https://github.com/fk0u/AortaLink/issues/14)).
- **Measurement context**: Home / Clinic / Post-medication / Stress, so clinic readings don't distort home averages.
- **Circadian dipping profile**: Dipper / Non-dipper / Riser / Extreme dipper, shown as a pattern to discuss with a doctor.
- **FHIR R4 export**: Patient, Observation and MedicationRequest bundles with an in-app JSON inspector.
- **Encrypted backup**: AES-256-GCM + PBKDF2 `.albackup`, plus JSON backup/restore and PDF reports.

---

## 🧠 On-device ML engine (`src/services/ml/`, engine v2.0.0)

Pure TypeScript, deterministic, no network. Every output carries `engineVersion` and `guideline` so results are reproducible. Every model refuses to guess (`not_enough_data`) when data is insufficient.

| Model | Method | What changed in v2.0.0 |
| :--- | :--- | :--- |
| **Trend forecaster** | OLS regression of systolic/diastolic over time | 7-day band is now a true **95% prediction interval** `t(n−2)·s·√(1 + 1/n + (x−x̄)²/Sxx)` that widens with extrapolation; "significant" requires ≥1.5 mmHg/week **and** slope t-test p < 0.05 (was an R² cut-off). |
| **Pattern detector** | White-coat, masked hypertension, morning surge, variability, weekend effect | Group differences are only "significant" with a large effect **and** Welch's t-test p < 0.05; otherwise reported as indicative with the p-value. Masked hypertension uses ESH thresholds (home ≥135/85, office <140/90). |
| **Adherence model** | Logistic regression (gradient descent, L2) on labelled days | Odds ratios now come with **95% bootstrap confidence intervals** (200 seeded resamples); only ratios whose CI excludes 1 are interpreted, always as association, not causation. Measurement frequency was removed as a feature (reverse causality). |
| **Engine** | Rule-based insights over the models | Severe-reading threshold follows ESH grade 3 (≥180 **or** ≥110) with symptom-first guidance (symptoms → 119; none → re-measure, then call a doctor today). Default target <130/80 (ESH) when the profile has none. |
| **Local assistant** | Deterministic Q&A citing its data sources | No generative AI, no dose recommendations. |

The app no longer suggests dose changes or medication-timing changes anywhere ([#27](https://github.com/fk0u/AortaLink/issues/27)).

Run the statistical self-check:

```bash
npm run test:ml
```

---

## 📊 HL7 FHIR R4 resource mapping

| Resource | Code | Description |
| :--- | :--- | :--- |
| `Patient` | — | Profile |
| `Observation` (vital-signs) | LOINC `85354-9` | BP panel: systolic `8480-6`, diastolic `8462-4`, heart rate `8867-4` |
| `Observation` (laboratory) | LOINC `3091-6` | Urea [Mass/volume] in Serum or Plasma (*ureum*) |
| `Observation` (laboratory) | LOINC `2160-0` | Creatinine [Mass/volume] in Serum or Plasma |
| `Observation` (laboratory) | LOINC `3084-1` | Urate [Mass/volume] in Serum or Plasma (*asam urat*) |
| `MedicationRequest` | RxNorm / free text | Medication regimen |

The export does not yet pass the official HL7 validator (non-standard fields, empty extensions, `fullUrl` format). That is a v3.0 blocker tracked in [#11](https://github.com/fk0u/AortaLink/issues/11).

---

## 🛠️ Technology stack

React 19 + TypeScript · Rsbuild v2 (Rspack) · Dexie v4 · Express 4 + MongoDB Atlas (JWT, bcrypt) · Tailwind CSS v3 + Framer Motion · Recharts · jsPDF.

---

## 🚀 Running it

```bash
npm install
cp .env.example .env   # add YOUR MongoDB URI and JWT secret
npm run dev            # API server + dev client
npm run lint           # TypeScript type check
npm run test:ml        # ML statistics self-check
npm run build          # production bundle
```

| Variable | Purpose |
| :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas connection string (server-side only) |
| `JWT_SECRET` | Token signing secret (`openssl rand -hex 64`). Without it, sessions invalidate on restart. |

No AI provider keys are needed.

**Vercel:** `vercel.json` serves the SPA and maps `/api/*` to the Express app. Set `MONGODB_URI` and `JWT_SECRET` in the project environment.

**Docker:** the image is full-stack (Express API + built SPA in one container). `docker-compose.yml` is included.

---

## 🔐 Security & privacy

- Passwords are hashed with bcrypt; legacy SHA-256 accounts are upgraded on login.
- Bearer JWTs stored in `localStorage`; always serve over HTTPS. Shorter-lived tokens are planned ([#21](https://github.com/fk0u/AortaLink/issues/21)).
- Health data is sensitive personal data under UU 27/2022 (PDP). Consent and data-protection work is tracked in [#23](https://github.com/fk0u/AortaLink/issues/23).
- Report vulnerabilities as described in [`SECURITY.md`](SECURITY.md).

---

## 🎓 Academic use

Researchers and students may use AortaLink for journal papers, theses and *skripsi*. Clinical use of the SaMD-grade features requires ethics committee (KEPK) approval and a licensed physician as PI or clinical supervisor. Cite the engine version (`engineVersion`) reported with every analysis.

---

## 📄 License & contributing

Distributed under the **MIT License**. The `LICENSE` file itself still has to be added, together with the `/core` and `/connectors` split ([#22](https://github.com/fk0u/AortaLink/issues/22)). See [`CONTRIBUTING.md`](CONTRIBUTING.md) to get started.
