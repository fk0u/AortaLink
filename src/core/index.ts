/**
 * AortaLink Core Domain Engine
 * ----------------------------
 * Pure TypeScript modules containing clinical models, guidelines,
 * determinisitic scoring, care routing, and validation logic.
 * Free from React, UI components, Dexie, Express, or direct DOM access.
 */

// Guideline Classification & Hemodynamics
export * from '../utils/bp-classifier.ts';
export * from '../utils/ascvd-calculator.ts';

// Health Score (Life's Essential 8)
export * from '../services/health-score/health-score-engine.ts';

// Care Routing & Red Flags Rules Engine
export * from '../services/care-routing/care-routing-engine.ts';
export * from '../services/care-routing/red-flag-rules.ts';
export * from '../services/care-routing/referral-rules.ts';

// Knowledge Base & Content Ingestion Pipeline
export * from '../services/knowledge-base/knowledge-base-service.ts';
export * from '../services/knowledge-base/knowledge-base-data.ts';
export * from '../services/knowledge-base/content-ingestion-pipeline.ts';

// Clinical Screening
export * from '../services/screening/screening-service.ts';

// Bluetooth GATT SFloat Parser & Telemetry Core
export { decodeSFloat, parseBPMeasurement, kPaToMmHg } from '../services/bluetooth/ble-service.ts';

// FHIR R4 Contract Adapters
export * from '../services/fhir/fhir-contract-adapters.ts';
