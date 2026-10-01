# Audit Sistematis AortaLink — Berdasarkan *Logos Aorta*

> **Tanggal audit:** 2026-10-01 · **Commit basis:** `9ab19a8` · **Scope:** `server/`, `api/`, `src/` (db, sync, auth, security, ML, FHIR, BLE, UI shell), CI/deploy.
>
> **Status build saat audit:** `tsc --noEmit` ✅ lulus · `rsbuild build` ✅ lulus (chunk terbesar 1.34 MB / 404 kB gzip) · `npm audit --omit=dev` ⚠️ 4 moderate (`qs` via `express`).

---

## 0. Apa itu *Logos Aorta*?

README mendefinisikan nama ini sendiri: **Aorta** = *main arterial pathway distributing life*, **Link** = *clinical data interoperability*. Dari situ audit ini menurunkan **7 prinsip** yang dipakai sebagai alat ukur. Setiap temuan dipetakan ke prinsip yang dilanggar.

| # | Prinsip | Analogi aorta | Pertanyaan audit |
|---|---------|---------------|------------------|
| A1 | **Satu jalur utama** | Semua darah lewat satu pembuluh | Apakah ada *single source of truth* yang jelas, tanpa jalur paralel/kode mati? |
| A2 | **Aliran tanpa kebocoran** | Dinding pembuluh tidak bocor | Apakah data yang masuk = data yang keluar, tanpa korupsi/kehilangan? |
| A3 | **Distribusi ke seluruh tubuh** | Darah sampai ke setiap organ | Apakah setiap perubahan (termasuk *delete*) sampai ke semua device? |
| A4 | **Link / interoperabilitas** | Darah yang sama dipahami semua organ | Apakah FHIR/LOINC/UCUM yang diekspor *valid* dan *benar*? |
| A5 | **Kejujuran klinis** | Tekanan yang diukur = tekanan nyata | Zero-mock: apakah angka, status, dan klaim ML jujur? |
| A6 | **Dinding pembuluh** | Barrier terhadap infeksi | Keamanan perimeter: auth, CORS, secret, rate limit |
| A7 | **Tekanan sistemik** | Jantung tidak boleh overload | Performa, biaya server, CI, aksesibilitas |

### Skala severity

- **P0 — Ruptur**: kehilangan/korupsi data rekam medis atau klaim fungsional yang tidak bekerja sama sekali. Fix sebelum rilis.
- **P1 — Stenosis**: bug serius / risiko keamanan / data klinis menyesatkan.
- **P2 — Plak**: utang teknis, standar tidak penuh, efisiensi.

---

## 1. Ringkasan Eksekutif

Fondasi arsitekturnya **sehat**: offline-first Dexie, UUID untuk readings, middleware `updatedAt` + tombstone, bcrypt, AES-GCM/PBKDF2 backup, koefisien PCE ASCVD akurat, ML yang menolak menebak saat data kurang. Filosofi zero-mock jelas terlihat.

**Tapi "aorta"-nya bocor di tiga titik paling vital:**

1. **Delete tidak pernah terdistribusi** — server membuang semua tombstone karena *field name mismatch*, dan urutan `pull → push` me-*resurrect* record yang baru dihapus. (A3)
2. **Login gagal = data lokal hilang** — DB lokal di-wipe *sebelum* password diverifikasi. (A2)
3. **Catatan klinis terkorupsi saat disimpan** — HTML-escaping di layer storage membuat `&` → `&amp;` → `&amp;amp;` setiap edit, dan ikut ter-ekspor ke FHIR/PDF. (A2/A4)

Plus: badge sync menampilkan **hijau "synced" walau server menolak** (A5), dan **CI hijau palsu** karena `npx vite build` tidak membangun aplikasi sama sekali (A7).

| Severity | Jumlah |
|----------|--------|
| P0 | 6 |
| P1 | 12 |
| P2 | 12 |

---

## 2. Temuan P0 — Ruptur

