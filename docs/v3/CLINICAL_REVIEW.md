# AortaLink v3.0 — Review Klinis (Panel Persona Simulasi)

> **Tanggal:** 2026-10-01 · **Metode:** panel multi-persona ala MiroFish, empat reviewer AI independen yang masing-masing membaca [`RESEARCH_ANALYSIS.md`](./RESEARCH_ANALYSIS.md), kode `master` dan issue terkait, lalu memverifikasi lewat pencarian web.
>
> ⚠️ **Ini pre-review, bukan validasi klinis.** Bila nanti didaftarkan sebagai SaMD (Kepmenkes HK.01.07/MENKES/951/2026). Pendaftaran membutuhkan validasi klinis di populasi Indonesia dengan klinisi berlisensi sebagai PI, persetujuan KEPK, dan produsen berbadan hukum. Review AI tidak dapat menggantikan atau menandatangani bagian mana pun dari itu. Butir bertanda *perlu verifikasi* belum boleh dikodekan.

## 1. Keputusan yang sudah diambil

| # | Keputusan | Oleh |
|---|---|---|
| D1 | v3.0 **dibangun dengan standar SaMD** tapi belum didaftarkan: rilis publik = **non-alkes**; fitur SaMD hanya di **mode riset/akademik** (KEPK + dokter PI) untuk jurnal/tesis/skripsi ([#28](https://github.com/fk0u/AortaLink/issues/28)) | Ghani, 2026-10-01 |
| D2 | Guideline default **ESH 2023 / PERHI** (≥140/90); ACC/AHA 2025 dan ESC 2024 bisa dipilih | Ghani, 2026-10-01 |
| D3 | Pre-review klinis lewat panel persona AI sampai ada klinisi | Ghani, 2026-10-01 |

## 2. Sintesis lintas panel

### 2.1 Konsensus (semua panel setuju)
1. **Gejala selalu mengalahkan angka.** Red flag dievaluasi on-device, deterministik, sebelum angka BLE. Jawaban "tidak yakin" dihitung sebagai "ya".
2. **Ambang darurat mengikuti default ESH:** sistolik ≥180 **atau** diastolik ≥110, bukan ≥180/120 seperti di §3.7. Dengan gejala → 119/IGD sekarang. Tanpa gejala → satu kali ukur ulang → hubungi dokter hari ini (ACC/AHA 2025 menyebutnya *severe hypertension*, ditangani rawat jalan).
3. **Ambang rumah berbeda dari klinik:** HBPM ESH/ESC ≥135/85. Membandingkan rata-rata rumah dengan 140/90 akan melewatkan hipertensi. Ini celah terbesar di §3.1.
4. **Health Score = AHA Life's Essential 8 apa adanya** (8 metrik, 0–100, rata-rata sama bobot), total hanya bila 8 metrik lengkap. Risiko 10 tahun (PREVENT/SCORE2) dan kepatuhan obat ditampilkan terpisah agar tidak dihitung ganda. Validasi LE8 di populasi Indonesia belum ditemukan.
5. **Tidak ada saran obat.** Daftar obat, pengingat, kepatuhan dan referensi BPOM/PIO boleh. Mengubah dosis, memulai/menghentikan obat, kronoterapi, pengecekan interaksi dan substitusi herbal tidak boleh.
6. **Kata "diagnosis" tetap dihindari** walau SaMD, karena klaim menentukan kelas risiko.
7. **Data aorta harus terstruktur:** diameter + unit + segmen + modalitas imaging. Pakai ICD-10 WHO (bukan ICD-10-CM). Interval surveilans ditetapkan dokter; aplikasi hanya mengingatkan.

### 2.2 Konflik yang perlu keputusan
| Isu | Panel IGD | Panel regulatory | Rekomendasi |
|---|---|---|---|
| Triage gejala dinamis (R1–R14) | Wajib, 14 aturan berurutan | Membuat fungsi menjadi IMDRF kategori III → kemungkinan **Kelas C** | **Terselesaikan oleh D1:** mode publik = layar darurat statis; R1–R14 hanya di mode riset. Semula: **v3.0: layar darurat statis** (tombol 119/112 + daftar gejala yang dibaca pasien sendiri, selalu terlihat) → target **Kelas B**. Mesin aturan R1–R14 dibangun dan diuji, tapi dirilis di v3.x setelah QMS jalan. *Perlu keputusan Ghani.* |
| Tampilkan target BP akut aorta (sistolik <120, HR 60–80) | — | — | Panel aorta: **jangan** tampilkan ke pasien di rumah; target rumah <130/80. |

### 2.3 Bug kode yang ditemukan panel (master `9dbfcaa`)
| Lokasi | Masalah | Panel |
|---|---|---|
| `src/utils/bp-classifier.ts` | Nilai desimal (mis. 129,5 / 139,5) jatuh ke "normal"; tidak ada ESH grade 3 (≥180/≥110); ISH di-hardcode 140/90 untuk semua guideline; ≥180/120 selalu → IGD tanpa cek gejala; target anak <115/75 salah (harus dikecualikan); interpretasi pulse pressure & rate-pressure product = klaim diagnostik tak tervalidasi | Kardiologi |
| `src/utils/advanced-analytics.ts:184` | Menyarankan "evaluasi dosis atau kronoterapi obat malam" | Regulatory/farmasi |
| `src/utils/advanced-analytics.ts:247` | "untuk penyesuaian dosis obat" | Regulatory/farmasi |
| `src/services/bluetooth/ble-service.ts:309` | Posisi masih di-hardcode `'duduk'` (audit P1-6) | Regulatory |
| `src/services/fhir/fhir-exporter.ts:161` | LOINC `14927-8` masih salah (audit P1-7) | Regulatory |

### 2.4 Hazard teratas (ISO 14971, gabungan)
1. Rata-rata BP rumah dibandingkan ambang klinik → hipertensi terlewat.
2. BP normal menurunkan level pasien yang bergejala; layar darurat tidak terjangkau (login/onboarding/offline).
3. Data perangkat buruk (SFLOAT special value, flag gerak/manset diabaikan, mm vs cm diameter aorta).
4. Pasien mengubah obat karena label, skor, atau teks rekomendasi.
5. Aturan dewasa/default dipakai untuk anak, kehamilan, lansia rapuh, pasien sindromik (Marfan, Turner) atau perempuan dengan AAA (ambang lebih rendah).
6. Pengingat surveilans aneurisma terlewat; teks menenangkan dari Health Score/asisten AI bertentangan dengan red flag.

### 2.5 Masih perlu verifikasi
Ambang BP rendah & nadi ekstrem (R8, R9, R12); versi guideline sinkop & AF; cakupan PSC 119 per daerah dan 118; interval TAA 5,0–5,4 cm; target HR kronis; trigger pertumbuhan 1 cm/th ESC; panduan fluoroquinolone; kode LOINC diameter aorta; ICD-10 Loeys-Dietz & katup bikuspid; cut-off BMI Asia & kuesioner diet Indonesia untuk LE8; pemetaan IMDRF → kelas A–D resmi di Kepmenkes 951/2026 dan tanggal penetapannya (7 vs 14 Sep 2026).

---

# Lampiran — laporan lengkap tiap panel


---

## Panel Klinis AortaLink v3.0 — Review Kardiologi/Hipertensi (Sp.JP, PERHI)

Basis: `docs/v3/RESEARCH_ANALYSIS.md`, `src/utils/bp-classifier.ts`. Keputusan: default ESH 2023/PERHI (≥140/90); ACC/AHA 2025 & ESC 2024 opsional. Status SaMD → semua di bawah adalah *requirement*, bukan saran.

## 1. Tabel klasifikasi terverifikasi

Aturan umum (semua guideline): **kategori = kategori tertinggi yang dicapai SISTOLIK ATAU DIASTOLIK** ("and/or"). Satuan bulat mmHg; input non-integer harus ditolak/dibulatkan sebelum klasifikasi. Klasifikasi resmi berbasis **rata-rata** (≥2 pengukuran office; sesi HBPM), bukan satu reading.

**A. ESH 2023 / PERHI 2021 (default)** — office
| Kategori | SBP | | DBP | Label pasien |
|---|---|---|---|---|
| Optimal | <120 | dan | <80 | "Optimal" |
| Normal | 120–129 | dan/atau | 80–84 | "Normal" |
| Normal-tinggi | 130–139 | dan/atau | 85–89 | "Normal-tinggi — perlu dipantau" |
| Hipertensi derajat 1 | 140–159 | dan/atau | 90–99 | "Tekanan darah tinggi derajat 1" |
| Hipertensi derajat 2 | 160–179 | dan/atau | 100–109 | "Tekanan darah tinggi derajat 2" |
| Hipertensi derajat 3 | ≥180 | dan/atau | ≥110 | "Tekanan darah sangat tinggi (derajat 3)" |
| Hipertensi sistolik terisolasi (HST) | ≥140 | dan | <90 | flag tambahan, digrade menurut SBP |
| Hipertensi diastolik terisolasi | <140 | dan | ≥90 | flag tambahan, digrade menurut DBP |

Out-of-office ESH: **HBPM ≥135 dan/atau ≥85**; ABPM 24 jam ≥130/80, siang ≥135/85, malam ≥120/70. HBPM hanya memberi biner "di atas/di bawah ambang", **tidak ada grade** untuk rumah.
Target ESH (perlu verifikasi angka per usia di naskah asli): 18–64 th SBP 120–129; 65–79 th SBP 130–139 (120–129 bila ditoleransi); ≥80 th 140–150 (130–139 bila ditoleransi); DBP 70–79.

**B. ACC/AHA 2025** (kategori sama dengan 2017) — office
| Kategori | SBP | | DBP | Label |
|---|---|---|---|---|
| Normal | <120 | dan | <80 | "Normal" |
| Meningkat (elevated) | 120–129 | dan | <80 | "Meningkat" |
| Hipertensi tahap 1 | 130–139 | atau | 80–89 | "Tekanan darah tinggi tahap 1" |
| Hipertensi tahap 2 | ≥140 | atau | ≥90 | "Tekanan darah tinggi tahap 2" |
| Hipertensi berat | **>180** | dan/atau | **>120** | "Sangat tinggi — ikuti panduan tindakan" (bukan "krisis") |
HBPM setara (tabel 2017; retensi di 2025 perlu verifikasi): 120/80↔120/80, 130/80↔130/80, 140/90↔135/85, 160/100↔145/90. HST ACC/AHA = SBP ≥130 dan DBP <80.
Obat stage 1: penyakit KV/DM/PGK atau **PREVENT 10-th ≥7,5%**; bila <7,5% → gaya hidup 3–6 bulan lalu evaluasi. Target <130/80, dorong SBP <120.

**C. ESC 2024** — office
| Kategori | SBP | | DBP | Label |
|---|---|---|---|---|
| Tidak meningkat | <120 | dan | <70 | "Tidak meningkat" |
| Meningkat | 120–139 | atau | 70–89 | "Meningkat" |
| Hipertensi | ≥140 | atau | ≥90 | "Tekanan darah tinggi" |
HBPM: hipertensi ≥135/85; meningkat 120–134/70–84; tidak meningkat <120/70 (rentang "meningkat" rumah perlu verifikasi). Obat pada BP meningkat 130–139/80–89 hanya bila risiko tinggi (SCORE2/SCORE2-OP ≥10%, atau PKV/DM/PGK/FH) setelah 3 bulan gaya hidup. Target SBP 120–129 (prinsip ALARA bila tak toleran, >85 th, frail).

**Temuan pada `bp-classifier.ts` (wajib diperbaiki):**
- Kategori hard-coded ACC/AHA tetapi berlabel "AHA/WHO"; label "Pre-Hipertensi" adalah istilah JNC7 (usang) — hapus.
- Celah input desimal: 129,5/70 dan 139,5/70 jatuh ke `normal` (pakai rentang `>=130 && <=139`). Gunakan pola kaskade `>=` saja, atau tolak non-integer.
- "Krisis Hipertensi" (>180/>120) langsung menyuruh ke IGD: ACC/AHA 2025 memisahkan *hipertensi berat tanpa kerusakan organ* (rawat jalan, hubungi dokter hari itu, ulang ukur) dari *emergensi* (dengan gejala → 119/IGD). Routing harus berbasis gejala.
- Mode ESH tidak punya kategori ≥180/≥110 (derajat 3) — threshold berbeda dari ACC/AHA (>180/>120).
- `isISH` memakai 140/90 di semua mode; ikuti guideline terpilih.
- `getAgeStratifiedTarget`: target anak "<115/75" salah (pediatri pakai persentil; ≥13 th AAP 2017 <120/<80) → keluarkan anak <18 dari klasifikasi dewasa sama sekali. Label "JNC-8" tidak sesuai guideline default.
- Interpretasi PP>60 = "kekakuan aorta", PP<30 = "curah jantung rendah", ambang RPP — klaim diagnostik tanpa validasi untuk pengukuran manset rumah. Hapus dari UI pasien.

## 2. Health Score (issue #16)

**Basis yang saya terima:** AHA Life's Essential 8 (LE8) apa adanya, tanpa bobot karangan. 8 metrik masing-masing 0–100, skor total = **rata-rata tak berbobot** (bobot 1/8). Kategori: 80–100 tinggi, 50–79 sedang, 0–49 rendah.
| Metrik | Sumber data AortaLink | Catatan adaptasi Indonesia |
|---|---|---|
| Tekanan darah | rata-rata HBPM ≥ sesi valid | LE8: <120/<80=100; 120–129/<80=75; 130–139 atau 80–89=50; 140–159 atau 90–99=25; ≥160 atau ≥100=0; −20 bila diobati. Poin mengikuti LE8, **bukan** guideline terpilih (jelaskan di UI) |
| Nikotin | kuesioner (termasuk rokok elektrik, kretek, paparan pasif) | — |
| BMI | tinggi/berat | Cut-off LE8 Barat (25/30); ambang Asia (23/27,5) → perlu keputusan & verifikasi |
| Lipid (non-HDL) | lab FHIR | — |
| Glukosa (HbA1c/GDP) | lab FHIR | — |
| Aktivitas fisik | menit/minggu | — |
| Tidur | jam/malam | — |
| Diet | kuesioner (MEPA/DASH) | Instrumen diet tervalidasi Indonesia belum ada → perlu verifikasi |

**Data minimum:** BP = ≥1 sesi HBPM (≥12 reading valid dalam 3–7 hari, reading berbendera BLE/irregular dikecualikan); lab ≤12 bulan; kuesioner ≤3 bulan. Skor total **hanya** jika 8/8 metrik tersedia; bila tidak → tampilkan skor per metrik + "data belum lengkap" (`not_enough_data`), jangan imputasi.
**Jangan dimasukkan ke skor:** risiko 10-th PREVENT/SCORE2 (tampilkan terpisah, dengan disclaimer populasi; dobel hitung BP/lipid/merokok), kepatuhan obat (metrik proses, bukan kesehatan; tampilkan sebagai indikator terpisah).
**Output yang tidak boleh pernah tampil:** kata "diagnosis"/"Anda menderita"; probabilitas penyakit/diseksi/aneurisma; "usia jantung/usia pembuluh"; prediksi kejadian (serangan jantung/stroke) dari skor; saran mulai/ubah/stop/dosis obat; skor tunggal tanpa rincian komponen & tanggal data; perbandingan peringkat dengan pengguna lain; skor yang dihitung dari reading berbendera.
**Studi validasi klinis (Kepmenkes 951/2026, populasi Indonesia):** (a) akurasi implementasi: skor app vs perhitungan manual LE8 oleh 2 klinisi (ICC, kesepakatan kategori, κ); (b) validitas konstruk: korelasi dengan faktor risiko & PREVENT/SCORE2 di kohort Indonesia; (c) validitas prediktif (jangka panjang/registri): asosiasi kategori dengan MACE (HR, C-statistic, kalibrasi); (d) sensitivitas terhadap kualitas data HBPM (bias reading rumah vs ABPM); (e) pemahaman pengguna & risiko salah tafsir (usability, IEC 62366) termasuk lansia & literasi rendah; (f) subgrup: usia, jenis kelamin, DM, PGK, etnis/wilayah.

## 3. Koreksi RESEARCH_ANALYSIS.md

**§3.1**
1. Baris ESH/PERHI tidak lengkap: hilang kategori **Normal 120–129/80–84** dan derajat 2–3; "optimal <120/<80" benar.
2. "Stage 2 ≥140/≥90", "Hipertensi ≥140/≥90" → tulis **"≥140 atau ≥90"**; semua kategori memakai logika SBP atau DBP (kecuali normal/elevated ACC/AHA yang butuh DBP <80 *dan*).
3. "Risiko untuk mulai obat ESH 2023: SCORE2" menyesatkan: ESH 2023 merekomendasikan obat untuk derajat 1 terlepas dari risiko (segera bila risiko tinggi/HMOD, setelah 3–6 bulan gaya hidup bila risiko rendah); risiko dipakai terutama untuk normal-tinggi (perlu verifikasi kalimat persis).
4. ESC 2024: tambahkan ambang SCORE2/SCORE2-OP **≥10%** untuk mengobati BP meningkat 130–139/80–89.
5. Target ESH "<140/90 lalu <130/80" terlalu sederhana — target bergantung usia (lihat §1A).
6. ACC/AHA 2025: tambahkan bahwa PREVENT ≥7,5% juga memicu target SBP intensif ~120, dan istilah "krisis/urgensi" diganti "hipertensi berat" vs "emergensi".
7. Tabel tidak menyebut ambang HBPM — ini yang paling penting untuk aplikasi rumah: membandingkan rata-rata rumah dengan 140/90 akan **under-detect** hipertensi (harus 135/85).
8. PERHI saat ini mengacu Konsensus 2021 (mengikuti ESH 2018; kesesuaian penuh dengan ESH 2023 perlu verifikasi).

**§3.6**
1. "LE8 sudah tervalidasi": tervalidasi terutama di kohort AS/Eropa/Tiongkok; **belum ada validasi kohort Indonesia** (perlu verifikasi) → klaim harus diperlunak.
2. Usulan memasukkan PREVENT/SCORE2 dan kepatuhan obat ke skor bertentangan dengan LE8 dan menimbulkan dobel hitung — pisahkan.
3. "kontrol BP vs target guideline terpilih" → membuat skor berbeda antar mode guideline untuk pasien yang sama; gunakan poin LE8 tetap, target guideline ditampilkan terpisah.
4. Poin 3 ("hindari 'diagnosis' kecuali didaftarkan SaMD"): karena kini **didaftarkan SaMD**, larangan kata "diagnosis" tetap berlaku — kelas risiko ditentukan klaim; klaim diagnostik menaikkan kelas dan beban validasi.
5. Natrium & tidur bukan komponen LE8 terpisah dengan nama itu (natrium masuk diet) — selaraskan.

## 4. Top 5 hazard klinis (ISO 14971)

| # | Hazard | Harm | Mitigasi |
|---|---|---|---|
| H1 | Rata-rata HBPM dibandingkan ambang office 140/90 / satu reading dipakai untuk label | Hipertensi tak terdeteksi → stroke/IMA/diseksi; atau overlabel → cemas/overtreatment | Ambang per modalitas (HBPM 135/85), label resmi hanya dari sesi valid, unit test boundary tiap guideline |
| H2 | Reading ≥180/110 (ESH) / >180/120 dengan gejala (nyeri dada/punggung, sesak, defisit neurologis, gangguan penglihatan) tidak dirouting darurat, atau tanpa gejala selalu dikirim ke IGD | Under-triage emergensi/diseksi aorta (fatal); over-triage → beban IGD, kehilangan kepercayaan | Ulang ukur 5 menit + checklist gejala deterministik → 119/IGD; tanpa gejala → hubungi dokter hari ini; teks disetujui klinisi |
| H3 | Data perangkat salah (SFLOAT NaN, manset/posisi salah, aritmia/AF, perangkat tak tervalidasi) | Nilai palsu → keputusan salah | Tolak nilai spesial & di luar rentang, flag status BLE dikecualikan dari rata-rata/skor, daftar perangkat tervalidasi (STRIDE BP/ISO 81060-2), edukasi teknik ukur |
| H4 | Pasien menafsirkan kategori/Health Score sebagai izin mengubah/menghentikan obat (mis. "Normal"/skor tinggi saat sedang diobati) | Rebound hipertensi, kejadian KV | Label "terkontrol dengan obat", tidak ada saran obat, banner "jangan ubah obat tanpa dokter", poin LE8 −20 bila diobati dijelaskan |
| H5 | Klasifikasi dewasa/target usia diterapkan pada anak, kehamilan, lansia frail, atau hipotensi ortostatik | Anak/preeklamsia terlewat; lansia overtreatment → jatuh, sinkop | Eksklusi <18 th & hamil (rujuk; ambang kehamilan ≥140/90 + gejala → darurat), flag gejala ortostatik/SBP <100 pada lansia, target usia dari guideline terpilih |

## Sumber
- ESH 2023 ringkasan (ACC): https://www.acc.org/latest-in-cardiology/articles/2024/02/05/11/43/2023-esh-hypertension-guideline-update
- ESH 2023 (PMC): https://pmc.ncbi.nlm.nih.gov/articles/10527435
- ESC 2024 key points: https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2024/09/05/14/11/2024-esc-guidelines-for-bp-esc-2024
- ESC 2024 review (kategori, SCORE2 ≥10%, HBPM): https://pcronline.com/Cases-resources-images/Tools-and-Practice/The-Essentials/Hypertension/A-review-of-the-2024-ESC-Guidelines-on-elevated-blood-pressure-and-hypertension
- ACC/AHA 2025 (PREVENT, hipertensi berat): https://nephjc.com/news/accaha2025-klno3 ; https://journalfeed.org/article-a-day/2025/new-2025-aha-acc-hypertension-guidelines/ ; https://www.radcliffecardiology.com/news/new-bp-guideline-adopts-prevent-risk-assessment
- Life's Essential 8: https://pubmed.ncbi.nlm.nih.gov/35766027/
- Konsensus PERHI 2021: https://pkmbaruilir.balikpapan.go.id/files/20240902162459917181_6__konsensus-hipertensi-2021.pdf

---

## Review Panel Klinis — Kedokteran Emergensi (Sp.EM) · AortaLink v3.0 Step 06

> Simulasi review. Dasar: `docs/v3/RESEARCH_ANALYSIS.md` §3.2/§3.7 + issue #17. Bukan pengganti review klinis nyata (wajib sebelum rilis, Kepmenkes 951/2026).
> Prinsip: **sensitivitas di atas spesifisitas**. Gejala selalu menang atas angka. Satu "ya" pada red flag = eskalasi; tidak ada skor, tidak ada penjumlahan.

## 1. Tabel aturan red flag deterministik

Urutan evaluasi: R1→R14, **aturan pertama yang cocok menang** (tingkat tertinggi). Gejala dinilai *sebelum* angka BLE. Pertanyaan gejala ditanyakan setiap kali BP ≥180 sistolik / ≥110 diastolik atau <90 sistolik.

| ID | Pemicu (self-report / BLE) | Aksi | Pesan ke pasien (persis) | Sumber |
|---|---|---|---|---|
| R1 | Nyeri dada **mendadak** (berat/menekan/tajam/robek), dengan atau tanpa angka BP | CALL 119/IGD NOW | "Nyeri dada mendadak bisa tanda kondisi gawat. Telepon 119 sekarang atau segera ke IGD terdekat. Jangan menyetir sendiri." | 2021 AHA/ACC Chest Pain GL; ESC 2024 PAAD (AAS) |
| R2 | Nyeri dada/punggung/perut **mendadak, hebat, terasa robek/menjalar**, ATAU nyeri + pingsan/lemas sesisi | CALL 119/IGD NOW | "Nyeri hebat mendadak di dada, punggung, atau perut perlu diperiksa di IGD sekarang. Telepon 119 atau ke IGD terdekat. Sampaikan ke petugas: nyeri mendadak seperti robek." | ACC/AHA 2022 Aortic GL; ESC 2024 PAAD |
| R3 | Riwayat aneurisma aorta/diseksi/Marfan/katup bikuspid (Step 03) + nyeri dada/punggung/perut **baru** apa pun | CALL 119/IGD NOW | "Dengan riwayat penyakit aorta Anda, nyeri baru di dada, punggung, atau perut harus diperiksa di IGD sekarang. Telepon 119." | ADD-RS: kondisi risiko tinggi (PLoS One 2024) |
| R4 | BE-FAST: hilang keseimbangan, gangguan penglihatan mendadak, wajah mencong, lengan/tungkai lemah/kebas sesisi, bicara pelo — **walau sudah hilang** | CALL 119/IGD NOW | "Ini bisa tanda stroke. Telepon 119 sekarang. Catat jam gejala pertama muncul. Jangan makan, minum, atau minum obat apa pun." | BE-FAST (Aroor 2017, PubMed 28082668) |
| R5 | Pingsan / hampir pingsan (sinkop), terutama saat aktivitas, dengan nyeri dada, atau berdebar | CALL 119/IGD NOW | "Pingsan bisa disebabkan masalah jantung atau pembuluh darah. Telepon 119 atau segera ke IGD. Jangan berdiri atau menyetir." | ESC 2018 Syncope (red flag) — perlu verifikasi versi terbaru |
| R6 | Sesak napas mendadak/berat, tidak bisa bicara satu kalimat, bibir kebiruan | CALL 119/IGD NOW | "Sesak napas berat perlu pertolongan segera. Telepon 119 atau ke IGD terdekat sekarang." | Triase IGD umum (ATS/ESI) |
| R7 | BP ≥180 sistolik **atau** ≥110 (ESH) / >120 (ACC/AHA) diastolik **+ gejala**: nyeri dada, sesak, sakit kepala hebat mendadak, gangguan penglihatan, lemah sesisi, bingung, kejang | CALL 119/IGD NOW | "Tekanan darah Anda sangat tinggi dan disertai keluhan. Ini kondisi darurat. Telepon 119 atau segera ke IGD. Jangan menunggu ukur ulang." | ACC/AHA 2025 HBP GL; ESH 2023 (hypertensive emergency = BP berat + HMOD akut) |
| R8 | Sistolik <90 **+** pusing berat/pingsan/bingung/dingin-pucat/nyeri dada | CALL 119/IGD NOW | "Tekanan darah Anda rendah dan disertai keluhan. Telepon 119 atau segera ke IGD." | Konsensus klinis — perlu verifikasi ambang |
| R9 | Nadi (BLE) <40 atau >130 /menit **+** gejala (pusing, sesak, nyeri dada, pingsan) | CALL 119/IGD NOW | "Denyut nadi Anda sangat lambat/cepat dan disertai keluhan. Telepon 119 atau segera ke IGD." | Konsensus klinis — perlu verifikasi ambang |
| R10 | BP ≥180 sistolik atau ≥110 diastolik, **tanpa gejala**, **terkonfirmasi** setelah ukur ulang (RM) | SEE DOCTOR TODAY | "Tekanan darah Anda sangat tinggi walau tanpa keluhan. Hubungi dokter atau datangi puskesmas/klinik hari ini. Jangan menambah dosis obat sendiri. Jika muncul nyeri dada, sesak, lemah sesisi, atau sakit kepala hebat, telepon 119." | ACC/AHA 2025 ("severe hypertension" tanpa kerusakan organ → rawat jalan, bukan IGD); ESH 2023 |
| R11 | Pembacaan pertama ≥180/110 tanpa gejala, atau nilai mustahil/flag BLE (manset longgar, gerak) | RE-MEASURE | "Istirahat duduk 5 menit, punggung bersandar, kaki menapak, lengan setinggi jantung, jangan bicara. Ukur 2 kali, jeda 1 menit. Jika ada nyeri dada, sesak, atau lemah sesisi, jangan ukur ulang — telepon 119." | ESH 2023 HBPM; Bluetooth SIG BPS status flags |
| R12 | Sistolik <90 atau nadi <50 / >120 tanpa gejala, terkonfirmasi; atau sinkop yang sudah pulih tanpa red flag lain | SEE DOCTOR TODAY | "Hasil ini perlu dinilai dokter hari ini. Bila muncul pusing berat, pingsan, atau nyeri dada, telepon 119." | Konsensus klinis — perlu verifikasi |
| R13 | Flag BLE *irregular pulse* berulang (≥2 sesi) tanpa gejala | SEE DOCTOR SOON | "Alat mendeteksi denyut tidak teratur beberapa kali. Ini bukan diagnosis, tetapi sebaiknya diperiksakan ke dokter dalam 1–2 minggu (rekam EKG)." | ESC 2024 AF (skrining) — perlu verifikasi |
| R14 | Rata-rata HBPM 7 hari di atas target guideline terpilih; beda sistolik lengan kanan-kiri ≥15 mmHg berulang tanpa gejala | SEE DOCTOR SOON | "Rata-rata tekanan darah Anda di atas target. Jadwalkan kontrol ke dokter dalam beberapa minggu dan bawa ringkasan ini." | ESH 2023 (HBPM, inter-arm difference) |

Catatan implementasi:
- Setiap aturan: `{id, versi, guidelineId+bagian, ambang, pesan_id}`; unit test per aturan + test batas (179/180, 109/110, 89/90). Ambang diastolik default = **≥110 (ESH/PERHI)**, lebih konservatif dari ACC/AHA >120; jangan pakai yang longgar.
- R11 maksimum satu putaran ukur ulang. Jika sesi ulang dibatalkan/tidak selesai → perlakukan sebagai R10, **bukan** "normal".
- Gejala yang dijawab "tidak yakin" = "ya".
- Beda tensi lengan **bukan prasyarat**: jangan minta pasien nyeri dada mengukur dua lengan dulu.

## 2. Persyaratan UX layar darurat

Wajib:
- Dapat diakses **tanpa login, tanpa onboarding, tanpa consent wall, offline** (aset dibundel; tidak ada fetch). Tombol "Darurat" persisten di semua layar termasuk landing & mode guest.
- **Nomor terverifikasi:** **119** = layanan gawat darurat medik Kemenkes (NCC → PSC kab/kota, 24 jam, bebas biaya). **112** = layanan panggilan darurat terpadu pemda (bebas pulsa, 24 jam), cakupan per kab/kota belum merata. Tampilkan 119 primer, 112 sekunder. 118 (ambulans lama) — jangan dipakai sebagai primer, perlu verifikasi per daerah. Ketersediaan PSC 119 per kab/kota bervariasi → perlu verifikasi; sediakan juga "IGD terdekat" (peta OS, bukan API berbayar online-only).
- Satu tap = `tel:119` (dialer OS; jangan auto-dial). Target sentuh ≥48 dp, kontras AA, teks ≥18 pt, bahasa awam, bisa dibaca screen reader.
- Ringkasan "untuk petugas" (jam gejala mulai, BP terakhir + jam, obat yang diminum, riwayat aorta) — tampil lokal, tidak dikirim otomatis.
- Instruksi aman saja: berhenti aktivitas, jangan menyetir sendiri, buka pintu, minta orang lain menemani.
- Layar darurat **tidak bisa ditutup dengan satu ketukan tak sengaja** dan tidak tertutup notifikasi/iklan/modal rating. Log event (tanpa PII ke server tanpa consent) untuk PMS.

Aplikasi TIDAK BOLEH:
- Menghitung/menampilkan ADD-RS, "kemungkinan diseksi X%", skor risiko akut, atau "kemungkinan bukan serangan jantung".
- Menyarankan dosis tambahan/obat darurat (termasuk kaptopril sublingual, nifedipin, aspirin, nitrat) — tidak ada saran obat sama sekali.
- Menampilkan teks menenangkan ("mungkin hanya maag/otot") atau menurunkan level karena BP normal saat ada gejala.
- Menunda eskalasi dengan kuis panjang, ukur ulang, login, atau chat AI/LLM. Asisten (`local-assistant.ts`) tidak boleh menjawab di jalur red flag; rute langsung ke layar darurat.
- Menyimpan red flag hanya di server (harus deterministik on-device).

## 3. Koreksi §3.2 (dan §3.7) — diverifikasi

1. **Angka ADD-RS benar** (ADD-RS>0 sens 94,6%, spes 34,7%; ADD-RS>1 *atau* D-dimer>500 sens 98,3%, spes 51,4%) — tambahkan jurnal: *PLoS One* 2024. Tambahkan: ADD-RS=0 + D-dimer<500 sens 99,9% (alat rule-out IGD, bukan pasien). https://pmc.ncbi.nlm.nih.gov/articles/PMC11192411/
2. **Sitasi ESC 2024 PAAD terverifikasi** (Eur Heart J 2024;45(36):3538–3700). https://pubmed.ncbi.nlm.nih.gov/39210722/
3. **Ambang "≥180/120" di §3.7 tidak konsisten dengan default ESH/PERHI.** ESH 2023 memakai BP berat ~≥180/110 + HMOD akut untuk emergensi; grade 3 = ≥180/≥110. ACC/AHA 2025 memakai >180/120 dan mengganti istilah "hypertensive urgency" → "severe hypertension"; tanpa kerusakan organ akut → rawat jalan, **bukan IGD**. Aturan pakai ≥180 **atau** ≥110 (konservatif). https://pubmed.ncbi.nlm.nih.gov/37345492/ · https://www.healio.com/news/nephrology/20250903/top-10-prevention-takeaways-from-the-2025-high-blood-pressure-guideline · https://journalfeed.org/article-a-day/2025/new-2025-aha-acc-hypertension-guidelines/
4. **"Beda tensi lengan" sebagai red flag pasien** perlu diubah: di ADD-RS itu temuan pemeriksaan fisik (pulse deficit/SBP differential). Jadikan pemicu hanya bila **bersama gejala**; tanpa gejala → SEE DOCTOR SOON (R14).
5. **Red flag kurang lengkap:** tambah nyeri perut/pinggang mendadak (ruptur AAA), sesak berat, hipotensi bergejala, nyeri baru pada pasien dengan riwayat aorta (R3), dan BE-FAST (Balance+Eyes menurunkan stroke terlewat FAST dari 14,1% → 4,4%). https://pubmed.ncbi.nlm.nih.gov/28082668/
6. **"PSC 119 / IGD" → tambah 112** sebagai cadangan. https://farmalkes.kemkes.go.id/2016/06/kejadian-gawat-darurat-medik-laporkan-ke-119/ · https://teknologi.bisnis.com/read/20240830/101/1795608/tiru-as-kominfo-bakal-tingkatkan-layanan-panggilan-darurat-112-di-ri
7. Sitasi ACC/AHA 2022 Aortic GL lengkapi: Isselbacher et al., Circulation 2022;146:e334–e482 (halaman akhir perlu verifikasi). https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2022/11/01/12/17/2022-Guideline-on-Aortic-Disease-1-gl-ad
8. Ambang BP rendah & nadi ekstrem (R8, R9, R12) tidak ada di riset sama sekali → **perlu verifikasi** oleh panel (Sp.JP + Sp.EM) sebelum dikodekan.

## 4. Top 5 hazard under-triage (gaya ISO 14971)

| # | Hazard | Situasi berbahaya → Harm | Mitigasi (kontrol risiko) |
|---|---|---|---|
| H1 | BP normal/rendah menurunkan level saat ada nyeri dada (diseksi/IMA bisa normo/hipotensi) | Pasien menunda ke IGD → kematian/disabilitas | Gejala dievaluasi sebelum angka; tidak ada aturan yang mendowngrade gejala; test "nyeri dada + 120/80 → R1" |
| H2 | Layar darurat tak terjangkau (belum login, offline, sesi kedaluwarsa, crash sync) | Tidak ada arahan saat kritis → keterlambatan | Rute darurat tanpa auth/jaringan, dibundel; E2E test mode pesawat + guest + token kedaluwarsa |
| H3 | Gejala atipikal tidak tertangkap (wanita, lansia, diabetes; nyeri perut/punggung saja; stroke posterior) | Under-triage SKA/diseksi/stroke | Pertanyaan gejala luas (dada, punggung, perut, BE-FAST, sesak, pingsan); "tidak yakin" = ya; R3 untuk riwayat aorta |
| H4 | Loop ukur ulang/flag BLE (manset longgar, SFLOAT invalid) menunda eskalasi atau membuat reading tinggi dibuang | Hipertensi berat/emergensi terlewat | RE-MEASURE hanya tanpa gejala, maks 1 putaran; batal = R10; reading ber-flag tetap memicu cek gejala |
| H5 | Fitur lain menampilkan teks menenangkan (Health Score "baik", asisten AI, konten KB) bertentangan dengan red flag | Pasien mengabaikan peringatan | Red flag mengunci UI lain; asisten/KB diblokir di jalur darurat; review konten melarang reassurance akut; uji pesan konsisten |

Residual: aplikasi tidak dapat mendeteksi gejala yang tidak dilaporkan → label penggunaan wajib: "Aplikasi ini tidak mendeteksi keadaan darurat. Jika merasa gawat, telepon 119."

---

## Review Panel Klinis — Bedah Vaskular/Kardiotoraks (Aorta) · AortaLink v3.0

> Reviewer: simulasi, spesialis bedah vaskular/toraks, fokus penyakit aorta. Cakupan: RESEARCH_ANALYSIS.md §3.2, §3.3, §3.7; issue #13 (Step 03) dan #18 (Step 07).
> Status regulasi: v3.0 **akan** didaftarkan sebagai SaMD (Kepmenkes 951/2026). Angka di bawah ini nilai rujukan untuk tinjauan klinis, **bukan** logika keputusan otomatis. Butir bertanda **[perlu verifikasi]** wajib dicek di teks lengkap guideline sebelum dikodekan.
> Sumber: [ACC Key Perspectives 2022 Part 1](https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2022/11/01/12/17/2022-guideline-on-aortic-disease-1-gl-ad) · [Part 2](https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2022/11/01/12/21/2022-guideline-on-aortic-disease-2-gl-ad) · [ACC Key Points ESC 2024 PAAD](https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2024/09/03/18/59/2024-esc-guidelines-for-pad-esc-2024) · [ESC 2024 PubMed 39210722](https://pubmed.ncbi.nlm.nih.gov/39210722/) · [ESVS 2024 AAA highlights (EVToday)](https://evtoday.com/articles/2024-mar/highlights-from-the-esvs-2024-clinical-practice-guidelines-on-the-management-of-abdominal-aortoiliac-artery-aneurysms) · [Interval surveilans aorta asendens (PMC8630294)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8630294/)

## 1. Checklist faktor risiko aorta untuk onboarding (Step 03)

Prinsip: semua opsional, ada pilihan "tidak tahu", tidak memblokir akses (sesuai #13). Kode ICD-10 = versi WHO (dipakai SATUSEHAT), bukan ICD-10-CM. Semua kode SNOMED **[perlu verifikasi]** di browser SNOMED + status lisensi SNOMED untuk Indonesia.

| # | Item (pertanyaan ke pasien) | Resource FHIR | Code system / kode | Catatan |
|---|---|---|---|---|
| 1 | Keluarga inti (orang tua/saudara/anak) pernah aneurisma aorta | `FamilyMemberHistory` | relationship: v3-RoleCode (FTH, MTH, SIB, CHILD…); condition: ICD-10 I71.x / SNOMED | Kerabat derajat 1 ≥50 th pasien AAA → skrining USG (ESC 2024 kelas I) |
| 2 | Keluarga inti pernah diseksi aorta / meninggal mendadak <50 th tanpa sebab jelas | `FamilyMemberHistory` | ICD-10 I71.0; `deceasedAge` + `condition.contributedToDeath` | Pemicu edukasi skrining & genetik (ACC 2022) |
| 3 | Sindrom Marfan | `Condition` | ICD-10 Q87.4; SNOMED 19346006 | |
| 4 | Loeys-Dietz | `Condition` | ICD-10 WHO tak punya kode spesifik → Q87.8 + SNOMED **[perlu verifikasi]** | Ambang bedah lebih rendah; wajib rujuk |
| 5 | Ehlers-Danlos vaskular (vEDS) | `Condition` | ICD-10 Q79.6 (WHO tak bedakan subtipe) + SNOMED subtipe | Simpan subtipe di SNOMED, jangan hanya ICD-10 |
| 6 | Sindrom Turner | `Condition` | ICD-10 Q96.x; SNOMED 38804009 | **Hilang di riset** — ambang memakai ASI (cm/m²) |
| 7 | Katup aorta bikuspid | `Condition` | ICD-10 Q23.1 **[perlu verifikasi kecocokan]**; SNOMED 72352009 | Surveilans tiap 2–3 th setelah evaluasi awal (ESC 2024) |
| 8 | Koarktasio aorta (pernah/sudah dioperasi) | `Condition` + `Procedure` | ICD-10 Q25.1 | **Hilang di riset** |
| 9 | Takayasu / giant cell arteritis | `Condition` | ICD-10 M31.4 / M31.5–M31.6 | GCA jarang di Asia; Takayasu lebih relevan untuk perempuan muda Indonesia |
| 10 | Riwayat aneurisma/diseksi/operasi aorta pribadi | `Condition` + `Procedure` | ICD-10 I71.0–I71.9; prosedur: SNOMED (EVAR/TEVAR/open repair) | Membuka jalur "pasien terdiagnosis" (§2) |
| 11 | Hipertensi | `Condition` + `Observation` BP (85354-9) | ICD-10 I10–I15 | Sudah ada di pipeline BP |
| 12 | Merokok (aktif/bekas, pack-year) | `Observation` social-history | LOINC 72166-2 (value SNOMED); pack-year LOINC 8664-5 **[perlu verifikasi]** | Faktor risiko AAA terkuat yang dapat diubah |
| 13 | Penggunaan kokain/amfetamin | `Observation` social-history | LOINC/SNOMED **[perlu verifikasi]** | **Hilang di riset**; pemicu diseksi pada usia muda. Wording sensitif, opsional |
| 14 | Penyakit aterosklerotik (PJK, stroke, PAD) | `Condition` | ICD-10 I20–I25, I63, I73.9 | Terkait AAA |
| 15 | Usia & jenis kelamin biologis | `Patient.birthDate`, `Patient.gender` + ekstensi sex-at-birth **[perlu verifikasi profil SATUSEHAT]** | — | Dibutuhkan untuk ambang spesifik jenis kelamin |
| 16 | Kehamilan / rencana hamil (bila Marfan/Turner/bikuspid) | `Condition`/`Observation` | SNOMED | Kehamilan = periode risiko diseksi; harus rujuk |

## 2. Surveilans pasien TAA/AAA terdiagnosis

**Aturan desain:** interval & ambang **diisi/dikonfirmasi oleh dokter** (dari surat kontrol) — tabel ini hanya nilai default + "sanity check". Aplikasi tidak pernah menyimpulkan "aman", hanya mengingatkan dan menyarankan kontrol.

### 2a. AAA (infrarenal) — ACC/AHA 2022 (terverifikasi via ACC Part 2)

| Diameter maks. | Interval USG | Ambang rujuk/evaluasi bedah |
|---|---|---|
| 2,5–2,9 cm (ektasia) | **[perlu verifikasi]** ~tiap 10 th (bukan dari sumber yang dicek) | — |
| 3,0–3,9 cm | tiap 3 tahun | — |
| ♂ 4,0–4,9 / ♀ 4,0–4,4 cm | tiap 12 bulan | — |
| ♂ ≥5,0 / ♀ ≥4,5 cm | tiap 6 bulan | **sudah harus dalam pengawasan dokter bedah vaskular** |
| ♂ ≥5,5 / ♀ ≥5,0 cm | — | ambang repair (ACC 2022; ESC 2024 & ESVS 2024 sama: 55/50 mm) |
| Pertumbuhan ≥1 cm/th (AAA 4,0–5,5) **[perlu verifikasi di ESC]**, atau gejala (nyeri perut/punggung) | — | rujuk segera; nyeri akut = jalur darurat 119 |

### 2b. TAA / aorta asendens

| Kondisi | Interval imaging | Ambang rujuk bedah |
|---|---|---|
| Baru terdeteksi | ulang 6–12 bulan, lalu 6–24 bulan bila stabil (ACC 2022) | — |
| ≥4,5 cm | CT/MRI untuk evaluasi awal (ESC 2024) | rujuk konsultasi bedah **[ambang rujuk perlu verifikasi]** |
| ≥5,0–5,4 cm | **[perlu verifikasi]** ~tiap 6 bulan | ≥5,0 cm dapat dipertimbangkan di senter berpengalaman / CSA:tinggi ≥10 cm²/m |
| Sporadik | — | **≥5,5 cm** atau gejala atau tumbuh cepat |
| Marfan | — | akar aorta **≥5,0 cm** (≥4,5 cm bila risiko tinggi) |
| Bikuspid | tiap 2–3 th setelah evaluasi awal 1 th (ESC 2024) | ≥5,5 cm; 5,0–5,4 dengan faktor risiko; ≥4,5 cm saat ganti katup (ESC: pertimbangkan ≥4,5) |
| Turner | — | ASI ≥2,5 cm/m² (ACC 2022) — butuh BSA, bukan diameter mentah |
| Tumbuh cepat | — | ≥0,5 cm/th, atau ≥0,3 cm/th 2 th berturut (sporadik); ≥0,3 cm/th (Marfan/bikuspid) |

♀/kecil tubuh: ambang absolut kurang sensitif → simpan tinggi & berat agar dokter bisa memakai indeks (ASI/CSA:tinggi). Aplikasi **jangan** menghitung indeks untuk keputusan; tampilkan saja ke dokter.

### 2c. Target tekanan darah & nadi
- **Kronis (TAA/AAA/pasca-diseksi stabil):** <130/80 mmHg, sistolik 120–129 bila ditoleransi (ESC 2024 hipertensi/PAD; ACC 2022 untuk pasien aorta dengan hipertensi) **[perlu verifikasi kelas rekomendasi spesifik aorta]**. Target individual dari dokter mengalahkan default.
- **Nadi kronis:** tidak ada angka universal dari sumber yang dicek **[perlu verifikasi]**; tampilkan target dokter bila diisi.
- **Akut (sistolik <120, nadi 60–80):** target IGD/ICU. **Jangan** ditampilkan sebagai target rumah — pasien bisa hipotensi/sinkop.

### 2d. Jadwal kontrol pasca-diseksi / pasca-repair
| Kondisi | Jadwal imaging |
|---|---|
| Pasca-diseksi (dioperasi atau medikamentosa) | CT/MRI **1, 6, 12 bulan**, lalu **tiap tahun** bila stabil (ACC 2022) |
| Pasca-EVAR/TEVAR | CT 1 bulan, duplex 12 bulan, lalu tiap tahun (ESC 2024; TEVAR **[perlu verifikasi]**) |
| Pasca-open repair AAA | imaging dalam 1 tahun, lalu tiap 5 tahun (ESC 2024) |

Catatan radiasi/ginjal: CT berulang → tampilkan log eGFR/kontras sebagai info untuk dokter, bukan saran ganti modalitas.

## 3. Topik knowledge base Step 07 (modul komplikasi)

Level bukti mengikuti kelas/LOE guideline sumber; "—" = edukasi tanpa klaim intervensi. Semua **[perlu verifikasi LOE]** oleh reviewer saat input konten.

| Topik | Tier | Level bukti (perkiraan) |
|---|---|---|
| Mengenali gejala darurat diseksi/ruptur → 119 | non-farmako | Konsensus/ edukasi (tidak boleh ditunda review) |
| Berhenti merokok (konseling + farmakoterapi bantu) | non-farmako + farmako | Kelas I |
| Kontrol TD di rumah: cara ukur benar, kedua lengan saat awal | non-farmako | Kelas I (pengukuran) |
| Aktivitas fisik aman: aerobik sedang; hindari angkat beban berat/Valsalva, olahraga kontak | non-farmako | LOE C / konsensus |
| Pemulihan pasca-sternotomi / pasca-EVAR (luka, angkat beban, menyetir) | non-farmako | Konsensus/ protokol RS — **harus dari dokter operator** |
| Kepatuhan antihipertensi (beta-blocker, ARB) & efek samping | farmako (referensi + adherence) | Kelas I–IIa; tanpa dosis |
| Statin & antiplatelet pada AAA aterosklerotik | farmako | Kelas I (pencegahan CV) |
| Obat yang perlu didiskusikan dengan dokter: fluorokuinolon **[perlu verifikasi status di ACC/ESC]**, stimulan, dekongestan | farmako | LOE B–C/ observasional |
| Kehamilan pada Marfan/Turner/bikuspid | non-farmako + rujuk | Kelas I (konseling pra-hamil) |
| Skrining keluarga & tes genetik | non-farmako | Kelas I (ACC 2022; ESC 2024) |
| Komplikasi jangka panjang: endoleak, malperfusi, dilatasi lumen palsu | edukasi | — |
| Vaskulitis (Takayasu): kepatuhan imunosupresan, tanda kambuh | farmako + non-farmako | LOE C **[perlu reviewer reumatologi]** |
| Komplementer: teknik relaksasi/manajemen stres untuk TD | komplementer | Bukti lemah–sedang (efek kecil pada TD) |
| Komplementer: suplemen/herbal "pelebar/penguat pembuluh" | komplementer | **Tidak ada bukti** → tampilkan sebagai *peringatan*, bukan anjuran (risiko interaksi dengan antikoagulan/antiplatelet) |

## 4. Koreksi untuk dokumen riset

1. §3.2 checklist risiko **kurang**: Turner, koarktasio, kehamilan, stimulan (kokain/amfetamin), riwayat operasi aorta/katup, penyakit aterosklerotik, usia/jenis kelamin. HTAD non-sindromik (mis. ACTA2) cukup lewat "riwayat keluarga" + tes genetik.
2. §3.2 "beda tekanan lengan" sebagai red flag: aplikasi tidak boleh menyimpulkan apa pun dari dua pengukuran BLE serial; **tidak adanya** beda tekanan tidak menyingkirkan diseksi. Red flag tetap gejala, bukan angka.
3. §3.2 surveilans: belum ada **ambang spesifik jenis kelamin** (AAA ♀ lebih rendah 0,5 cm) dan indeks tubuh (ASI, CSA:tinggi) — wajib di model data.
4. §3.3 tabel imaging: perlu `Observation` terstruktur untuk **diameter aorta + segmen + modalitas + metode ukur** (CT inner-to-inner vs echo leading-edge berbeda 1–3 mm). Tanpa itu, "pertumbuhan" antar-modalitas palsu. Kode LOINC diameter aorta **[perlu verifikasi]**; fallback CodeSystem lokal + `text`.
5. §3.3: ICD-10 yang dipakai SATUSEHAT = WHO, bukan CM (Q79.63, Q87.40 adalah CM). Loeys-Dietz & vEDS perlu SNOMED agar tidak hilang spesifisitasnya.
6. §3.7 "BP ≥180/120 tanpa gejala → hubungi dokter hari ini": untuk **pasien aorta terdiagnosis** ambang harus lebih rendah dan disertai skrining gejala nyeri; usul aturan terpisah per profil aorta **[ambang perlu reviewer]**.
7. §3.7: tabel 3-tier perlu tier keempat/label "**hindari**" (kontraindikasi), mis. angkat beban berat, fluorokuinolon, herbal.
8. Dokumen sumber kedua: ringkasan ACC tentang ESC 2024 menulis "≥55 mm Hg" — salah satuan; jangan disalin ke kode.

## 5. Top 5 hazard

| # | Hazard | Harm | Mitigasi |
|---|---|---|---|
| 1 | Pengingat surveilans tertunda/terlewat (notifikasi OS dimatikan, timezone, data sinkron hilang) | AAA tumbuh melewati ambang → ruptur (mortalitas tinggi) | Interval dari dokter; reminder ulang + tampilan "lewat jadwal" persisten; uji unit tanggal; rekonsiliasi pasca-sync |
| 2 | Salah satuan/entri diameter (mm vs cm, 45 vs 4,5) atau beda modalitas dibaca sebagai pertumbuhan/regresi | Reassurance palsu atau kecemasan/rujukan tak perlu | Satuan wajib eksplisit, validasi rentang (1–12 cm), konfirmasi ganda, simpan modalitas; aplikasi tidak menyimpulkan "stabil" |
| 3 | Gejala diseksi dimasukkan tapi diarahkan ke alur non-darurat (mis. dianggap nyeri otot / skor rendah) | Keterlambatan terapi diseksi tipe A (mortalitas naik per jam) | Red flag = override absolut ke 119/IGD, tanpa skor; uji regresi; tombol darurat selalu terlihat |
| 4 | Ambang default dipakai pada sindrom (Marfan/LDS/vEDS/Turner) atau perempuan | Under-referral → diseksi pada diameter "di bawah ambang" | Profil sindrom/jenis kelamin mengubah tampilan ke "ikuti jadwal dokter"; tidak ada ambang generik untuk sindromik |
| 5 | Target TD akut (<120) atau konten KB tak tervalidasi ditampilkan ke pasien rawat jalan | Hipotensi/sinkop/jatuh; interaksi obat-herbal; penghentian obat | Hanya target TD dari dokter atau default kronis; konten wajib reviewer + tanggal review; label "hindari"; farmako tanpa dosis |

**Kesimpulan reviewer:** arah §3.2 benar (edukasi + surveilans + routing, tanpa ADD-RS). Wajib sebelum Fase 1: ambang spesifik jenis kelamin & sindrom, model data diameter terstruktur, dan aturan bahwa interval/ambang personal berasal dari dokter. Saya bersedia jadi reviewer konten diseksi/AAA untuk #18, dengan reviewer reumatologi untuk vaskulitis.

---

## Panel Review — Regulatory Affairs/QA & Farmasi Klinis · AortaLink v3.0 (SaMD)

> Reviewer: persona simulasi (RA/QA software medis + apoteker klinis). **Bukan opini regulator, konsultan berizin, atau apoteker berSTR.** Semua butir wajib dikonfirmasi ke Direktorat Pengawasan Alkes Kemenkes / konsultan regulatory. Basis: `docs/v3/RESEARCH_ANALYSIS.md`, `docs/AUDIT_LOGOS_AORTA.md`, issue #23 (keputusan 2026-10-01: daftar sebagai SaMD), grep kode `master` per 2026-10-01.

**Status verifikasi sumber.** Kepmenkes HK.01.07/MENKES/951/2026 = pedoman izin edar alkes berbasis perangkat lunak (SaMD, SiMD, AIMD/MLMD termasuk LLM) — ditetapkan 7 Sep 2026 menurut ringkasan Veritask; SIP Law menulis 14 Sep (kemungkinan tanggal publikasi) → *perlu verifikasi dari salinan resmi JDIH*. Ringkasan sekunder menyebut: klasifikasi berbasis intended use/klaim, ISO 13485, ISO 14971, IEC 62304, IEC 62366-1, IEC 82304-1, IEC 63450/63521 (AI), ISO 27001, validasi klinis wajib, sandbox regulasi (TRL 9), validasi populasi Indonesia ≤1 th pasca-izin (untuk impor risiko tinggi), PCCP/change control, PMS dengan RWD, minimisasi data & retensi berbasis consent. Software edukasi/wellness/administratif dikecualikan. Ketiga ringkasan tidak memuat tabel kelas → *pemetaan IMDRF→kelas A–D di bawah perlu verifikasi*.

---

## 1. Intended use & kelas risiko

**Draft intended use statement (v0, untuk dikonfirmasi):**
> *AortaLink adalah perangkat lunak mandiri (SaMD) untuk pasien dewasa (≥18 th) dengan hipertensi terdiagnosis atau risiko kardiovaskular, yang digunakan di rumah, untuk (1) merekam tekanan darah dari tensimeter otomatis berizin edar (via Bluetooth GATT 0x1810) atau input manual, (2) mengklasifikasikan bacaan dan rata-rata HBPM terhadap ambang guideline yang dipilih (default ESH/PERHI), (3) menampilkan skor kontrol kardiovaskular (Health Score) beserta komponennya, dan (4) menampilkan anjuran tindak lanjut berbasis aturan (kontrol rutin / hubungi dokter hari ini / segera ke IGD-119). Informasi ini mendukung — tidak menggantikan — keputusan pasien dan tenaga medis. AortaLink tidak mendiagnosis penyakit aorta, tidak menafsirkan citra, dan tidak merekomendasikan memulai, menghentikan, atau mengubah dosis obat.*

Kontraindikasi/batasan yang harus tertulis: kehamilan (preeklamsia butuh ambang lain), anak, fibrilasi atrium (akurasi osilometrik turun), pasien dialisis; bukan perangkat pemantauan darurat real-time.

**Klasifikasi IMDRF N12 (significance × state):**

| Fungsi | State of condition | Significance | Kategori IMDRF |
|---|---|---|---|
| Log BP, klasifikasi per guideline, tren | Serious (hipertensi: intervensi tepat waktu mencegah kerusakan ireversibel) | Inform clinical management | **II** |
| Health Score (rule-based, Life's Essential 8-like) | Serious | Inform | **II** |
| Care routing "hubungi dokter hari ini" (≥180/120) | Serious | Drive clinical management | **III** |
| Red flag nyeri dada/diseksi → IGD/119 dari input gejala | **Critical** (diseksi aorta) | Drive (triage) | **III** |
| ML pola/forecast (`src/services/ml/*`) | Serious | Inform | II |

Matriks: critical→IV/III/II, serious→III/II/I, non-serious→II/I/I (kolom treat-diagnose/drive/inform). [IMDRF N12](https://imdrf.org/sites/default/files/docs/imdrf/final/technical/imdrf-tech-140918-samd-framework-risk-categorization-141013.pdf)

**Kesimpulan:** dengan triage gejala dinamis → kategori III → kemungkinan **Kelas C** (risiko sedang-tinggi). Tanpa triage dinamis (red flag dibuat statis, lihat §2) → kategori II → kemungkinan **Kelas B**. *Perlu verifikasi* pemetaan resmi di Kepmenkes 951/2026 + aturan klasifikasi PMK 62/2017 / [Tata Cara Klasifikasi Regalkes](https://regalkes.kemkes.go.id/informasi_alkes/TataCaraKlasifikasi1.pdf). **Rekomendasi: targetkan Kelas B untuk v3.0**, tunda triage dinamis ke v3.x setelah QMS berjalan.

Catatan: tensimeter itu sendiri alkes Kelas B ([izin.co.id](https://izin.co.id/blog/apa-itu-alkes-dan-jenisnya/)); AortaLink hanya boleh mengklaim kompatibilitas dengan model yang **punya izin edar AKL/AKD dan tervalidasi klinis** (ISO 81060-2 / protokol ESH-IP) — daftar perangkat teruji jadi bagian dokumen teknis.

## 2. Scope SaMD vs modul non-alkes

Prinsip: pisahkan secara **arsitektural dan klaim**, bukan hanya di dokumen. Modul non-alkes tidak boleh memberi output yang dipersonalisasi dari data klinis pasien.

| Modul | Masuk SaMD? | Catatan |
|---|---|---|
| Klasifikasi BP + guideline selectable (`bp-classifier`) | **Ya** | Inti klaim |
| Ingest BLE (`ble-service.ts`) + validasi | **Ya** | Integritas input = risiko utama |
| Health Score, care routing, ML pola/forecast, ASCVD/PREVENT | **Ya** | Atau matikan ML forecast di build teregistrasi bila tak siap divalidasi |
| Sync Express/Mongo, auth | Ya (sebagai SOUP/infra dalam scope 62304 & keamanan) | Kegagalan sync = kehilangan data klinis |
| FHIR export | Ya bila diklaim untuk klinisi; bisa "fungsi administratif" bila murni transfer | *perlu verifikasi* |
| Knowledge base edukasi umum (Step 07) | **Bisa dipisah** | Konten generik, sama untuk semua user, tidak dipicu data pasien |
| Pipeline crawling | **Keluarkan dari produk** | Tooling internal editorial; output hanya draft → review klinisi → rilis konten bertanda versi |
| Red flag statis ("Bila nyeri dada mendadak… hubungi 119") | Non-alkes bila statis & selalu tampil | Begitu dipicu input gejala/BP → SaMD (III) |
| Gamifikasi, reminder obat, log kebiasaan | Wellness/administratif | Asal tidak menyimpulkan kondisi klinis |
| `local-assistant.ts` | **Ya** (menjawab dari data pasien) | Jika diganti LLM → kategori AIMD/LLM, beban naik tajam |

Implementasi: `/core` (scope SaMD, versi & changelog sendiri) vs `/content` + `/connectors` di luar boundary — sesuai rencana split §3.8 riset. Edukasi tetap butuh review klinis, tapi via proses editorial, bukan design control 62304.

## 3. Dokumen & standar → pekerjaan repo

| Standar / dokumen | Isi minimum | Pekerjaan konkret di repo |
|---|---|---|
| **ISO 13485** QMS | SOP design control, document control, CAPA, supplier (Vercel, Atlas, Google OAuth), complaint handling | `docs/qms/` terkontrol; PR template dengan checklist design review; branch protection + approval wajib (bukan solo-merge) |
| **ISO 14971** risk mgmt | Risk plan, hazard analysis (FMEA), risk/benefit, residual risk | Risk register: setiap hazard → kontrol → test ID. Mulai dari P0-1..P0-6, P1-5, P1-6 (hazard nyata) |
| **IEC 62304** lifecycle | Software safety class; dev plan, SRS, arsitektur, unit/integration/system test, SOUP list, problem resolution, maintenance | **Safety class B** (cedera tidak serius) untuk kelas B; **class C** bila red-flag dinamis/under-triage diseksi (potensi kematian) — *segregasi* modul triage agar class C tidak menular ke seluruh app. SOUP list = `package-lock.json` (React, Dexie, jsPDF, Express, mongodb driver) dengan versi dipin |
| **IEC 62366-1** usability | Use specification, user interface evaluation, summative test dengan lansia | Test tugas: input manual, baca kategori, pahami "hubungi 119"; pinch-zoom (P2-11) wajib diperbaiki |
| **IEC 81001-5-1** / IEC 82304-1 | Secure SDLC, threat model, SBOM, vulnerability mgmt, health software product safety | SBOM CycloneDX di CI; `npm audit` gate (P2-12); threat model auth/sync (P1-9..P1-11, P2-9, P2-10); SECURITY.md → proses CVD dengan SLA |
| ISO 27001 (disebut di ringkasan 951) | ISMS | *perlu verifikasi* apakah wajib atau rujukan |
| IEC 63450 / 63521 (AI) | Evaluasi performa AI/ML | Berlaku bila ML dipertahankan di scope; *perlu verifikasi* status standar |
| **Traceability matrix** | Requirement → risk control → test → hasil | `docs/qms/trace.csv` atau tag `REQ-xxx` di nama test; CI menolak REQ tanpa test |
| **Change control algoritma (PCCP)** | Apa yang boleh berubah tanpa izin baru (mis. konten, ambang per guideline versi baru) vs perubahan signifikan | Setiap output menyimpan `algorithmVersion + guidelineId`; golden-file test (input referensi → output terkunci); perubahan file di `/core/algorithms` wajib label `change-control` + impact assessment |
| Labeling / IFU | Intended use, kontraindikasi, versi, nama produsen, nomor izin edar | Halaman "Tentang/IFU" dalam app; hapus klaim "AI-Powered EHR" (`package.json`) & "Kaspersky grade" (P2-1) |
| PMS plan | Keluhan, insiden, tren performa RWD, laporan berkala | Telemetri error *opt-in* + kanal pelaporan insiden; log versi algoritma per reading |
| DPIA + RoPA (UU 27/2022) | Data kesehatan = data spesifik (Ps. 4); DPIA risiko tinggi (Ps. 34); notifikasi kegagalan 3×24 jam (Ps. 46) | Consent eksplisit per tujuan; hapus akun yang benar-benar menghapus (tergantung fix P0-1/P0-2/P1-4); evaluasi transfer lintas batas (Atlas/Vercel region) |

Badan hukum: izin edar alkes dalam negeri mensyaratkan produsen berbadan usaha dengan sertifikat produksi/CPAKB — developer perorangan tidak bisa mendaftar. *Perlu verifikasi* jalur untuk SaMD (PMK 62/2017 + OSS-RBA).

## 4. Rencana validasi klinis (outline)

1. **Verifikasi analitik** (in-house, sebelum studi): akurasi decode BLE vs layar tensimeter untuk ≥3 model berizin edar; konkordansi klasifikasi `bp-classifier` vs perhitungan manual 2 klinisi pada dataset sintetis batas (n≥500 kasus tepi).
2. **Studi klinis prospektif observasional** (atau sandbox Kepmenkes 951): pasien hipertensi dewasa di Indonesia, 1–2 FKTP/RS, n dihitung ahli statistik (orientasi ~200–300, *perlu verifikasi* power calc).
   - Endpoint primer: konkordansi kategori kontrol BP & anjuran routing aplikasi vs keputusan panel kardiolog/internis buta (kappa; sensitivitas untuk kategori "hubungi dokter hari ini" ≥ target pra-spesifikasi).
   - Endpoint keamanan: **tingkat under-triage** (kasus yang butuh perawatan segera tapi app memberi "kontrol rutin") — target mendekati nol, setiap kasus = adverse event review.
   - Sekunder: usability (SUS, summative 62366 pada lansia), kepatuhan HBPM, validitas Health Score vs Life's Essential 8/PREVENT, kalibrasi di populasi Asia.
3. **Etika & tata kelola:** protokol disetujui Komisi Etik Penelitian Kesehatan (KEPK) terakreditasi; informed consent; registrasi uji (mis. INA-Registry, *perlu verifikasi*); PI = dokter spesialis berSIP; laporan ditandatangani PI, ahli statistik, dan penanggung jawab teknis produsen.
4. **Penandatangan wajib:** klinisi berlisensi (STR/SIP) sebagai PI dan reviewer aturan routing; apoteker berSTR untuk konten farmakologis; penanggung jawab teknis alkes. **Review oleh persona AI (termasuk panel ini) tidak memenuhi syarat sebagai bukti klinis, review klinis, maupun tanda tangan apa pun** — hanya berguna sebagai checklist pra-konsultasi.

## 5. Aturan tier farmakologis

**Boleh (dalam scope, risiko rendah):**
- Daftar obat pasien (nama generik/dagang, kekuatan, jadwal) **sebagaimana diresepkan**, diinput pasien/diimpor dari resep.
- Pengingat minum obat, log kepatuhan, ringkasan kepatuhan untuk dibawa ke dokter (sudah ada: `medication-adherence.ts`).
- Informasi referensi statis per golongan (cara kerja, efek samping umum, kapan menghubungi dokter) dari sumber resmi (label/brosur BPOM, PIO Nasional), dengan sitasi + tanggal review + reviewer apoteker.
- Pesan keselamatan generik: "Jangan menghentikan atau mengubah obat tanpa dokter"; "bila pusing berat/pingsan setelah minum obat, hubungi dokter".
- Kepatuhan sebagai komponen Health Score — **tanpa** menyimpulkan "obat tidak efektif".

**Dilarang:**
- Saran memulai, menghentikan, menaikkan/menurunkan dosis, mengganti golongan, atau mengatur ulang waktu minum (termasuk "kronoterapi").
- Menampilkan ambang PREVENT ≥7,5% sebagai "Anda perlu mulai obat" ke pasien.
- Rekomendasi obat bebas/herbal/suplemen sebagai pengganti atau tambahan antihipertensi; tier "komplementer" hanya non-farmakologis berbukti.
- Pengecekan interaksi obat-obat otomatis — itu CDS tersendiri (fungsi SaMD baru + database berlisensi); **keluarkan dari v3.0**.
- Kalkulasi dosis berbasis eGFR/berat badan.

**Temuan kode:** `src/utils/advanced-analytics.ts:184` ("Diskusikan evaluasi dosis atau kronoterapi obat malam") dan `:247` ("penyesuaian dosis obat") mengarah ke saran terapi → ubah menjadi "diskusikan hasil ini dengan dokter". `local-assistant.ts:269` sudah benar ("tidak mengubah atau merekomendasikan dosis").

## 6. Gap kode yang memblokir registrasi

| Gap | ID audit | Mengapa memblokir |
|---|---|---|
| Delete tidak terdistribusi / resurrect | P0-1, P0-2, P1-4 | Integritas rekam & hak hapus PDP gagal |
| Wipe data lokal sebelum auth; logout tanpa push | P0-3, P1-2 | Kehilangan data klinis = hazard 14971 |
| Catatan klinis terkorupsi (escape) | P0-4 | Data menyesatkan di FHIR/PDF |
| Duplikasi reading legacy | P0-5 | Rata-rata/Health Score terdistorsi |
| Badge sync palsu | P0-6 | Klaim status salah (A5) |
| Validasi BP tidak satu pintu; SFLOAT NaN → 2047 mmHg; metadata posisi/lengan dikarang (`ble-service.ts:309` masih `'duduk'`) | P1-5, P1-6 | Input invalid langsung masuk algoritma SaMD |
| LOINC urea salah (`fhir-exporter.ts:161` masih `14927-8`); FHIR tidak valid | P1-7, P1-8 | Interoperabilitas SATUSEHAT disebut di 951 |
| ID collision antar-device | P1-1 | Data satu pasien menimpa data lain |
| JWT secret, rate limit, error leak, CORS/token 60 hari | P1-9..P1-11, P2-9, P2-10 | IEC 81001-5-1 / keamanan siber |
| **CI palsu + nol automated test** | P1-12, "gap terbesar" | Tidak ada bukti verifikasi 62304 sama sekali |
| Klasifikasi BP salah label "AHA/WHO"; PCE tanpa clamp & disclaimer Asia | P2-7, P2-3 | Klaim intended use tidak terdukung |
| Statistik overconfident (band, "significant", OR tanpa CI) | P2-4, P2-5, P2-6 | Klaim performa ML tak tervalidasi |
| Klaim hash chain/"Kaspersky grade" fiktif; formula ASCVD karangan | P2-1, P2-2 | Labeling menyesatkan |
| Pinch-zoom mati | P2-11 | Gagal usability 62366 untuk lansia |
| Dependency rentan, tanpa SBOM | P2-12 | Vulnerability mgmt |
| Belum ada: consent PDP, DPIA, versi algoritma per output, IFU, badan usaha produsen | — | Syarat administratif izin edar |

Urutan: Sprint 1–3 audit (P0 + P1-5..P1-8 + CI jujur + test) adalah **prasyarat** sebelum design freeze; QMS & risk file berjalan paralel; studi klinis baru dimulai setelah versi `/core` dibekukan.

## Sumber
- [Veritask — Kepmenkes 951/2026 (ID)](https://veritask.ai/id/artikel/kepmenkes-951-2026-perketat-aturan-alat-kesehatan-berbasis-ai) · [EN](https://veritask.ai/en/artikel/minister-of-health-decree-no-951-2026-tightens-regulations-on-ai-based-medical-devices) · [SIP Law](https://siplawfirm.id/resources/alat-kesehatan-berbasis-software-kepmenkes-951-2026) · [Legawa — KMK 951/2026](https://legawa.com/2026/09/10/kmk-951-2026-alat-kesehatan-perangkat-lunak/) (semua sekunder → *perlu verifikasi teks resmi*)
- [IMDRF/SaMD WG/N12FINAL:2014](https://imdrf.org/sites/default/files/docs/imdrf/final/technical/imdrf-tech-140918-samd-framework-risk-categorization-141013.pdf)
- PMK 62/2017 & klasifikasi: [Regalkes — Tata Cara Klasifikasi](https://regalkes.kemkes.go.id/informasi_alkes/TataCaraKlasifikasi1.pdf), [Pedoman Penilaian Alkes](https://regalkes.kemkes.go.id/informasi_alkes/PedomanPenilaianAlatKesehatandanPKRT.pdf), [izin.co.id — kelas A–D](https://izin.co.id/blog/apa-itu-alkes-dan-jenisnya/)
- UU 27/2022: [BPK](https://peraturan.bpk.go.id/Details/229798), [Hukumonline — DPIA](https://www.hukumonline.com/berita/a/memahami-data-protection-impact-assessments-dalam-pelindungan-data-pribadi-lt667615ca09b2e/); PP 33/2026 (aturan pelaksana, berlaku 16 Jan 2027 — satu sumber, *perlu verifikasi*): [Veritask](https://veritask.ai/id/artikel/pengaturan-teknis-pelindungan-data-pribadi-dan-kewajiban-pengendali-serta-prosesor-akhirnya-terbit-lewat-pp-33-2026)
