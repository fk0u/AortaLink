# Template Kalimat Metodologi (Paper / Skripsi / Tesis)

Gunakan kutipan teks metodologi di bawah ini pada bab *Materials and Methods* karya tulis ilmiah Anda:

### Bahasa Indonesia (Skripsi / Tesis)
> **Pencatatan Data dan Interoperabilitas Medis:**  
> "Pengumpulan data tekanan darah mandiri partisipan dilakukan menggunakan aplikasi AortaLink v3.0 (Mode Riset, Study ID: `[KODE_STUDI]`). Data klinis dicatat dalam format standar interoperabilitas internasional HL7 FHIR versi R4 (Vital Signs BP Profile, LOINC `85354-9`). Untuk memastikan kerahasiaan data dan kepatuhan terhadap prinsip bioetika kedokteran, identitas pribadi setiap partisipan di-pseudonimisasi (format `PT-XXXXXXXX`) sebelum dilakukan analisis statistik, tanpa mentransmisikan data mentah ke peladen pihak ketiga. Model analisis statistik on-device menggunakan algoritma deterministik linier (OLS) dan Welch's t-test sesuai spesifikasi repositori terbuka AortaLink."

### English (Journal Paper / Conference Proceeding)
> **Data Collection and Healthcare Interoperability:**  
> "Home blood pressure monitoring (HBPM) telemetry was acquired via the open-source AortaLink application v3.0 operated under Research Mode (Study Protocol ID: `[STUDY_ID]`). Measurements were mapped to HL7 FHIR Release 4 standard representations following the HL7 Vital Signs Blood Pressure Implementation Guide (LOINC `85354-9`). Prior to statistical aggregation, all datasets were de-identified and assigned pseudonymous tokens (format `PT-XXXXXXXX`) pursuant to local ethical committee regulations (KEPK approval). On-device statistical pattern detection was performed using deterministic Ordinary Least Squares (OLS) regression and Welch's two-sample t-testing without external cloud compute dependencies."