### P0-1 · Tombstone delete dibuang server (A3)
- **Lokasi:** `server/index.js:435-437`, kontras `src/db/index.ts:247-251`
- **Masalah:** Client mengirim tombstone berbentuk `{ table, recordId, deletedAt }`. Server mengecek `t.id` → `if (!t || !t.id || !t.table) continue;`. Karena `t.id` selalu `undefined`, **setiap tombstone di-skip**. Record tidak pernah dihapus dari Mongo.
- **Efek berantai:** client lalu memprune tombstone lokalnya (`mongodb-service.ts:124`) karena server balas `success: true` → informasi delete hilang permanen. Saat pull, server juga mengembalikan tombstone dengan field `id`, sedangkan client membaca `t.recordId` → mismatch dua arah.
- **Fix:**
  ```js
  // server/index.js
  for (const t of tombstones) {
    const recordId = t?.recordId ?? t?.id;
    if (recordId === undefined || recordId === null || !t.table) continue;
    const idStr = String(recordId);
    await tombstoneCollection.updateOne(
      { recordId: idStr, table: String(t.table), userId },
      { $set: { recordId: idStr, table: String(t.table), userId, deletedAt: t.deletedAt || new Date().toISOString() } },
      { upsert: true }
    );
    const collName = TABLE_TO_COLLECTION[t.table];
    // id bisa number (tabel ++id) atau string (UUID) — hapus keduanya
    if (collName) {
      const asNum = Number(idStr);
      await activeDb.collection(collName).deleteOne({
        userId, $or: [{ id: idStr }, ...(Number.isFinite(asNum) ? [{ id: asNum }] : [])]
      });
    }
  }
  ```
  Dan pada `upsertCollection`, tolak item yang punya tombstone lebih baru dari `updatedAt`-nya (supaya device stale tidak menghidupkan lagi record yang dihapus).

### P0-2 · `pull → push` me-resurrect record yang baru dihapus (A3)
- **Lokasi:** `src/store/useAuthStore.ts:79-81`, `src/services/db/mongodb-service.ts` (`restoreTable`)
- **Masalah:** `syncCloudData` menjalankan **pull dulu**, baru push. Jika user menghapus record X lalu sync: pull melihat X di cloud, X tidak ada di lokal (`existing` null) → `put(X)` → X hidup lagi. Push kemudian mengirim tombstone X (yang di-skip, P0-1) dan memprune-nya. Hasil: **delete tidak pernah menempel**, bahkan setelah P0-1 diperbaiki sekalipun.
- **Fix:** di `restoreTable`, skip item yang punya tombstone lokal yang belum di-push:
  ```ts
  const pending = new Set((await db.syncTombstones.toArray()).map(t => `${t.table}:${t.recordId}`));
  // dalam loop:
  if (pending.has(`${tableName}:${String(item.id)}`)) continue;
  ```
  (artinya `restoreTable` harus selalu menerima `tableName`, bukan hanya untuk readings.)

### P0-3 · Login/registrasi gagal menghapus seluruh data lokal (A2)
- **Lokasi:** `src/store/useAuthStore.ts:88` dan `:114`
- **Masalah:** `clearLocalEhrDatabase()` dipanggil **sebelum** `realAuthService.loginUser()`. Salah ketik password, server down, atau email belum terdaftar → seluruh data Mode Lokal (guest) **hilang tanpa konfirmasi**. Registrasi sama: wipe dulu, register belakangan.
- **Fix:** autentikasi dulu, baru wipe. Untuk guest → akun, tawarkan *migrasi* (push data guest ke akun baru) alih-alih menghapus.
  ```ts
  const session = await realAuthService.loginUser(email, password); // throw → data aman
  await clearLocalEhrDatabase();
  ```

### P0-4 · Catatan klinis terkorupsi oleh HTML-escape di storage (A2, A4)
- **Lokasi:** `src/components/readings/ReadingFormModal.tsx:212`, `src/security/sanitizer.ts`
- **Masalah:** `sanitizeText` meng-escape `& < > " ' /` **sebelum disimpan ke Dexie**. React sudah auto-escape saat render, jadi user melihat `kopi &amp; jalan pagi`. Setiap edit meng-escape lagi (`&amp;amp;`). Teks rusak ini ikut ke **FHIR `Observation.note`**, PDF, dan cloud. `/` → `&#x2F;` merusak penulisan dosis seperti `5mg/hari`.
- **Fix:** simpan teks mentah (trim + batas panjang + buang control char). Escape hanya di sink non-React (PDF/HTML string) bila ada. Tambahkan migrasi satu kali untuk *unescape* notes yang sudah tersimpan.
  ```ts
  export function normalizeClinicalText(input = '', max = 2000): string {
    return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
  }
  ```

