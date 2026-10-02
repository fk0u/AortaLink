# Template Protokol Penelitian Klinis AortaLink (KEPK Standard)

> **Dokumen Panduan Peneliti:** Gunakan template protokol penelitian ini sebagai dasar penyusunan proposal tesis, skripsi, atau uji klinis yang diajukan ke Komisi Etik Penelitian Kesehatan (KEPK) institusi Anda.

---

## 1. Informasi Umum Protokol
- **Judul Penelitian:** Evaluasi Pemantauan Mandiri Tekanan Darah Berbasis Standar HL7 FHIR R4 Menggunakan Aplikasi Mobile AortaLink (Mode Riset).
- **Study ID / Kode Protokol:** `[Contoh: AORTA-STUDY-2026-001]`
- **Peneliti Utama (PI):** `[Nama Dokter Spesialis / Dosen Peneliti dengan SIP/NIDN]`
- **Institusi Penyelenggara:** `[Fakultas Kedokteran / Rumah Sakit / Universitas]`
- **Lokasi Penelitian:** `[Puskesmas / Klinik / Poliklinik Jantung]`

---

## 2. Latar Belakang & Justifikasi Ilmiah
Hipertensi merupakan penyebab morbiditas dan mortalitas kardiovaskular tertinggi di Indonesia. Kepatuhan pengukuran tekanan darah mandiri di rumah (*Home Blood Pressure Monitoring* / HBPM) sering kali terkendala oleh pencatatan manual yang rentan bias. AortaLink dikembangkan dengan pipeline standar interoperabilitas HL7 FHIR R4 dan model inferensi statistik on-device untuk membantu evaluasi variabilitas tensi tanpa mengirim data medis ke pihak ketiga.

---

## 3. Desain & Metodologi Penelitian
1. **Desain Studi:** Studi observasional prospektif kohort / kuasi-eksperimental dengan intervensi pencatatan HBPM harian.
2. **Kriteria Inklusi:**
   - Usia ≥ 18 tahun.
   - Terdiagnosis hipertensi primer (derajat 1 atau 2 sesuai guideline ESH 2023 / PERHI).
   - Memiliki tensimeter digital terkalibrasi dan smartphone yang mendukung peramban modern.
   - Bersedia menandatangani *Informed Consent*.
3. **Kriteria Eksklusi:**
   - Pasien dengan krisis hipertensi aktif saat skrining.
   - Wanita hamil dengan preeklampsia.
   - Pasien hemodialisis atau penyakit ginjal tahap akhir (ESRD).

---

## 4. Perlindungan Partisipan & Kerahasiaan Data (Pseudonimisai)
- Data yang diekspor dari aplikasi AortaLink untuk analisis data menggunakan fitur **Ekspor Dataset Ter-pseudonimisasi** (`src/services/research/pseudonymized-exporter.ts`).
- Identitas langsung (nama lengkap, nomor telepon, email) dihapus secara otomatis dari file ekspor (CSV & FHIR Bundle).
- Setiap partisipan diidentifikasi hanya menggunakan kode pseudonim unik (format `PT-XXXXXXXX`).
- Partisipan memiliki hak penuh untuk menarik persetujuan (*withdraw consent*) sewaktu-waktu melalui tombol di antarmuka aplikasi.
