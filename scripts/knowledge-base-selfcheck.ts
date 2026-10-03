import { KnowledgeBaseService } from '../src/services/knowledge-base/knowledge-base-service.ts';
import { surveillanceSchedules } from '../src/services/knowledge-base/knowledge-base-data.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('[Knowledge Base Selfcheck] Starting test suite...');

// Test 1: Content count & coverage
const allItems = KnowledgeBaseService.getAll();
console.log(`Checking knowledge base articles (Total: ${allItems.length})...`);
assert(allItems.length >= 25, 'Must contain at least 25 curated knowledge base articles');

// Test 2: Topics coverage (hypertension, taa, aaa, aortic_dissection, vasculitis)
const topics = ['hypertension', 'taa', 'aaa', 'aortic_dissection', 'vasculitis'] as const;
for (const topic of topics) {
  const items = KnowledgeBaseService.getByTopic(topic);
  console.log(`Topic '${topic}': ${items.length} items found`);
  assert(items.length >= 3, `Topic '${topic}' must have at least 3 curated items`);
}

// Test 3: Multi-tier coverage (non_pharmacological, pharmacological, complementary)
const tiers = ['non_pharmacological', 'pharmacological', 'complementary'] as const;
for (const tier of tiers) {
  const items = KnowledgeBaseService.getByTier(tier);
  console.log(`Tier '${tier}': ${items.length} items found`);
  assert(items.length >= 3, `Tier '${tier}' must have at least 3 curated items`);
}

// Test 4: Schema item fields (topik, tier, ringkasan, sumber[], levelBukti, tanggalReview, reviewer)
console.log('Validating KnowledgeItem schema for each article...');
for (const item of allItems) {
  assert(Boolean(item.id), 'Item must have an id');
  assert(Boolean(item.topik), `Item ${item.id} must have a topic`);
  assert(Boolean(item.tier), `Item ${item.id} must have a tier`);
  assert(Boolean(item.title), `Item ${item.id} must have a title`);
  assert(Boolean(item.ringkasan), `Item ${item.id} must have a ringkasan`);
  assert(Array.isArray(item.sumber) && item.sumber.length > 0, `Item ${item.id} must have at least 1 source citation`);
  assert(Boolean(item.levelBukti), `Item ${item.id} must have a levelBukti`);
  assert(Boolean(item.tanggalReview), `Item ${item.id} must have a review date`);
  assert(Boolean(item.reviewer), `Item ${item.id} must have a reviewer name`);
  // Ensure pharmacological tier does not provide medication dosage prescriptions
  if (item.tier === 'pharmacological') {
    assert(!item.ringkasan.toLowerCase().includes('dosis yang dianjurkan untuk anda adalah'), `Item ${item.id} must not give personalized drug dosing prescriptions`);
  }
}

// Test 5: Search & Filter functionality
console.log('Testing search and filter functions...');
const dashSearch = KnowledgeBaseService.search('DASH');
assert(dashSearch.length > 0, 'Search for DASH must return results');

const filtered = KnowledgeBaseService.filter({ topic: 'hypertension', tier: 'non_pharmacological' });
assert(filtered.length > 0, 'Filter for hypertension + non_pharmacological must return results');
assert(filtered.every(i => i.topik === 'hypertension' && i.tier === 'non_pharmacological'), 'All filtered items must match criteria');

// Test 6: Surveillance schedules for TAA & AAA
console.log('Testing Surveillance schedules...');
assert(surveillanceSchedules.length >= 2, 'Must have surveillance schedules for TAA/AAA');
for (const schedule of surveillanceSchedules) {
  assert(Boolean(schedule.condition), 'Schedule must have a condition');
  assert(schedule.intervalMonths > 0, 'Interval must be positive months');
  assert(Boolean(schedule.modality), 'Schedule must specify imaging modality');
  assert(Boolean(schedule.guidelineRef), 'Schedule must cite guideline');
}

console.log('[Knowledge Base Selfcheck] All Knowledge Base checks passed successfully! ✓');