### P0-5 · Reading legacy (id numerik) terduplikasi di setiap pull (A2, A3)
- **Lokasi:** `src/services/db/mongodb-service.ts:186-188`
- **Masalah:** cloud record readings dengan id numerik di-rekey ke `newSyncId()` **setiap kali pull**. Karena record numerik di cloud tidak pernah dihapus, tiap pull membuat 1 UUID baru → duplikat → di-push ke cloud → bertambah lagi. Pada akun yang dibuat sebelum migrasi v9, data tensi akan **berlipat setiap 30 detik** (interval auto-sync).
- **Fix:** rekey deterministik (mis. `uuidv5(userId + ':' + legacyId)`) sehingga pull berulang menghasilkan id yang sama, dan kirim tombstone untuk id numerik lama agar server menghapusnya.

### P0-6 · Badge sync bohong: hijau walau server gagal (A5)
- **Lokasi:** `src/components/dashboard/MongoAtlasSyncBadge.tsx:41,64`, `src/services/db/mongodb-service.ts:137,140`
- **Masalah:** `pushUserData`/`pullAndRestoreUserData` tidak pernah *throw* — mereka return `{ success: false }`. `syncCloudData` tidak memeriksa nilai itu, jadi `catch` di badge tidak pernah jalan → state `synced` ✅ meski server 500, token expired (403), atau Mongo down. State awal juga `'synced'` sebelum sync pertama terjadi. Ini melanggar komentar kode sendiri: *"say so instead of pretending it synced"*.
- **Fix:**
  ```ts
  syncCloudData: async () => {
    if (get().user?.authProvider === 'guest') return;
    const pull = await mongoDbAtlasService.pullAndRestoreUserData();
    if (!pull.success) throw new Error(pull.message);
    const push = await mongoDbAtlasService.pushUserData();
    if (!push.success) throw new Error(push.message);
  },
  ```
  Initial state `'idle'`/`'pending'`, dan tangani 401/403 → paksa re-login.

---

## 3. Temuan P1 — Stenosis

