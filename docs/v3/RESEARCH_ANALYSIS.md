# AortaLink v3.0 — Riset & Analisis Lanjutan

> **Tanggal:** 2026-10-01 · **Basis:** [`FLOW_NOTES.md`](./FLOW_NOTES.md) (notulensi v3.0) + [`../AUDIT_LOGOS_AORTA.md`](../AUDIT_LOGOS_AORTA.md) + kode `master` (`9dbfcaa`).
> **Status:** draft riset untuk perencanaan. Semua angka klinis di sini wajib diverifikasi ulang oleh reviewer klinis sebelum masuk kode.
> **Update 2026-10-01:** v3.0 dibangun dengan standar SaMD, dirilis publik sebagai non-alkes + mode riset/akademik (#28), default guideline ESH/PERHI. Koreksi klinis atas dokumen ini ada di [`CLINICAL_REVIEW.md`](./CLINICAL_REVIEW.md) (mis. ambang darurat ≥180/≥110, ambang HBPM 135/85).

---

## 1. Ringkasan

v3.0 mengubah AortaLink dari *tracker tensi offline-first* menjadi *platform pendamping kardiovaskular & aorta* dengan 7 tahap (akses → auth → skrining FHIR → telemetri BP → AI Health Score → care routing → knowledge base). Lima temuan riset yang paling mengubah rencana:

1. **Regulasi baru: Kepmenkes HK.01.07/MENKES/951/2026 (7 Sep 2026)** tentang izin edar alat kesehatan berbasis software (SaMD/SiMD/AI). Klasifikasinya berdasarkan *intended use & klaim*. Aplikasi edukasi umum bukan alkes, tetapi **"diagnostic summary" dan "Health Score" yang memengaruhi keputusan klinis kemungkinan besar masuk SaMD** → butuh validasi klinis (bisa via *regulatory sandbox*), IEC 62304, keamanan siber, dan pengawasan pasca-pasar. Ini keputusan produk paling penting di v3.0: positioning "aplikasi pendamping" di notulensi harus tercermin di klaim UI, bukan hanya di dokumen.
2. **Guideline hipertensi sudah bergeser.** ACC/AHA **2025** (Agu 2025) mempertahankan ambang 130/80 tetapi memakai **PREVENT** (risiko 10 th total CVD ≥7,5% untuk mulai obat pada stage 1). ESC **2024** memperkenalkan kategori **"elevated BP" 120–139/70–89**, hipertensi tetap ≥140/90, target sistolik 120–129. Kode sekarang (`bp-classifier.ts`) mengklaim "AHA/WHO" dan memakai PCE 2013 (`ascvd-calculator.ts`). Untuk konteks Indonesia, PERHI mengikuti ambang ≥140/90.
3. **FHIR R4 JSON-only adalah keputusan yang tepat dan selaras dengan SATUSEHAT** (Permenkes 24/2022: RME fasyankes wajib interoperabel dengan SATUSEHAT via FHIR R4). Tapi ekspor saat ini **belum valid** (audit P1-7 LOINC urea salah `14927-8`, P1-8 field non-standar/`extension: []`/`fullUrl` bukan UUID). Selama itu belum lolos validator resmi, keputusan "FHIR-only" justru menyebarkan data invalid ke seluruh pipeline.
4. **Nyeri dada akut & diseksi aorta = routing darurat, bukan diagnosis aplikasi.** Literatur (ADD-RS + D-dimer) menunjukkan alat ini dirancang untuk *klinisi di IGD* (meta-analisis: ADD-RS>1 atau D-dimer>500 → sensitivitas 98,3%, spesifisitas 51,4%). Peran aplikasi yang aman: deteksi *red flag* dari input pasien → arahkan ke IGD / PSC **119** segera, tanpa skor atau "kemungkinan diseksi".
5. **Web crawling konten medis butuh tata kelola.** Crawling otomatis tanpa review klinis = risiko konten salah/usang + risiko hak cipta guideline (ESC/AHA berlisensi). Model yang aman: crawler hanya *mengusulkan* pembaruan dari sumber allowlist, publikasi tetap lewat review klinisi dengan sitasi & tanggal review.

---

## 2. Analisis per tahap User Flow v3.0

| Step | Kondisi kode sekarang | Gap ke v3.0 | Risiko utama |
|---|---|---|---|
| 01 Akses | Landing + katalog fitur ada | Konten edukasi aorta (TAA, AAA, diseksi) belum ada | Klaim pemasaran berlebihan (audit P2-1 "Kaspersky grade") |
| 02 Auth | JWT 60 hari di `localStorage`, Google OAuth, mode guest | OAuth2 sesuai notulensi; refresh token; rate limit | Audit P1-10, P2-10 (brute force, token panjang) |
| 03 Skrining | `profiles`, `ascvdProfiles`, `labResults` di Dexie | Tidak ada tabel/resource `FamilyMemberHistory`, `Condition`, `Immunization`; BMI, merokok, alkohol belum sebagai `Observation` | Mapping kode (SNOMED/LOINC/ICD-10) salah = data tak interoperabel |
| 04 BP | BLE GATT 0x1810/0x2A35 + form manual | Spesifikasi final, daftar perangkat teruji, fallback manual | Audit P1-5, P1-6 (SFLOAT NaN → 2047 mmHg, posisi/lengan dikarang) |
| 05 AI & Health Score | ML lokal deterministik (`src/services/ml/*`), belum ada Health Score | Definisi skor, validasi, explainability | SaMD (Kepmenkes 951/2026); audit P2-3..P2-6 (statistik overconfident) |
| 06 Care routing | Belum ada | Red-flag triage, rekomendasi, rujukan | Under-triage nyeri dada akut |
| 07 Knowledge base | Belum ada (ada `local-assistant.ts`) | Modul komplikasi, panduan 3 tingkat, pipeline konten | Konten tidak tervalidasi, hak cipta |

---

## 3. Temuan riset per topik

### 3.1 Guideline framework (ACC/AHA vs ESC/ESH)

| Kategori | ACC/AHA 2017 & 2025 | ESC 2024 | ESH 2023 / PERHI |
|---|---|---|---|
| Normal / non-elevated | <120/<80 | <120/<70 | optimal <120/<80 |
| Elevated | 120–129/<80 | **120–139/70–89** ("elevated BP") | normal-tinggi 130–139/85–89 |
| Hipertensi | Stage 1 130–139/80–89; Stage 2 ≥140/≥90 | ≥140/≥90 | Grade 1 ≥140/≥90 |
| Risiko untuk mulai obat | **PREVENT** ≥7,5% (2025) | SCORE2 / SCORE2-OP | SCORE2 |
| Target | <130/80, dorong <120 sistolik | sistolik 120–129 bila ditoleransi | <140/90 lalu <130/80 |

**Implikasi desain:** satu reading bisa "Stage 1" (ACC/AHA) sekaligus "Elevated" (ESC). Maka:
- `bp-classifier` menjadi **fungsi murni dengan parameter guideline** (`classifyBP(reading, guideline)`) dan setiap hasil menyimpan `guidelineId + versi`.
- Di FHIR, kategori disimpan sebagai `Observation.interpretation` + `extension` yang menyebut guideline, bukan sebagai teks bebas.
- Default untuk pengguna Indonesia: **ESH/PERHI** (ambang 140/90), dengan opsi ACC/AHA. Ini keputusan produk, perlu konfirmasi.
- PCE 2013 (sekarang) → evaluasi **PREVENT** (tanpa ras, ada eGFR) untuk mode ACC/AHA dan **SCORE2** untuk mode ESC. Keduanya dikembangkan di populasi Barat; tampilkan disclaimer populasi Asia (audit P2-3).

### 3.2 Penyakit aorta & red flag

Guideline acuan: **2022 ACC/AHA Guideline for Diagnosis and Management of Aortic Disease** dan **2024 ESC Guidelines for Peripheral Arterial and Aortic Diseases** (Eur Heart J 45(36):3538–3700).

Yang realistis untuk aplikasi pendamping:
- **Edukasi & skrining risiko jangka panjang**: hipertensi tak terkontrol, merokok, riwayat keluarga aneurisma/diseksi, kelainan jaringan ikat (Marfan, Loeys-Dietz, Ehlers-Danlos vaskular), katup aorta bikuspid, vaskulitis (Takayasu, giant cell arteritis — glosarium "Autoimun"). Faktor ini masuk Step 03 sebagai `FamilyMemberHistory` / `Condition`.
- **Surveilans pasien terdiagnosis TAA/AAA**: pengingat jadwal imaging, kontrol tekanan darah ketat, log diameter dari laporan imaging (`DiagnosticReport` / `ImagingStudy` ringkas) — tanpa menafsirkan gambar.
- **Red flag akut** (nyeri dada/punggung mendadak, robek/tajam, pingsan, defisit neurologis, beda tekanan lengan): langsung tampilan darurat → PSC 119 / IGD terdekat. **Tidak** menghitung ADD-RS di sisi pasien: ADD-RS membutuhkan pemeriksaan fisik, dan dalam meta-analisis spesifisitasnya rendah (ADD-RS>0: sens 94,6%, spes 34,7%).

### 3.3 Laboratorium & imaging (FHIR)

Kode yang perlu dipetakan (verifikasi ulang di loinc.org / SATUSEHAT terminology sebelum dipakai):

| Item | Resource | Catatan |
|---|---|---|
| Tinggi, berat, BMI | `Observation` vital-signs (LOINC 8302-2, 29463-7, 39156-5) | BMI dihitung, tetap disimpan sebagai Observation dengan `derivedFrom` |
| Status merokok | `Observation` social-history (LOINC 72166-2) | Value set SNOMED |
| Alkohol | `Observation` (mis. AUDIT-C) | Pilih instrumen yang tervalidasi bahasa Indonesia |
| Ureum | `Observation` lab (LOINC **3091-6** urea; BUN 3094-0) | Fix audit P1-7 (`14927-8` salah) |
| D-dimer, troponin | `Observation` + `DiagnosticReport` | Banyak varian LOINC per metode/unit; simpan kode dari lab sumber, jangan dipaksa satu kode |
| CTA, echo, X-ray | `DiagnosticReport` (+ `ImagingStudy` opsional) | Simpan kesimpulan & diameter aorta dari laporan, bukan gambar |
| Riwayat keluarga | `FamilyMemberHistory` | Relasi + kondisi (SNOMED/ICD-10) |
| Diagnosis lampau | `Condition` | ICD-10 (dipakai SATUSEHAT) + SNOMED |
| Vaksinasi | `Immunization` | Kode vaksin (CVX / KFA Indonesia) |

### 3.4 FHIR R4 JSON-only pipeline

Keputusan notulensi: semua pesan internal = FHIR R4 JSON, representasi legacy dihapus. Analisis:

- **Untung:** satu kontrak data (prinsip A1), ekspor/impor gratis, siap SATUSEHAT/HIE, siap split `/core` vs `/connectors`.
- **Biaya:** Dexie sekarang menyimpan objek datar (`readings`, `labResults`). Pindah total ke resource FHIR membuat query UI lebih berat. **Rekomendasi:** FHIR sebagai *kontrak di batas modul & sync* (adapter `toFHIR/fromFHIR` per tabel, diuji round-trip), sementara indeks Dexie tetap datar untuk UI. Ini tetap memenuhi "pipeline messaging FHIR-only" tanpa menulis ulang semua layar.
- **Prasyarat wajib:** validator FHIR resmi (HL7 Validator / HAPI) di CI dengan profil vital-signs `http://hl7.org/fhir/StructureDefinition/bp`. Tanpa itu, P1-7/P1-8 terulang di setiap resource baru.
- **Profil:** mulai dari profil dasar R4 + vital-signs; profil SATUSEHAT ditambahkan di `/connectors/satusehat` agar core tetap generik untuk open source.

### 3.5 Telemetri Bluetooth (Step 04)

Spesifikasi Bluetooth SIG Blood Pressure Service (0x1810), karakteristik Blood Pressure Measurement (0x2A35, *indicate*):
- Flags bit 0 unit (mmHg/kPa), bit 1 timestamp, bit 2 pulse, bit 3 user ID, bit 4 measurement status.
- Measurement status: gerakan tubuh, manset longgar, irregular pulse, posisi salah → **wajib disimpan dan ditampilkan**, dan reading bertanda tidak dipakai untuk ML/rata-rata secara default.
- SFLOAT special values (NaN 0x07FF, NRes 0x0800, ±INF) → tolak (audit P1-6).
- Web Bluetooth hanya didukung Chromium (tidak di Safari iOS). Fallback manual (Option B) wajib setara: validasi sama (`validateBPRange`), metadata posisi/lengan diisi user, bukan dikarang.
- Spesifikasi final perlu **daftar perangkat teruji** (merek yang umum di Indonesia, mis. Omron, A&D, Beurer) — banyak yang memakai protokol proprietary, bukan GATT standar.
- Protokol pengukuran rumah (ESH/ACC: 2 kali pagi & malam, 7 hari) bisa menjadi fitur "sesi HBPM" yang membuat rata-rata lebih valid untuk Health Score.

### 3.6 AortaLink Health Score (Step 05)

Belum didefinisikan di notulensi. Rekomendasi pendekatan bertahap:
1. **v3.0: skor transparan berbasis aturan**, bukan model ML hitam. Komponen yang bisa dijelaskan: kontrol BP (rata-rata HBPM vs target guideline terpilih), kepatuhan obat, faktor gaya hidup (merokok, BMI, aktivitas, natrium, tidur — beberapa sudah ada di Dexie), dan risiko 10 tahun (PREVENT/SCORE2). Mirip pendekatan AHA *Life's Essential 8* yang sudah tervalidasi; pertimbangkan memakainya sebagai basis daripada membuat skor baru.
2. Setiap skor menampilkan komponen, data yang dipakai, data yang kurang, dan guideline. Tetap pertahankan perilaku "menolak menebak" (`not_enough_data`).
3. **Hindari kata "diagnosis"** di UI dan klaim, kecuali produk memang akan didaftarkan sebagai SaMD. "Diagnostic summary" → "ringkasan kesehatan untuk dibawa ke dokter".
4. Model ML generasi berikutnya baru setelah ada data berlabel + protokol validasi (Kepmenkes 951/2026 meminta bukti performa di populasi Indonesia).

### 3.7 Care routing & knowledge base (Step 06–07)

- **Care routing** = mesin aturan deterministik berbasis guideline terpilih: red flag → darurat; BP ≥180/120 tanpa gejala → hubungi dokter hari ini; tren di atas target → jadwalkan kontrol; dst. Setiap aturan punya sumber (guideline + bagian) dan diuji unit test.
- **Multi-tier guidance:** non-farmakologis (DASH, natrium, aktivitas, tidur, stres), farmakologis (referensi obat, kepatuhan — sudah ada `medications`/`medicationLogs`; *bukan* rekomendasi dosis), komplementer (hanya intervensi dengan bukti; beri label tingkat bukti).
- **Konten:** skema item konten = `{topik, tier, ringkasan, sumber[], level bukti, tanggal review, reviewer}`. Developer dataset sebagai sumber utama; crawler hanya sumber allowlist (PubMed abstrak, situs Kemenkes, ringkasan guideline publik) yang menghasilkan **draft** untuk direview, tidak langsung tampil ke pasien.

### 3.8 Open source split (`/core` vs `/connectors`)

- `/core`: model domain + adapter FHIR, klasifikasi guideline, Health Score, aturan routing, validasi — **TypeScript murni tanpa React/Dexie/Express**, agar bisa diuji dan dipakai ulang.
- `/connectors`: Dexie storage, server sync Mongo, BLE, SATUSEHAT, PDF/ekspor.
- Sebelum rilis publik: bersihkan riwayat dari secret (audit A6), pilih lisensi (Apache-2.0 memberi perlindungan paten), tambahkan disclaimer medis, dan selesaikan test minimum (audit: repo belum punya automated test).

### 3.9 Privasi & keamanan

- **UU 27/2022 (PDP):** data kesehatan = data pribadi spesifik → butuh dasar pemrosesan eksplisit (consent), DPIA, hak hapus (selaras dengan perbaikan tombstone A3), notifikasi kebocoran.
- Kepmenkes 951/2026 juga menuntut minimisasi data, retensi berbasis consent, dan pelaporan insiden untuk produk AI.
- Crawling & AI tidak boleh mengirim data pasien ke layanan pihak ketiga tanpa consent.

---

## 4. Urutan pengerjaan yang disarankan

| Fase | Isi | Alasan urutan |
|---|---|---|
| 0 — Fondasi | Sisa audit A3 (stale upsert, cleanup duplikat legacy), validator FHIR di CI + fix P1-7/P1-8, test minimum | FHIR-only tidak aman sebelum ekspor valid |
| 1 — Data | Kontrak FHIR internal, skrining onboarding (Step 03), BLE final + fallback (Step 04), guideline selectable | Health Score butuh data yang benar dulu |
| 2 — Kecerdasan | Health Score transparan (Step 05), care routing + red flag (Step 06) | Bergantung pada guideline & data |
| 3 — Konten | Knowledge base & tata kelola konten (Step 07), pipeline crawling | Butuh reviewer klinis |
| 4 — Rilis | Split `/core`/`/connectors`, lisensi, keputusan regulasi SaMD, konektor SATUSEHAT | Setelah API core stabil |

## 5. Pertanyaan terbuka untuk tim

1. Apakah v3.0 akan diposisikan **non-alkes** (edukasi + tracker, tanpa klaim diagnosis) atau **didaftarkan sebagai SaMD**? Ini menentukan wording Step 05 dan beban validasi.
2. Guideline default untuk pengguna Indonesia: ESH/PERHI (140/90) atau ACC/AHA (130/80)?
3. Siapa reviewer klinis untuk konten Step 07 dan aturan routing Step 06?
4. Perangkat BLE mana yang menjadi target uji?
5. Apakah integrasi SATUSEHAT (baca/tulis) masuk scope v3.0 atau setelah open source?

## Sumber

- 2025 ACC/AHA hypertension guideline — ringkasan: [HCPLive](https://www.hcplive.com/view/breaking-down-2025-acc-aha-hypertension-guidelines-viet-le-pa-c-dmsc), [AHA Professional — PREVENT](https://professional.heart.org/en/science-news/use-of-risk-assessment-to-guide-decision-making-for-blood-pressure-management/top-things-to-know)
- 2024 ESC elevated BP & hypertension: [ESC press release](https://www.escardio.org/news/press/press-releases/New-ESC-Hypertension-Guidelines-recommend-intensified-BP-targets-and-introduce-a-novel-elevated-blood-pressure-category-to-better-identify-people-at-risk-for-heart-attack-and-stroke/), [ACC key points](https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2024/09/05/14/11/2024-esc-guidelines-for-bp-esc-2024)
- 2024 ESC peripheral arterial & aortic diseases: [PubMed 39210722](https://pubmed.ncbi.nlm.nih.gov/39210722/)
- ADD-RS ± D-dimer meta-analysis: [PMC11192411](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11192411/)
- FHIR R4 BP profile: [hl7.org/fhir/R4/observation-bp](https://www.hl7.org/fhir/R4/observation-bp.html)
- SATUSEHAT & Permenkes 24/2022: [Kemenkes — Mengenal SATUSEHAT](https://www.kemkes.go.id/eng/understanding-satusehat), [JMIR Formative 2025 (FHIR PHR Indonesia)](https://formative.jmir.org/2025/1/e51270)
- Kepmenkes 951/2026 alkes berbasis software: [SIP Law Firm](https://siplawfirm.id/resources/alat-kesehatan-berbasis-software-kepmenkes-951-2026), [Veritask](https://veritask.ai/id/artikel/kepmenkes-951-2026-perketat-aturan-alat-kesehatan-berbasis-ai)
- Bluetooth BP Measurement 0x2A35: [Wireshark BT ATT reference](https://www.wireshark.org/docs/dfref/b/btatt.html), Bluetooth SIG Blood Pressure Service spec
