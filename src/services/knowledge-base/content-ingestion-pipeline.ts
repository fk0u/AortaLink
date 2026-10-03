import type {
  DraftContentItem,
  IngestionAllowlistSource,
  IngestionExecutionResult,
  KnowledgeItem
} from '../../types/knowledge-base.ts';

/**
 * Verified Allowlist of Ingestion Sources (Issue #19)
 * Strictly restricted to public medical portals with open citation policies.
 * Direct scraping of paywalled/copyright-restricted full guideline text is prohibited.
 */
export const INGESTION_ALLOWLIST_SOURCES: IngestionAllowlistSource[] = [
  {
    id: 'pubmed_open_abstracts',
    name: 'PubMed Central Open Access & Public Abstracts',
    domain: 'pubmed.ncbi.nlm.nih.gov',
    description: 'National Library of Medicine public abstracts and Open Access PMC subset.',
    licenseNote: 'Public domain / CC-BY where noted on PMC subset.',
    robotsCompliant: true,
    isActive: true
  },
  {
    id: 'kemenkes_p2ptm',
    name: 'Direktorat P2PTM Kementerian Kesehatan RI',
    domain: 'p2ptm.kemkes.go.id',
    description: 'Pedoman pengendalian penyakit tidak menular (hipertensi, kardiovaskular) Kemenkes RI.',
    licenseNote: 'Informasi Publik Pemerintah RI.',
    robotsCompliant: true,
    isActive: true
  },
  {
    id: 'who_guidelines_public',
    name: 'World Health Organization (WHO) Guideline Summaries',
    domain: 'who.int',
    description: 'WHO Non-communicable diseases guidelines and public sodium/lifestyle recommendations.',
    licenseNote: 'WHO open dissemination license.',
    robotsCompliant: true,
    isActive: true
  }
];

/**
 * Disallowed keywords: Content containing dosage instructions or prescribing
 * language will be rejected during candidate ingestion to protect patient safety.
 */
const FORBIDDEN_DOSING_KEYWORDS = [
  'minum dosis',
  'tambahkan dosis',
  'naikkan dosis',
  'ganti obat anda menjadi',
  'resepkan',
  'dosis yang dianjurkan untuk anda adalah'
];

/**
 * Checks if a candidate source URL belongs to the verified allowlist.
 */
export function isSourceAllowlisted(url: string): boolean {
  try {
    const parsed = new URL(url);
    return INGESTION_ALLOWLIST_SOURCES.some(
      (source) => source.isActive && parsed.hostname.endsWith(source.domain)
    );
  } catch {
    return false;
  }
}

/**
 * Checks if a candidate text contains forbidden individual prescribing language.
 */
export function containsForbiddenDosing(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_DOSING_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Ingestion Service & Pipeline Engine
 * Transforms ingested candidate articles into `draft` items requiring clinical review.
 * NEVER publishes directly to patients.
 */
export class ContentIngestionPipeline {
  private draftsStore: DraftContentItem[] = [];

  constructor(initialDrafts: DraftContentItem[] = []) {
    this.draftsStore = [...initialDrafts];
  }

  /**
   * Ingest candidates from developer datasets or crawlers.
   * Enforces:
   * 1. Allowlisted domains only
   * 2. Rejection of unvetted dosage recommendations
   * 3. Attribution of source, retrieval timestamp, and auto-expiry date (default: 180 days)
   * 4. Initial status: STRICTLY `draft`
   */
  public ingestCandidates(
    sourceId: string,
    candidates: Omit<KnowledgeItem, 'id' | 'tanggalReview' | 'reviewer'>[]
  ): IngestionExecutionResult {
    const allowlistSource = INGESTION_ALLOWLIST_SOURCES.find((s) => s.id === sourceId);
    if (!allowlistSource || !allowlistSource.isActive) {
      throw new Error(`Ingestion source ${sourceId} is not in the active allowlist.`);
    }

    let accepted = 0;
    let rejectedAllowlist = 0;
    let rejectedDosing = 0;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days auto-expiry

    const newDrafts: DraftContentItem[] = [];

    for (const c of candidates) {
      // Validate all URLs in sources
      const allUrlsValid = c.sumber.every((s) => !s.url || isSourceAllowlisted(s.url));
      if (!allUrlsValid) {
        rejectedAllowlist++;
        continue;
      }

      // Check for forbidden dosing text
      if (containsForbiddenDosing(c.ringkasan) || containsForbiddenDosing(c.title)) {
        rejectedDosing++;
        continue;
      }

      const draft: DraftContentItem = {
        ...c,
        id: `draft-${sourceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        status: 'draft',
        ingestionSourceId: sourceId,
        ingestedAt: now.toISOString(),
        expiresAt: expiryDate.toISOString(),
        tanggalReview: '', // Must be filled by clinician upon approval
        reviewer: ''      // Must be filled by clinician upon approval
      };

      newDrafts.push(draft);
      this.draftsStore.push(draft);
      accepted++;
    }

    return {
      sourceId,
      totalCandidateItems: candidates.length,
      acceptedDrafts: accepted,
      rejectedDueToAllowlist: rejectedAllowlist,
      rejectedDueToDisallowedTerms: rejectedDosing,
      drafts: newDrafts
    };
  }

  /**
   * Retrieves all pending drafts awaiting clinical review.
   */
  public getPendingDrafts(): DraftContentItem[] {
    return this.draftsStore.filter(
      (d) => d.status === 'draft' || d.status === 'under_review'
    );
  }

  /**
   * Evaluates expired drafts.
   * If a draft has passed its expiration date without review, status becomes `expired`.
   */
  public evaluateExpiredDrafts(): DraftContentItem[] {
    const nowIso = new Date().toISOString();
    for (const d of this.draftsStore) {
      if (d.status !== 'approved' && d.status !== 'rejected' && d.expiresAt < nowIso) {
        d.status = 'expired';
      }
    }
    return this.draftsStore.filter((d) => d.status === 'expired');
  }

  /**
   * Clinical Review Action: Approve a draft for publication into patient-facing knowledge base.
   */
  public approveDraft(
    draftId: string,
    reviewerName: string,
    clinicalNotes?: string
  ): KnowledgeItem {
    const draft = this.draftsStore.find((d) => d.id === draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found.`);

    if (draft.status === 'expired') {
      throw new Error(`Cannot approve expired draft ${draftId}. Please re-ingest and review.`);
    }

    const now = new Date().toISOString().split('T')[0];
    draft.status = 'approved';
    draft.approvedBy = reviewerName;
    draft.approvedAt = new Date().toISOString();
    draft.reviewer = reviewerName;
    draft.tanggalReview = now;
    if (clinicalNotes) draft.clinicalReviewNotes = clinicalNotes;

    // Return the clean KnowledgeItem for publication
    const publishedItem: KnowledgeItem = {
      id: draft.id,
      topik: draft.topik,
      tier: draft.tier,
      title: draft.title,
      ringkasan: draft.ringkasan,
      sumber: draft.sumber,
      levelBukti: draft.levelBukti,
      tanggalReview: draft.tanggalReview,
      reviewer: draft.reviewer,
      tags: draft.tags,
      relatedTopics: draft.relatedTopics
    };

    return publishedItem;
  }

  /**
   * Clinical Review Action: Reject a draft item.
   */
  public rejectDraft(draftId: string, reviewerName: string, reason: string): void {
    const draft = this.draftsStore.find((d) => d.id === draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found.`);

    draft.status = 'rejected';
    draft.approvedBy = reviewerName;
    draft.clinicalReviewNotes = reason;
  }
}
