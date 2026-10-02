# AortaLink v3.0 — Pernyataan Posisi Regulasi & Kesiapan SaMD

> **Dokumen Resmi:** Kerangka Kepatuhan Regulasi Alat Kesehatan & Pelindungan Data Pribadi  
> **Dasar Hukum:** Kepmenkes RI No. HK.01.07/MENKES/951/2026 & UU RI No. 27 Tahun 2022 (UU PDP)  
> **Status Rilis:** Mode Publik = **Non-Alkes (Personal EHR & Wellness Companion)**; Mode Riset = **SaMD-Ready Framework (Gated)**  
> **Versi:** 3.0.0 · **Pembaruan:** 2026-10-02

---

## 1. Ringkasan Eksekutif & Klasifikasi Produk

Berdasarkan **Keputusan Menteri Kesehatan RI No. HK.01.07/MENKES/951/2026** tentang Pedoman Penilaian Alat Kesehatan Berbasis Perangkat Lunak (*Software as a Medical Device* / SaMD) dan Keputusan Direksi Teknis (D1, 2026-10-01), **AortaLink v3.0 diposisikan dan dirilis secara publik sebagai perangkat lunak Non-Alat Kesehatan (Non-Alkes)**.

AortaLink berfungsi sebagai sarana pencatatan mandiri kesehatan personal (*Personal Electronic Health Record* / Personal EHR), visualisasi data vital harian, dan edukasi kepatuhan gaya hidup.

Untuk mendukung riset klinis dan translasi akademik di Indonesia, arsitektur v3.0 dibangun dengan disiplin teknik standar SaMD (IEC 62304, ISO 14971, IEC 81001-5-1), namun seluruh fitur inferensi klinis lanjutan **dikunci secara ketat di balik Mode Riset/Akademik** yang mewajibkan persetujuan Komisi Etik Penelitian Kesehatan (KEPK) terakreditasi dan pengawasan dokter spesialis berlisensi sebagai *Principal Investigator* (PI).

---

## 2. Arsitektur Dual Release Mode

| Dimensi | Mode Publik (Default untuk Umum) | Mode Riset / Akademik (Gated) |
| :--- | :--- | :--- |
| **Status Regulasi** | **Non-Alkes** (Alat bantu pencatatan & edukasi) | **SaMD-Ready Framework** (Penelitian terdaftar) |
| **Target Pengguna** | Masyarakat umum, pasien hipertensi, keluarga | Peneliti, klinisi, mahasiswa kedokteran / pascasarjana |
| **Prasyarat Akses** | Tidak ada (dapat langsung digunakan, offline-first) | Protokol KEPK + ID Riset Resmi + Dokter Spesialis PI |
| **Klaim Diagnostik** | **TIDAK ADA.** Hanya menampilkan rentang acuan | Analisis inferensi pola, variabilitas, & prediksi |
| **Panduan Darurat** | Layar darurat statis (Daftar gejala red-flag + 119/112) | Evaluasi triage gejala terstruktur untuk validasi |
| **Saran Terapi / Obat** | **DILARANG KERAS.** Hanya pengingat log minum obat | Evaluasi kepatuhan ter-pseudonimisasi |
| **Output Data** | Format PDF personal & FHIR R4 personal | CSV & FHIR pseudonim dengan manifest versi algoritma |

---

## 3. Pernyataan Tujuan Penggunaan (*Intended Use Statement*)

### 3.1 Mode Publik (Non-Alkes)
> *"AortaLink Mode Publik adalah perangkat lunak aplikasi pendamping personal yang ditujukan bagi orang dewasa untuk mencatat, menyimpan, dan menampilkan riwayat tekanan darah, denyut nadi, serta log gaya hidup mandiri. Aplikasi ini tidak memberikan diagnosis medis, tidak menentukan rencana pengobatan atau perubahan dosis obat, dan tidak menggantikan konsultasi langsung dengan dokter profesional."*

### 3.2 Mode Riset (SaMD-Ready)
> *"AortaLink Mode Riset adalah perangkat lunak analisis telemetri kardiovaskular on-device yang dirancang untuk menguji konkordansi klasifikasi pedoman klinis (ESH/PERHI, ACC/AHA, ESC), estimasi variabilitas hemodinamik, serta pola dipping sirkadian pada populasi studi di bawah pengawasan protokol penelitian etis berstandar KEPK."*

---

## 4. Kontraindikasi & Batasan Klinis Mutlak

1. **Kondisi Kegawatdaruratan Akut (Red Flags):**
   - Pasien yang mengalami nyeri dada hebat menjalar ke punggung (gejala diseksi aorta), sesak napas berat tiba-tiba, kelemahan separuh tubuh, atau bicara pelo **DILARANG** mengandalkan aplikasi ini dan harus segera menghubungi ambulans **119** atau mendatangi IGD rumah sakit terdekat.
