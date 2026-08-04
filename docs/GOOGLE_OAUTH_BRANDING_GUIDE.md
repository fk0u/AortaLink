# 🏷️ Panduan Menampilkan Nama Aplikasi "AortaLink" pada Login Google OAuth

Secara bawaan (*default*), Google akan menampilkan **Client ID** (seperti `123456789-xyz.apps.googleusercontent.com`) pada dialog login jika **OAuth Consent Screen** di Google Cloud Console belum diatur nama dan logo resminya.

Agar Google menampilkan nama resmi **"AortaLink EHR SaaS"** dan logo aplikasi saat pengguna mengeklik **"Masuk dengan Google"**, ikuti 3 langkah berikut:

---

## 📋 Langkah 1: Atur Nama Aplikasi di Google Cloud Console

1. Buka [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent).
2. Di bagian **App information**, isi kolom berikut:
   - **App name**: Ketik `AortaLink` atau `AortaLink EHR SaaS`. (Nama ini yang akan muncul di popup login Google).
   - **User support email**: Pilih alamat email Google Anda.
   - **App logo** *(Opsional)*: Unggah logo persegi 120x120 px.
3. Di bagian **App domain**:
   - **Application home page**: `http://localhost:8173` (atau URL domain web Anda).
   - **Authorized domains**: Tambahkan domain Anda jika sudah dideploy.
4. Di bagian **Developer contact information**: Isi email Anda.
5. Klik **SAVE AND CONTINUE**.

---

## 🚀 Langkah 2: Ubah Status Aplikasi dari "Testing" ke "Production"

1. Di tab **OAuth consent screen**, lihat bagian **Publishing status**.
2. Secara bawaan, statusnya adalah **Testing** (yang membuat Google menampilkan peringatan Client ID / unverified app).
3. Klik tombol **PUBLISH APP**.
4. Konfirmasi pembuatan aplikasi publik.

> 💡 **Catatan**: Setelah di-publish, Google akan secara resmi menampilkan nama **AortaLink** di atas dialog login Google!

---

## 🔑 Langkah 3: Berikan Nama pada OAuth 2.0 Client Credentials

1. Buka menu **APIs & Services** $\rightarrow$ **Credentials**.
2. Klik nama Client ID Web Application Anda.
3. Ubah kolom **Name** menjadi: `AortaLink Web Application`.
4. Klik **SAVE**.
