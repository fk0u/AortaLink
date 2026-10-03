import type { KnowledgeItem, KnowledgeTopic, ContentTier, SurveillanceSchedule } from '../../types/knowledge-base.ts';
import { knowledgeBaseData, surveillanceSchedules } from './knowledge-base-data.ts';

export const KnowledgeBaseService = {
  /**
   * Mendapatkan semua pengetahuan
   */
  getAll(): KnowledgeItem[] {
    return knowledgeBaseData;
  },

  /**
   * Mendapatkan pengetahuan berdasarkan topik tertentu
   */
  getByTopic(topic: KnowledgeTopic): KnowledgeItem[] {
    return knowledgeBaseData.filter((item) => item.topik === topic);
  },

  /**
   * Mendapatkan pengetahuan berdasarkan tier tertentu
   */
  getByTier(tier: ContentTier): KnowledgeItem[] {
    return knowledgeBaseData.filter((item) => item.tier === tier);
  },

  /**
   * Mencari pengetahuan berdasarkan query teks (judul, ringkasan, atau tag)
   */
  search(query: string): KnowledgeItem[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return knowledgeBaseData;

    return knowledgeBaseData.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.ringkasan.toLowerCase().includes(lowerQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Mendapatkan artikel dengan kombinasi topik, tier, dan search query
   */
  filter(options: { topic?: KnowledgeTopic | 'all'; tier?: ContentTier | 'all'; query?: string }): KnowledgeItem[] {
    let result = knowledgeBaseData;

    if (options.topic && options.topic !== 'all') {
      result = result.filter((item) => item.topik === options.topic);
    }

    if (options.tier && options.tier !== 'all') {
      result = result.filter((item) => item.tier === options.tier);
    }

    if (options.query) {
      const lowerQuery = options.query.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.ringkasan.toLowerCase().includes(lowerQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return result;
  },

  /**
   * Mendapatkan artikel yang direkomendasikan terkait artikel tertentu
   */
  getRelatedItems(itemId: string): KnowledgeItem[] {
    const currentItem = knowledgeBaseData.find((item) => item.id === itemId);
    if (!currentItem) return [];

    return knowledgeBaseData.filter(
      (item) => item.id !== itemId && item.relatedTopics.includes(currentItem.topik)
    );
  },

  /**
   * Mendapatkan jadwal surveilans berdasarkan kondisi (TAA, AAA, Post Dissection)
   */
  getSurveillanceSchedule(condition: SurveillanceSchedule['condition']): SurveillanceSchedule | undefined {
    return surveillanceSchedules.find((schedule) => schedule.condition === condition);
  }
};