| ID | Prinsip | Lokasi | Masalah | Rekomendasi |
|----|---------|--------|---------|-------------|
| P1-1 | A3 | `src/db/index.ts` (tabel `++id`) | Migrasi UUID v9 hanya untuk `readings`. `medications`, `medicationLogs`, `labResults`, `habits`, `sodiumLogs`, `sleepLogs`, `reminders`, `ascvdProfiles`, `clinicalNotes` masih auto-increment → dua device offline sama-sama membuat `id: 1` → server (key `id+userId`) menimpa satu dengan yang lain. Kelas bug yang sama yang v9 klaim sudah dihilangkan. | Migrasi v10: semua synced table pakai UUID string; remap foreign key (`medicationLogs.medicationId`). |
| P1-2 | A2 | `src/store/useAuthStore.ts:140` | `logout()` langsung wipe DB tanpa push terakhir → edit yang belum ter-sync (≤30 dtk terakhir, atau saat offline) hilang. | Push dulu; jika gagal/offline, konfirmasi "Ada N perubahan belum tersinkron". |
| P1-3 | A2 | `src/db/index.ts:256` | Tombstone ditulis dengan `void tombstoneTable.mutate(...)` — tidak di-await, error ditelan. Komentar mengklaim "same transaction so they can never diverge", tapi kegagalan tombstone tidak membatalkan delete. | `return Promise.all([tombstoneTable.mutate(...), downlevelTable.mutate(req)]).then(([, r]) => r)`. |
| P1-4 | A2/A3 | `HistoryFilter.tsx:104`, `SecurityBackupModal.tsx:159`, `backup.ts:86`, `json-importer-exporter.ts:154` | "Hapus semua" / restore hanya clear 3–9 dari 16 tabel, dan `clear()` (deleteRange) tidak menghasilkan tombstone → data muncul lagi dari cloud di sync berikutnya; tabel sisanya jadi orphan. | Satu fungsi `wipeProfileData()` terpusat yang mencakup `SYNCED_TABLES` dan menulis tombstone (atau endpoint server "reset account"). |
| P1-5 | A5 | `ReadingFormModal.tsx:204`, `security/sanitizer.ts` | Validasi form hanya rentang kasar; **tidak** cek sistolik > diastolik, pulse, atau NaN. `validateBPRange()` yang benar sudah ada tapi tidak dipakai. Rentang juga tidak konsisten (form 60–260 vs validator 40–300). | Pakai `validateBPRange` di form, BLE, dan importer — satu pintu validasi. |
| P1-6 | A5 | `ble-service.ts:77-83, 299, 309` | (a) Nilai khusus SFLOAT (NaN `0x07FF`, NRes `0x0800`, ±INF) tidak ditangani → bisa tersimpan 2047 mmHg. (b) Pulse absent → disimpan `0` (mencemari rata-rata nadi & ML). (c) `position: 'duduk'`, `arm: 'kiri'` **di-hardcode** — metadata klinis karangan, melanggar zero-mock. (d) Measurement Status (gerakan tubuh, irregular pulse) diabaikan. (e) Tidak ada validasi rentang sebelum `add`. | Tolak special values, `pulse` optional, metadata `undefined` sampai user konfirmasi, simpan flag status, panggil `validateBPRange`. |
| P1-7 | A4 | `fhir-exporter.ts:161` | LOINC `14927-8` **bukan** urea/BUN (itu kode Triglyceride [Moles/volume]). "Ureum" di lab Indonesia adalah *urea*, bukan BUN — kode yang tepat `3091-6` (Urea [Mass/volume] in Serum or Plasma); BUN = `3094-0`. README & dokumentasi menyebar kode salah yang sama. Display uric acid juga "in Blood" padahal `3084-1` = *Serum or Plasma*. | Ganti ke `3091-6`, perbaiki display, update README/tabel FHIR. ⚠️ verifikasi silang di loinc.org sebelum merge. |
| P1-8 | A4 | `fhir-exporter.ts:75,104,185`, `fullUrl` | Resource ekspor **tidak valid FHIR R4**: (a) field non-standar `profileId` di Observation/MedicationRequest; (b) `extension: []` — array kosong dilarang FHIR; (c) RxNorm `code: 'custom'` dengan system RxNorm; (d) `fullUrl: urn:uuid:aortalink-obs-…` bukan UUID valid; (e) tidak ada `meta.profile` vital-signs BP. Akan ditolak HAPI/validator resmi. | Strip field internal saat ekspor; omit extension bila kosong; untuk obat custom pakai `text` saja tanpa `coding`; `fullUrl` = `urn:uuid:<uuid>`; tambahkan `http://hl7.org/fhir/StructureDefinition/bp`. Tambahkan test dengan FHIR validator. |
| P1-9 | A6 | `server/index.js:29` | Di Vercel (serverless) tanpa `JWT_SECRET`, setiap cold start/instance punya secret berbeda → token acak invalid. Warning tidak cukup. | `if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw ...` — fail fast. |
| P1-10 | A6 | `server/index.js` (auth) | Tidak ada rate limiting di `/api/auth/login` → brute force. Respons 404 vs 401 membocorkan apakah email terdaftar (user enumeration). Tidak ada validasi panjang password di server. | `express-rate-limit` per IP+email, pesan error seragam, min 8 karakter, validasi email. |
| P1-11 | A6 | `server/index.js:104,112,232` | Pesan error menyuruh user men-set Atlas IP whitelist ke `0.0.0.0/0` (membuka DB ke seluruh internet) dan membocorkan `error.message` internal ke client. | Pesan generik ke client; detail hanya ke log. Hapus saran `0.0.0.0/0`. |
| P1-12 | A7 | `.github/workflows/ci.yml:26` | CI menjalankan `npx vite build` — repo tidak punya vite config; hasilnya **hanya menyalin `index.html`** ("1 modules transformed"). Aplikasi tidak pernah dibangun dan typecheck tidak dijalankan → CI selalu hijau palsu. Trigger juga hanya `main/master`. | Ganti ke `npm run lint && npm run build`; hapus `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa` dari devDeps. |

