# AortaLink Session Briefing

## Overview
- **App Name:** AortaLink (Personal EHR & Clinical Interoperability Platform)
- **Philosophy:** Aorta = Main artery distributing life; Link = Interoperability of clinical data. Built as a Personal Electronic Health Record (EHR) bridging raw vital signs with internal medicine clinical precision.
- **High-Impact Real-time Features:** Combination Therapy Tracker (Amlodipine 5mg CCB Pagi, Candesartan 8mg ARB Malam, Allopurinol 100mg) + Secondary Lab Parameters (Blood Urea, Serum Creatinine, Uric Acid) + Vital Measurement Context (White-Coat Syndrome Defense: Home, Clinic/Hospital, Post-Medication, Stress) + Nocturnal Dipping Circadian Calculator + Auto-Flagging Clinical Alerts (Hyperuricemia >7.0 mg/dL, AHA Stage 1/2/Crisis, Renal Impairment) + Interactive Health Calendar + Sleep & Habit Tracker + Safe Web Audio Synthesizer + Custom Apple Profile Selector + Voice Dictation (Web Speech API) + Dual Header + SOS Emergency Direct Call + Real MongoDB Atlas Backend Auth + Multi-Device Cloud Sync + Material Design 3 Mobile-First Redesign + Hallmark Bespoke Iconography (Zero Emojis & Zero Lucide) + True Native Mobile Ergonomics + Full-Width Bulletproof Glass Header + Full GSAP ScrollTrigger & Kinetic Motion Engine + True Widescreen Desktop 2-Column Split Architecture + Comprehensive HL7 FHIR Clinical PDF Export Suite
- **Tech Stack:** React 19 + TypeScript + Rsbuild v2 + GSAP v3 + @gsap/react + Node.js Express Backend + MongoDB Atlas (`aortalink_ehr_db`) + bcryptjs + jsonwebtoken + Tailwind CSS (Material 3 Tonal Architecture) + Dexie.js v4 (AortaLinkDB v6 Schema) + TanStack Query v5 + TanStack Router v1 + Zustand + Recharts + jsPDF + jspdf-autotable + Framer Motion + Bespoke SVG AppIcons System

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
- [x] **Phase 9: Root Layout Canvas Isolation & Clinical PDF Export Elevation**:
  - **Eliminasi Root Container Constraint**: Menghilangkan pembungkus `max-w-3xl` yang mengurung `LandingPage` di `App.tsx`, sehingga halaman depan kini membentang bebas 100% dari ujung ke ujung layar laptop/desktop (`w-full`).
  - **Widescreen Canvas Dashboard**: Main container untuk aplikasi dashboard diperluas ke `max-w-7xl px-8` di desktop dan tetap ramping di smartphone.
  - **Clinical Hospital PDF Export Suite**: Desain laporan PDF (`generateDoctorPDF` dan `generateWeeklyReportPDF`) dirombak menjadi dokumen medis terstandar HL7 FHIR R4 LOINC 85354-9 lengkap dengan Demographic Card, 4-Kuadran Bento Analisis Sirkadian & Nocturnal Dipping, Auto-Flagging CDSS, Tabel Observasi MAP & Konteks Pengukuran, serta Area Evaluasi DPJP dan Paraf Dokter.
- [x] **Phase 10: Auth Bug Fix, Google OAuth Elimination & Awwwards Non-AI Redesign**:
  - **Penghapusan Opsi Login Google**: Menghapus tombol & handler Google login di `AuthModal.tsx`, `real-auth-service.ts`, `useAuthStore.ts`, dan backend `server/index.js` untuk mencegah bug auto-login default akun Ghani di semua browser/incognito.
  - **Dukungan Penuh Mode Tamu (Offline-First)**: Menambahkan `continueAsGuest` pada `useAuthStore`, memungkinkan pengguna mengakses dashboard dan seluruh 14 tabel Dexie.js secara lokal tanpa perlu membuat akun.
  - **Redesain Total Landing Page (Awwwards Non-AI Style without Pill Capsule Bars)**: Mengeliminasi seluruh bentuk pil/kapsul (`rounded-full`) pada navbar, badge, dan tombol. Mengadopsi estetika *Swiss Architectural / Clinical Laboratory* dengan hairline borders, aksen monospaced telemetri, live 24H Diurnal Dipping Console, Pharmacological Synergy Matrix, dan HL7 FHIR Live Spec Terminal.
