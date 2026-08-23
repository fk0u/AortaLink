# AortaLink Session Briefing

## Overview
- **App Name:** AortaLink (Personal EHR & Clinical Interoperability Platform)
- **Philosophy:** Aorta = Main artery distributing life; Link = Interoperability of clinical data. Built as a Personal Electronic Health Record (EHR) bridging raw vital signs with internal medicine clinical precision.
- **High-Impact Real-time Features:** Combination Therapy Tracker (Amlodipine 5mg CCB Pagi, Candesartan 8mg ARB Malam, Allopurinol 100mg) + Secondary Lab Parameters (Blood Urea, Serum Creatinine, Uric Acid) + Vital Measurement Context (White-Coat Syndrome Defense: Home, Clinic/Hospital, Post-Medication, Stress) + Nocturnal Dipping Circadian Calculator + Auto-Flagging Clinical Alerts (Hyperuricemia >7.0 mg/dL, AHA Stage 1/2/Crisis, Renal Impairment) + Interactive Health Calendar + Sleep & Habit Tracker + Safe Web Audio Synthesizer + Custom Apple Profile Selector + Voice Dictation (Web Speech API) + Dual Header + SOS Emergency Direct Call + Real MongoDB Atlas Backend Auth + Multi-Device Cloud Sync + Material Design 3 Mobile-First Redesign + Hallmark Bespoke Iconography (Zero Emojis & Zero Lucide) + True Native Mobile Ergonomics + Full-Width Bulletproof Glass Header + Full GSAP ScrollTrigger & Kinetic Motion Engine + True Widescreen Desktop 2-Column Split Architecture
- **Tech Stack:** React 19 + TypeScript + Rsbuild v2 + GSAP v3 + @gsap/react + Node.js Express Backend + MongoDB Atlas (`aortalink_ehr_db`) + bcryptjs + jsonwebtoken + Tailwind CSS (Material 3 Tonal Architecture) + Dexie.js v4 (AortaLinkDB v6 Schema) + TanStack Query v5 + TanStack Router v1 + Zustand + Recharts + jsPDF + Framer Motion + Bespoke SVG AppIcons System

## Clinical Schema & Evolution Status
- [x] **Phase 1: Global Rebranding**: Fully migrated from HeartSync to AortaLink across package configs, headers, metadata, PWA manifests, and backup scripts.
- [x] **Phase 2: Database Schema Rooting**: Dexie v3 schema (`AortaLinkDB`) rooted with `medications`, `medicationLogs`, `labResults`, and `measurement_context`. Seeding default clinical combination therapy regimen.
- [x] **Phase 3: Business Logic & Clinical Algorithms**: Circadian Dipping Nocturnal Calculator, White-Coat Hypertension Filtering, and Auto-Flagging Clinical Alert System.
- [x] **Phase 4: Real Backend MongoDB Atlas Auth & Cloud Sync**: Express API backend in `server/index.js` running on `0.0.0.0:5000`, connected to MongoDB Atlas `aortalink_ehr_db` (`users`, `observations`, `medications`, `lab_results`, `profiles`, `reminders`, `fhir_resources`). Secure bcrypt password hashing, JWT sessions, and automatic multi-device cloud data push & pull sync.
- [x] **Phase 5: Mobile-First Ergonomics & Anti-Clutter Redesign**:
  - Dihapus total status bar tiruan (`MobileStatusBar`).
  - Top App Bar ramping (`MobileTopAppBar`) setinggi 56px (`h-14`) dengan profil monogram.
  - Hero Card data tensi utama (`141/82 mmHg`) di posisi teratas sebagai prioritas utama.
  - Konsolidasi banner peringatan medis (`CdssAlertBanner`) dan tombol darurat selektif (`EmergencyAlert`).
- [x] **Phase 6: Awwwards-Tier Landing Page & Polish Overhaul**:
  - Landing Page double-bezel, floating island navbar, live medical card mockup di hero, asymmetric bento matrix, komparasi klinis, pricing open-source, dan interactive FAQ.
  - **Perbaikan Dropdown Profil**: Orientasi dropdown profil `CustomProfileSelector` diperbaiki ke `left-0` sehingga tidak terpotong pada batas kiri layar.
  - **Integrasi Modal AI Bersih**: Tombol AI Sp.PD diintegrasikan ke Aksi Cepat dan Drawer Peralatan (`MobileToolsSheet`), menghilangkan floating button statis yang menutupi kartu.
  - **Penyempurnaan Bento Metrik Sekunder**: Rata-rata 7 hari, denyut nadi, dan rentang tensi ditata dalam bento grid ramping bersahaja dengan angka tabular.
- [x] **Phase 7: Arsitektur Z-Index Modal & Bottom Dock Bar**:
  - `M3BottomNavigation` diturunkan ke `z-30` (lapisan chrome dasar).
  - Seluruh modal & bottom sheet diposisikan di `z-[70]` s/d `z-[90]` dengan backdrop global.
  - Saat modal dibuka, bottom dock bar tertutup dan tergelapkan sepenuhnya di belakang backdrop.
  - Tombol aksi formulir (`Catat Tensi Sekarang`) memiliki ruang aman bawah (`pb-8 sm:pb-3`).
- [x] **Phase 8: Rich Motion & High-End Asset Architecture**:
  - Interactive 24-Hour Diurnal Dipping Simulator, Combination Therapy Showcase, Live HL7 FHIR JSON, Infinite Marquee, dan Film Grain Overlay.
- [x] **Phase 9: Full-Width Bulletproof Sticky Glass Header & Adaptive Layout**:
  - Mengubah header menjadi **Full-Width Sticky Glass Bar (`w-full border-b backdrop-blur-2xl px-4 sm:px-8`)** yang membentang sempurna dari ujung ke ujung layar laptop tanpa pernah memotong tombol aksi atau tautan navigasi.
  - Penataan hero section yang proporsional dan elegan di berbagai resolusi layar (laptop, tablet, maupun monitor besar).
- [x] Verified full typecheck (`npm run lint` — 0 errors) dan production build (`npm run build` — 0 errors dalam 3.08s).
