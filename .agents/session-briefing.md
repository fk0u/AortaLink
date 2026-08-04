# AortaLink Session Briefing

## Overview
- **App Name:** AortaLink (Personal EHR & Clinical Interoperability Platform)
- **Philosophy:** Aorta = Main artery distributing life; Link = Interoperability of clinical data. Built as a Personal Electronic Health Record (EHR) bridging raw vital signs with internal medicine clinical precision.
- **High-Impact Real-time Features:** Combination Therapy Tracker (Amlodipine 5mg CCB Pagi, Candesartan 8mg ARB Malam, Allopurinol 100mg) + Secondary Lab Parameters (Blood Urea, Serum Creatinine, Uric Acid) + Vital Measurement Context (White-Coat Syndrome Defense: Home, Clinic/Hospital, Post-Medication, Stress) + Nocturnal Dipping Circadian Calculator + Auto-Flagging Clinical Alerts (Hyperuricemia >7.0 mg/dL, AHA Stage 1/2/Crisis, Renal Impairment) + Interactive Health Calendar + Sleep & Habit Tracker + Safe Web Audio Synthesizer + Custom Apple Profile Selector + Voice Dictation (Web Speech API) + Dual Header + SOS Emergency Direct Call + OpenSSF Alignment Documentation + Typst Compiled Enterprise PDF
- **Tech Stack:** React 19 + TypeScript + Rsbuild v2 + Tailwind CSS + Dexie.js v4 (AortaLinkDB v3 Schema) + TanStack Query v5 + TanStack Router v1 + Zustand + Recharts + jsPDF + Web Crypto API + Web Audio API + Web Speech API

## Clinical Schema & Evolution Status
- [x] **Phase 1: Global Rebranding**: Fully migrated from HeartSync to AortaLink across package configs, headers, metadata, PWA manifests, and backup scripts.
- [x] **Phase 2: Database Schema Rooting**: Dexie v3 schema (`AortaLinkDB`) rooted with `medications`, `medicationLogs`, `labResults`, and `measurement_context`. Seeding default clinical combination therapy regimen.
- [x] **Phase 3: Business Logic & Clinical Algorithms**: Circadian Dipping Nocturnal Calculator, White-Coat Hypertension Filtering, and Auto-Flagging Clinical Alert System.
- [x] Verified full typecheck (`npm run lint` — 0 errors) and safe execution.
