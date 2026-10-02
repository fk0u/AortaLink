# Checklist Pengajuan Komisi Etik Penelitian Kesehatan (KEPK)

Gunakan checklist ini sebelum mengirimkan berkas telaah etik ke KEPK institusi/universitas/RS:

| # | Item Checklist | Status Dokumen | Lokasi di Repositori |
|---|---|:---:|---|
| 1 | **Protokol Penelitian Lengkap** (Latar belakang, tujuan, metodologi, analisis statistik) | [ ] Siap | Gunakan template [`RESEARCH_PROTOCOL_TEMPLATE.md`](./RESEARCH_PROTOCOL_TEMPLATE.md) |
| 2 | **Informed Consent Form (ICF)** dalam Bahasa Indonesia yang mudah dipahami orang awam | [ ] Siap | Gunakan template [`INFORMED_CONSENT_TEMPLATE.md`](./INFORMED_CONSENT_TEMPLATE.md) |
| 3 | **Curriculum Vitae (CV) Peneliti Utama (PI)** dokter berlisensi & anggota tim | [ ] Disiapkan Peneliti | Berkas mandiri |
| 4 | **Surat Izin Tempat Penelitian** (Puskesmas / RS / Klinik) | [ ] Disiapkan Peneliti | Berkas mandiri |
| 5 | **Surat Pernyataan Keamanan Siber & Privasi Data** (Penyimpanan utama berbasis on-device IndexedDB, sinkronisasi awan multi-perangkat via MongoDB Atlas bersifat opsional/opt-in dengan enkripsi, tanpa tracker PII pihak ketiga, ekspor dataset riset ter-pseudonimisasi dengan note scrubbing) | [ ] Terpenuhi oleh arsitektur | Kode `src/services/research/pseudonymized-exporter.ts` |
| 6 | **Prosedur Penarikan Partisipan (Withdrawal Procedure)** yang terdokumentasi dan dapat diakses mandiri oleh partisipan | [ ] Terpenuhi oleh aplikasi | Fungsi `withdrawResearchConsent()` di `src/services/config/release-mode.ts` |
| 7 | **Standar Interoperabilitas Data Medis** (Bukti validasi HL7 FHIR R4 Bundle) | [ ] Lolos uji CI | Test suite `scripts/fhir-selfcheck.ts` |
