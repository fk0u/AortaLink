export type EvidenceLevel = '1a' | '1b' | '2a' | '2b' | '3' | '4' | '5' | 'expert_opinion';

export type ContentTier = 'non_pharmacological' | 'pharmacological' | 'complementary';

export type KnowledgeTopic = 'hypertension' | 'taa' | 'aaa' | 'aortic_dissection' | 'vasculitis' | 'general_cardiovascular';

export interface ContentSource {
  title: string;
  url?: string;
  doi?: string;
  pubmedId?: string;
  year: number;
}

export interface KnowledgeItem {
  id: string;
  topik: KnowledgeTopic;
  tier: ContentTier;
  title: string;
  ringkasan: string;
  sumber: ContentSource[];
  levelBukti: EvidenceLevel;
  tanggalReview: string;
  reviewer: string;
  tags: string[];
  relatedTopics: KnowledgeTopic[];
}

export interface SurveillanceSchedule {
  condition: 'taa' | 'aaa' | 'post_dissection';
  intervalMonths: number;
  modality: 'Echocardiography' | 'CT' | 'MRI' | 'Ultrasound';
  guidelineRef: string;
  notes?: string;
}
