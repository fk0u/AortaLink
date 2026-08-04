# 📱 AortaLink Mobile — Cross-Platform Flutter EHR App

> **AortaLink Mobile** is the cross-platform (iOS & Android) mobile application for the **AortaLink Open-Source AI EHR Platform**. Built with Flutter, it integrates HL7 FHIR R4 data modeling, live streaming AI consultations with **NVIDIA NIM API (`z-ai/glm-5.2`)**, **MongoDB Atlas Cloud Sync**, and **JSON Backup Export/Import**.

---

## 🌟 Key Mobile Features

- **HL7 FHIR R4 Data Modeling**: Standardized observation resources for vital signs and combination drug therapy.
- **NVIDIA NIM AI Consultation**: Live AI CDSS clinical consultation powered by model `z-ai/glm-5.2`.
- **MongoDB Atlas Sync**: Cloud sync service configured for MongoDB Atlas Data API (Public Key `wfokmvwy`, Private Key `729507c9-3cb2-430d-8c51-a20878616549`).
- **Combination Medication Tracker**: Checkbox tracker for default regimen (Amlodipine 5mg CCB, Candesartan 8mg ARB, Allopurinol 100mg).
- **JSON Backup & Restore**: Full JSON backup export and import functionality.
- **Light-Mode Minimalist Design**: Hallmark-inspired clean minimalist user interface.

---

## 🚀 How to Run the Flutter App

### Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (v3.0.0 or higher)
- Android Studio / Xcode

### Setup & Run
```bash
# Navigate to mobile_app directory
cd mobile_app

# Get Flutter dependencies
flutter pub get

# Run on connected device or emulator
flutter run
```

---

## 📱 Build Production Packages

```bash
# Build Android APK
flutter build apk --release

# Build iOS App Bundle
flutter build ipa --release
```