---

## 4. Temuan P2 — Plak

| ID | Prinsip | Lokasi | Masalah | Rekomendasi |
|----|---------|--------|---------|-------------|
| P2-1 | A1/A5 | `src/security/hasher.ts` | `computeAuditHash` / "SHA-256 Hash Chain" **tidak dipakai di mana pun**, tapi diklaim di diagram arsitektur & bab 35 dokumentasi. Header "Kaspersky & Trend Micro Grade" juga klaim pemasaran tanpa dasar. | Implementasikan tabel `auditLog` sungguhan atau hapus klaimnya dari docs. |
| P2-2 | A1/A5 | `src/utils/ascvd-estimator.ts` | Formula ASCVD "simplified" karangan (linear, default kolesterol 200/50). Kode mati, tapi berbahaya kalau suatu saat ter-import. Yang dipakai (`ascvd-calculator.ts`) koefisien PCE-nya **benar** ✅. | Hapus file. |
| P2-3 | A5 | `ascvd-calculator.ts` | PCE tidak meng-clamp input ke rentang validasi studi (TC 130–320, HDL 20–100, SBP 90–200) → ekstrapolasi. Ras `other` (termasuk Asia/Indonesia) memakai koefisien White, yang diketahui *overestimate* untuk populasi Asia. | Clamp + warning; tampilkan disclaimer populasi; pertimbangkan AHA PREVENT (2023) atau WHO CVD risk chart region SEA. |
| P2-4 | A5 | `trend-forecaster.ts:128` | "95% band" memakai residual SE konstan × 1.96. Bukan prediction interval: mengabaikan ketidakpastian parameter & membesarnya error saat ekstrapolasi, dan pakai z bukan t (n kecil). Band terlalu sempit → overconfident. | `se·t(n-2)·√(1 + 1/n + (x−x̄)²/Sxx)`. |
| P2-5 | A5 | `pattern-detector.ts` (morning surge, dll.) | Label `strength: 'significant'` hanya dari selisih rata-rata ≥ 8 mmHg dengan n=3 per grup — tanpa uji statistik. | Welch t-test / CI; ganti label jadi "kuat/indikatif" bila tanpa uji. |
| P2-6 | A5 | `adherence-model.ts` | Fitur `frekuensi_ukur` rawan *reverse causality* (orang mengukur lebih sering saat tensi tinggi), dan odds ratio ditampilkan tanpa CI pada sampel kecil. | Tampilkan CI (bootstrap) dan catatan "asosiasi, bukan sebab". |
| P2-7 | A5 | `bp-classifier.ts` | Mengklaim "AHA / WHO", padahal ambang 130/80 = ACC/AHA 2017; WHO/ESH/PERHI (Indonesia) memakai ≥140/90. Warna `crisis.hexColor` (`#be123c` rose) tidak sesuai kelas purple. | Jadikan guideline bisa dipilih (ACC/AHA vs ESH/PERHI) dan sebutkan eksplisit. |
| P2-8 | A7 | `server/index.js:370` | Upsert per item secara sequential (`findOne` + `updateOne`) = 2N round-trip. Dengan auto-sync tiap 30 dtk + setiap window focus, dan **seluruh** DB dikirim/ditarik setiap kali → mahal di Vercel (timeout 10 dtk) dan Atlas. | `bulkWrite` dengan filter `clientUpdatedAt`, sync incremental (`?since=`), guard in-flight agar sync tidak overlap. |
| P2-9 | A6 | `server/index.js:155` | Client bisa set `subscriptionTier` sendiri saat register. `userId = 'usr-mongo-' + Date.now()` bisa bentrok pada request bersamaan. | Tier ditentukan server; `crypto.randomUUID()`; unique index di `users.email`. |
| P2-10 | A6 | `server/index.js:38`, token | CORS `*` + JWT 60 hari di `localStorage` tanpa revocation. Bearer token jadi CSRF aman, tapi XSS = pengambilalihan akun 60 hari. | Allowlist origin, access token pendek + refresh, CSP header. |
| P2-11 | A7 | `index.html:7` | `maximum-scale=1, user-scalable=no` mematikan pinch-zoom — melanggar WCAG 1.4.4, krusial untuk pengguna lansia (target utama aplikasi hipertensi). | Hapus kedua atribut. |
| P2-12 | A7/A1 | deps, branding | `npm audit`: 4 moderate (`qs` via express). Bundle utama 1.34 MB. Sisa branding "HeartSync" di CI, `docs/ARCHITECTURE.md`, `public/sw.js` (judul notifikasi). Dokumentasi ganda `docs/book` vs `documentation/markdown`. Skill duplikat `.agents/` vs `.claude/`. | `npm audit fix`, code-split jsPDF/Recharts, satukan branding & satu folder docs. |