- [x] **Phase 11: Timezone GMT+8 Localization, Real-time Auto-Refresh & Silent Cloud Sync**:
  - **Perbaikan Timezone Jam Lokal**: Menambahkan helper `getLocalDateTimeForInput` dan `parseLocalDateTimeInput` di `formatters.ts`, menyelesaikan masalah jam 15:22 UTC menjadi 23:22 GMT+8 pada form pencatatan tensi `ReadingFormModal.tsx` serta modal lab & sodium.
  - **Auto-Refresh Realtime Tanpa Tekan Tombol**: Mengonversi `useReadings` ke `useLiveQuery` dari `dexie-react-hooks`, sehingga setiap aksi pencatatan atau modifikasi tensi langsung memicu pembaruan reaktif real-time pada seluruh grafik, Apple rings, dan kartu metrik.
  - **Pembersihan Pill Teknis MongoDB Atlas & Background Sync**: Mengganti pill "MongoDB Atlas" dengan indikator awan minimalis serta menjalankan auto-sync periodik di latar belakang (tiap 30 detik & saat window focus).
- [x] **Phase 12: High-Precision Internet Time Sync (WITA/GMT+8) & Zero-Mock Real Clinical Data**:
  - **Dedicated TimeService (`time-service.ts`)**: Sinkronisasi waktu internet otomatis via WorldTime API dengan fallback presisi tinggi ke jam perangkat berbasis timezone `Asia/Singapore` / `Asia/Makassar` (GMT+8 / WITA). Menyediakan widget jam WITA real-time pada header desktop dan top bar mobile.
  - **Zero Mock / Zero Fake Data**: Membersihkan data mock statis pada pelacak natrium `SodiumTrackerModal.tsx`, memastikan seluruh 11 modal tools dan evaluasi klinis menghitung langsung dari data rekam medis aktif di Dexie.js secara 100% real-time.
- [x] **Phase 13: 100% Dynamic Multi-Drug Pharmacological Regimen & Patient-Centric CDSS**:
  - **Eliminasi Default Seeding Obat**: Menghapus injeksi otomatis obat default (Amlodipine/Candesartan/Allopurinol) di `db/index.ts`. Profil baru dimulai dengan regimen bersih sesuai resep dokter masing-masing pasien.
  - **Ekspansi Golongan Obat Lengkap**: Menambahkan dukungan penuh untuk seluruh kelas terapi antihipertensi & kardiovaskular (CCB, ARB, ACE Inhibitor, Beta Blocker, Diuretik, ARNI, Penurun Asam Urat, Statin/Lipid, Antidiabetes, Antiplatelet) dengan jadwal fleksibel (Pagi, Siang, Sore, Malam, Sesuai Kebutuhan).
  - **CDSS & PDF Export Dinamis**: Evaluasi klinis nocturnal dipping, peringatan AHA Stage, resume rekam medis PDF dokter (`generateDoctorPDF`), dan konsultasi AI Sp.PD secara dinamis mengevaluasi obat riil yang didaftarkan pengguna tanpa asumsi kaku.
- [x] **Phase 14: Google AI Studio Gemini 3.1 Flash Lite, Age-Stratified Tensimeter & Hospital Lab Suite**:
  - **Google Gemini 3.1 Flash Lite Integration**: Konfigurasi `AI_API_KEY` aktif pada Google AI Studio (`gemini-ai-service.ts` & backend `POST /api/ai/gemini-consultation`), memberikan analisis Sp.PD cerdas berbasis rekam medis lengkap (usia, target, tensi, sirkadian, obat aktif, hasil lab).
  - **Advanced Age-Stratified Tensimeter (`bp-classifier.ts` & `ReadingFormModal.tsx`)**: Evaluasi tensi terstratifikasi usia (Pediatrik, Dewasa Muda, Dewasa Menengah, Lansia, Geriatri), telemetri Pulse Pressure (kekakuan aorta), MAP (perfusi organ), RPP (beban miokard), serta **Protokol ESH 2023 3x Pengukuran Berturut-turut**.
  - **Hospital-Grade Laboratory Suite (`LabResultsModal.tsx`)**: Parameter lab diperluas ke standar rumah sakit (Asam Urat, Kreatinin, Ureum, **Kalkulasi Otomatis eGFR CKD-EPI 2021**, Profil Lipid Total/LDL/HDL/Trigliserida, Gula Darah Puasa, HbA1c, Kalium K+, Natrium Na+, dan Proteinuria Urin).