2. **Populasi Pediatrik (<18 Tahun):**
   - Formula ambang dewasa pada aplikasi tidak berlaku untuk anak-anak dan remaja di bawah 18 tahun. Evaluasi tekanan darah anak wajib merujuk pada grafik persentil khusus dokter spesialis anak (Sp.A).
3. **Wanita Hamil (Preeklampsia):**
   - Tekanan darah pada kehamilan memiliki risiko komplikasi obstetrik khusus dan memerlukan pemantauan ketat oleh dokter spesialis obstetri & ginekologi (Sp.OG).
4. **Preskripsi Farmakologis:**
   - Aplikasi tidak diizinkan mengubah, menyarankan, atau menyesuaikan jenis dan dosis obat antihipertensi (termasuk anjuran kronoterapi mandiri). Segala keputusan farmakoterapi mutlak berada di bawah wewenang dokter yang merawat.

---

## 5. Kepatuhan Standar Teknis & Manajemen Risiko

Sesuai arahan panel regulasi, repositori AortaLink menerapkan prinsip-prinsip standar internasional:

### 5.1 Klasifikasi Keselamatan Perangkat Lunak (IEC 62304)
- **Safety Class B:** Diterapkan untuk modul pencatatan, kalkulasi MAP/PP fisiologis, dan visualisasi grafik, di mana kegagalan fungsi tidak mengakibatkan cedera serius.
- **Isolasi Modul Triage Dinamis:** Mesin triage gejala berpotensi Class C (terkait under-triage diseksi aorta) diisolasi secara permanen dari Mode Publik dan hanya dapat dievaluasi dalam kerangka studi klinis blinded.

### 5.2 Manajemen Risiko (ISO 14971)
- Identifikasi bahaya utama (ambang HBPM vs klinik, error decoding Bluetooth SFLOAT, integritas tombstones saat sync) dikendalikan melalui pengujian otomatis pada CI pipeline.
- Seluruh mitigasi risiko klinis dipetakan ke dalam skrip verifikasi otomatis (`scripts/*-selfcheck.ts`).

### 5.3 Kesiapan Software of Unknown Provenance (SOUP)
Repositori memelihara dependensi pihak ketiga dengan penguncian versi pasti (*lockfile*) dan pemindaian kerentanan berkala via CI (`npm audit` high-level gate):
- **Runtime Utama:** React 19, TypeScript
- **Penyimpanan Lokal:** Dexie.js v4 (IndexedDB)
- **Komponen Presentasi:** Recharts, Framer Motion, Tailwind CSS
- **Interoperabilitas Klinis:** HL7 FHIR R4 Exporter terverifikasi resmi
- **Infrastruktur Opsional:** Express 4, MongoDB Driver v6

---

## 6. Pelindungan Data Pribadi (UU No. 27 Tahun 2022)

Sesuai ketentuan UU PDP bahwa data kesehatan adalah **Data Pribadi Spesifik** (Pasal 4):

1. **Persetujuan Eksplisit (*Explicit Consent*):** Pengguna secara aktif menyetujui penyimpanan data lokal pada perangkat saat pertama kali membuka aplikasi.
2. **Kedaulatan Data Lokal (*Offline-First*):** Seluruh catatan tersimpan di dalam IndexedDB browser pengguna tanpa transmisi otomatis ke pihak ketiga mana pun.
3. **Hak Penghapusan & Integritas Tombstone (Pasal 39):** Penghapusan profil atau catatan tensi langsung mengeksekusi penghapusan permanen lokal dan mencatat tombstone terenkripsi untuk mencegah restorasi data yang tidak dikehendaki (*stale upsert*).
4. **Pseudonimisasi Data Riset:** Mode Riset menerapkan hashing deterministik satu arah dan pengacakan kriptografis (`crypto.getRandomValues`) sehingga seluruh identitas langsung (nama, NIK, alamat) dihilangkan dari berkas ekspor FHIR R4 dan CSV.

---

## 7. Rencana Menuju Pendaftaran SaMD Resmi (Jalur Masa Depan)

Sebelum AortaLink dapat diajukan secara resmi untuk memperoleh izin edar AKD/AKL berbasis Kepmenkes 951/2026:
1. **Badan Usaha Terdaftar:** Pengajuan izin edar mensyaratkan produsen berbadan hukum (PT) dengan izin sarana distribusi/produksi alkes (CPAKB/CDAKB).
2. **Uji Klinis Prospektif:** Validasi klinis di fasyankes Indonesia bersama dokter spesialis kardiologi (Sp.JP/Sp.PD) berlisensi sebagai Principal Investigator untuk membuktikan keamanan, akurasi klasifikasi, dan pencegahan under-triage.
3. **Penyusunan Berkas Teknis (DMR/DHF):** Melengkapi dossier Cara Pembuatan Alat Kesehatan yang Baik (CPAKB) berbasis ISO 13485.