---

## 5. Peta Temuan per Prinsip Aorta

```
A1 Satu jalur utama        ■■□□□  P2-1, P2-2, P2-12          — kode mati & dokumentasi ganda
A2 Aliran tanpa kebocoran  ■■■■■  P0-3, P0-4, P0-5, P1-2/3/4 — titik paling kritis
A3 Distribusi ke tubuh     ■■■■■  P0-1, P0-2, P0-5, P1-1     — delete & id collision
A4 Link / FHIR             ■■■□□  P0-4, P1-7, P1-8           — export belum lolos validator
A5 Kejujuran klinis        ■■■■□  P0-6, P1-5, P1-6, P2-3..7  — status sync & BLE metadata
A6 Dinding pembuluh        ■■■□□  P1-9..11, P2-9, P2-10      — rate limit & secret handling
A7 Tekanan sistemik        ■■■□□  P1-12, P2-8, P2-11, P2-12  — CI palsu & sync boros
```

### Yang sudah selaras dengan Logos Aorta ✅
- Offline-first Dexie sebagai jalur utama; TanStack/Zustand hanya invalidasi — A1 jelas.
- Middleware `updatedAt` + tombstone di level `dbcore` — desain tepat, hanya eksekusinya bocor.
- bcrypt + upgrade transparan dari SHA-256 legacy; tidak ada plaintext compare.
- AES-256-GCM + PBKDF2 (100k, salt 16B, IV 12B) untuk `.albackup` — benar.
- Koefisien Pooled Cohort Equations untuk 4 kelompok sudah diverifikasi cocok dengan Goff et al. 2013.
- ML menolak menebak (`not_enough_data`), deterministik, dan mencantumkan ukuran grup.
- Data user di-scope per `userId` di setiap query server.

---

## 6. Roadmap Perbaikan yang Disarankan

| Sprint | Isi | Prinsip |
|--------|-----|---------|
| **1 — Hentikan ruptur** | P0-1 s/d P0-6, P1-12 (CI jujur dulu supaya fix berikutnya tervalidasi) | A2, A3, A5 |
| **2 — Distribusi aman** | P1-1 (UUID semua tabel), P1-2, P1-3, P1-4, P2-8 (bulkWrite + incremental sync) | A2, A3, A7 |
| **3 — Link valid** | P1-7, P1-8 + test FHIR validator di CI, P1-5, P1-6 | A4, A5 |
| **4 — Dinding** | P1-9, P1-10, P1-11, P2-9, P2-10 | A6 |
| **5 — Kejujuran & polish** | P2-1..P2-7, P2-11, P2-12 | A1, A5, A7 |

**Gap terbesar di luar daftar:** repo ini tidak punya satu pun automated test. Untuk aplikasi rekam medis, minimal butuh test untuk: `classifyBP`, `calculateAscvdRisk` (nilai referensi dari paper), `decodeSFloat` (termasuk special values), round-trip sync dua device (push/pull/tombstone), dan validasi FHIR bundle.
