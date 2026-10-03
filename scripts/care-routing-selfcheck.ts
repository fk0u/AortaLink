import { CARE_RULES, evaluateRedFlags, evaluateBPRouting, generateReferral } from '../src/services/care-routing/care-routing-engine.ts';
import { AORTIC_RED_FLAGS } from '../src/services/care-routing/red-flag-rules.ts';
import { generateReferralRecommendations } from '../src/services/care-routing/referral-rules.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('[Care Routing Selfcheck] Starting test suite...');

// Test 1: Red flags rule evaluation
console.log('Testing Red Flags rule evaluation...');
assert(AORTIC_RED_FLAGS.length >= 5, 'Must have at least 5 aortic red flags');
const triageDecision = evaluateRedFlags(['rf_chest_back_pain']);
assert(triageDecision !== null, 'Red flag evaluation must not be null');
assert(triageDecision?.level === 'EMERGENCY', 'Red flag triage level must be EMERGENCY');
assert(Boolean(triageDecision?.guidelineRef.includes('ACC/AHA')), 'Must reference ACC/AHA guideline');

// Test 2: BP >= 180/120 symptomatic vs asymptomatic
console.log('Testing BP >= 180/120 symptomatic vs asymptomatic routing...');
const htnEmergency = evaluateBPRouting(190, 125, true);
assert(htnEmergency.level === 'EMERGENCY', 'BP 190/125 with symptoms must be EMERGENCY');
assert(htnEmergency.guidelineRef.includes('ESH'), 'HTN Emergency must cite ESH');

const htnUrgency = evaluateBPRouting(185, 120, false);
assert(htnUrgency.level === 'URGENT', 'BP 185/120 without symptoms must be URGENT');
assert(htnUrgency.action.includes('Istirahat 5 menit'), 'HTN Urgency action must recommend 5 min rest');

const htnControlled = evaluateBPRouting(118, 76, false);
assert(htnControlled.level === 'SELF_CARE', 'BP 118/76 must be SELF_CARE');

// Test 3: Every rule has guideline reference and section
console.log('Testing CARE_RULES completeness...');
assert(CARE_RULES.length >= 3, 'Must have at least 3 core deterministic rules');
for (const rule of CARE_RULES) {
  assert(Boolean(rule.id), `Rule must have an ID: ${rule.id}`);
  assert(Boolean(rule.guidelineRef), `Rule ${rule.id} must have guidelineRef`);
  assert(Boolean(rule.section), `Rule ${rule.id} must have section`);
}

// Test 4: Referral recommendations (without drug dosing)
console.log('Testing Referral recommendations...');
const referrals = generateReferralRecommendations(190, 120, ['rf_syncope'], true);
assert(referrals.length > 0, 'Must produce referral recommendations for emergency/urgent case');
for (const ref of referrals) {
  assert(!ref.description.includes('mg'), 'Referral must not specify drug dosages');
  assert(Boolean(ref.guidelineRef), 'Referral must have guidelineRef');
}

console.log('[Care Routing Selfcheck] All care routing checks passed successfully! ✓');
