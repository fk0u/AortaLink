/**
 * AortaLink Connectors Module
 * ---------------------------
 * External integration and infrastructure layer:
 * - SATUSEHAT FHIR R4 API & Profiles
 * - Dexie.js IndexedDB Local Storage
 * - Cloud Sync (MongoDB Atlas)
 * - Hardware Telemetry (Bluetooth LE GATT)
 * - PDF Document Exporter
 */

// 1. SATUSEHAT Connector (Permenkes 24/2022)
export * from './satusehat/index.ts';

// 2. Local Storage Connector (Dexie.js)
export { db, AortaLinkDatabase, seedInitialData, clearLocalEhrDatabase } from '../db/index.ts';

// 3. Bluetooth Web API Connector
export * from '../services/bluetooth/ble-service.ts';

// 4. Cloud Database Sync Connector (MongoDB Atlas)
export { mongoDbAtlasService } from '../services/db/mongodb-service.ts';

// 5. Document Exporter Connector (PDF / FHIR Bundle)
export * from '../services/fhir/fhir-exporter.ts';
