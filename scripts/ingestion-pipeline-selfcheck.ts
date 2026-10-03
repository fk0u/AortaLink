import {
  ContentIngestionPipeline,
  INGESTION_ALLOWLIST_SOURCES,
  isSourceAllowlisted,
  containsForbiddenDosing
} from '../src/services/knowledge-base/content-ingestion-pipeline.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('[Ingestion Pipeline Selfcheck] Starting test suite...');

// Test 1: Allowlist validation
console.log('Testing allowlist sources & domains...');
assert(INGESTION_ALLOWLIST_SOURCES.length >= 3, 'Must have at least 3 active allowlist sources');
assert(isSourceAllowlisted('https://pubmed.ncbi.nlm.nih.gov/39210722/'), 'PubMed must be allowlisted');
assert(isSourceAllowlisted('https://p2ptm.kemkes.go.id/artikel-sehat/hipertensi'), 'Kemenkes P2PTM must be allowlisted');
assert(isSourceAllowlisted('https://www.who.int/news-room/fact-sheets/detail/hypertension'), 'WHO must be allowlisted');
assert(!isSourceAllowlisted('https://random-blog.com/medical-tips'), 'Unauthorized domain must be rejected');

// Test 2: Forbidden dosing & prescribing terms detection
console.log('Testing forbidden prescribing terms detection...');
assert(containsForbiddenDosing('Minum dosis 10mg amlodipine sekarang'), 'Direct dosage must be flagged');
assert(containsForbiddenDosing('Naikkan dosis captopril Anda'), 'Dose escalation must be flagged');
assert(!containsForbiddenDosing('Amlodipine merupakan obat golongan CCB untuk menurunkan resistensi vaskular'), 'Descriptive educational summary must pass');

// Test 3: Ingestion produces drafts with strict status gating
console.log('Testing candidate ingestion flow...');
const pipeline = new ContentIngestionPipeline();

const result = pipeline.ingestCandidates('pubmed_open_abstracts', [
  {
    topik: 'hypertension',
    tier: 'non_pharmacological',
    title: 'Manajemen Stres dan Regulasi Otonom pada Hipertensi',
    ringkasan: 'Teknik relaksasi dan pernapasan lambat (slow deep breathing) terbukti menurunkan tonus simpatis.',
    sumber: [{ title: 'PubMed Open Abstract', url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/', year: 2024 }],
    levelBukti: '2a',
    tags: ['stres', 'lifestyle'],
    relatedTopics: ['general_cardiovascular']
  },
  {
    topik: 'hypertension',
    tier: 'pharmacological',
    title: 'Obat Tanpa Izin Dosis',
    ringkasan: 'Minum dosis 20mg furosemide di pagi hari jika kaki bengkak', // should be rejected!
    sumber: [{ title: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/87654321/', year: 2024 }],
    levelBukti: '3',
    tags: ['dosing'],
    relatedTopics: []
  },
  {
    topik: 'taa',
    tier: 'non_pharmacological',
    title: 'Artikel dari Blog Ilegal',
    ringkasan: 'Info aneurisma dari domain yang tidak masuk allowlist',
    sumber: [{ title: 'Blog', url: 'https://spam-medical.org/article', year: 2024 }],
    levelBukti: '4',
    tags: ['unauthorized'],
    relatedTopics: []
  }
]);

assert(result.totalCandidateItems === 3, 'Must process 3 candidates');
assert(result.acceptedDrafts === 1, 'Only 1 candidate must be accepted as draft');
assert(result.rejectedDueToDisallowedTerms === 1, '1 candidate rejected due to forbidden dosing');
assert(result.rejectedDueToAllowlist === 1, '1 candidate rejected due to unauthorized domain');

// Test 4: Drafts cannot be visible to patients until reviewed by clinician
console.log('Testing draft status and clinical review approval...');
const pendingDrafts = pipeline.getPendingDrafts();
assert(pendingDrafts.length === 1, 'Must have 1 pending draft');
const draft = pendingDrafts[0];
assert(draft.status === 'draft', 'Status must be strictly draft');
assert(Boolean(draft.expiresAt), 'Draft must have an auto-expiry timestamp');

// Clinician approves the draft
const approvedItem = pipeline.approveDraft(draft.id, 'dr. Sp.JP Reviewer', 'Revisi bahasa disetujui');
assert(approvedItem.reviewer === 'dr. Sp.JP Reviewer', 'Approved item must store clinician reviewer name');
assert(Boolean(approvedItem.tanggalReview), 'Approved item must record review date');
assert(pipeline.getPendingDrafts().length === 0, 'No more pending drafts after approval');

console.log('[Ingestion Pipeline Selfcheck] All Ingestion Pipeline checks passed successfully! ✓');