- [x] **Phase 15: React Hook Order Fix & Network Resilient Time Service**:
  - **Rules of Hooks Restoration di `AuthModal.tsx`**: Memindahkan seluruh hooks (`useAppStore`, `useAuthStore` termasuk `continueAsGuest`) ke bagian atas sebelum conditional early return `if (!isOpen) return null;`, menghilangkan fatal error *"Rendered more hooks than during the previous render"*.
  - **TimeService Multi-Endpoint Resiliency**: Menambahkan failover multi-endpoint (`timeapi.io` & `worldtimeapi.org`) dengan penanganan error senyap (*silent failover*) ke jam perangkat tanpa connection reset merah di konsol.
- [x] **Phase 16: Unified 3-in-1 Clinical PDF Report Suite (Komprehensif, Mingguan, Bulanan)**:
  - **Integrasi 3 Versi Laporan dalam 1 Modal Terpadu (`ExportPdfModal.tsx`)**: Menghilangkan pemisahan modal ekspor. Pengguna dapat memilih langsung antara 3 varian:
    1. **Laporan Komprehensif Berangkap**: Analisis seluruh rekam medis longitudinal dari awal pencatatan.
    2. **Laporan Evaluasi Mingguan**: Evaluasi dinamika dan kepatuhan 7 hari terakhir.
    3. **Laporan Evaluasi Bulanan**: Evaluasi stabilitas kronis kardiovaskular & titrasi obat 30 hari terakhir.
  - **Kelengkapan Standar Klinis 100% pada Setiap Versi (`pdf-generator.ts`)**: Seluruh 3 versi laporan PDF memuat konten lengkap tanpa potongan: Demografi Pasien & Usia Klinis, Target Tensi Personal vs ESH 2023, Regimen Obat Riil Pasien, Hasil Lab Standar RS (eGFR, Asam Urat, Kreatinin, Profil Lipid), Matriks Hemodinamik & Nocturnal Dipping, Peringatan CDSS & Saran Dokter Holistik, Tabel Observasi Terstruktur HL7 FHIR (MAP & Pulse Pressure), serta Lembar Catatan & Paraf DPJP.
- [x] **Phase 17: Multi-Account Database Isolation & Cross-User Data Leakage Elimination**:
  - **Penyebab Data Nempel**: Sebelumnya saat registrasi akun baru atau login akun lain, Dexie.js (IndexedDB browser) tidak direset sehingga data dari akun sebelumnya / mode tamu terdorong ke akun baru.
  - **Implementasi `clearLocalEhrDatabase()` di `db/index.ts`**: Menghapus bersih seluruh 16 tabel lokal saat registrasi akun baru, login akun lain, dan logout.
  - **Inisialisasi Bersih Otomatis di `useAuthStore.ts`**: Setiap akun baru dimulai dengan profil bersih bernama sesuai nama pengguna (`seedInitialData(name)`), 0 tensi, 0 obat, dan 0 lab, tanpa ada data bekas yang menempel.
- [x] **Phase 18: Real-Time Cloud Profile Sync & Permanent Cascade Deletion**:
  - **Penyebab Gagal Hapus**: Sebelumnya penghapusan profil hanya menghapus record di Dexie lokal tanpa endpoint hapus di MongoDB Atlas, sehingga saat sync pull berkala data dari cloud menarik kembali profil lama. Selain itu `ConfirmModal` memiliki z-index yang tumpang-tindih.
  - **Endpoint Backend `DELETE /api/profiles/:profileId` di `server/index.js`**: Menghapus profil beserta seluruh observasi, obat, hasil lab, dan histori terkait secara kaskade di MongoDB Atlas Cluster.
  - **Sinkronisasi Otomatis di `ProfileModal.tsx` & `mongodb-service.ts`**: Penambahan method `deleteProfileCloud(id)` dan pemicu `pushUserData()` saat profil dibuat, diedit, atau dihapus permanen.
  - **Perbaikan Dialog `ConfirmModal.tsx`**: Z-index dinaikkan ke `z-[100]` dengan backdrop blur independen untuk memastikan modal konfirmasi selalu responsif dan tampil di atas seluruh layer modal.
- [x] Verified full production build (`npm run build` — 0 errors dalam 2.25s).
