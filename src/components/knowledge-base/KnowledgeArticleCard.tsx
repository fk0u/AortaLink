import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, BookOpen, ExternalLink, Calendar, CheckCircle2 as CheckCircle, Tag } from '../icons/AppIcons.tsx';
import { KnowledgeItem, ContentTier, EvidenceLevel, KnowledgeTopic } from '../../types/knowledge-base';

interface KnowledgeArticleCardProps {
  article: KnowledgeItem;
}

const tierLabels: Record<ContentTier, { label: string; color: string }> = {
  non_pharmacological: { label: 'Non-Farmakologis', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  pharmacological: { label: 'Farmakologis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  complementary: { label: 'Komplementer', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' }
};

const topicLabels: Record<KnowledgeTopic, string> = {
  hypertension: 'Hipertensi',
  taa: 'TAA',
  aaa: 'AAA',
  aortic_dissection: 'Diseksi Aorta',
  vasculitis: 'Vaskulitis',
  general_cardiovascular: 'Kardiovaskular Umum'
};

const evidenceLevelDesc: Record<EvidenceLevel, string> = {
  '1a': 'Sangat Direkomendasikan (Bukti Kuat)',
  '1b': 'Sangat Direkomendasikan (Satu RCT)',
  '2a': 'Sebaiknya Dilakukan (Bukti Sedang)',
  '2b': 'Dapat Dipertimbangkan (Bukti Terbatas)',
  '3': 'Tidak Direkomendasikan / Harm',
  '4': 'Konsensus Ahli',
  '5': 'Opini Klinis Dasar',
  'expert_opinion': 'Opini Ahli'
};

export const KnowledgeArticleCard: React.FC<KnowledgeArticleCardProps> = ({ article }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4 transition-all hover:shadow-md">
      <div 
        className="p-4 cursor-pointer flex justify-between items-start"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 pr-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${tierLabels[article.tier].color}`}>
              {tierLabels[article.tier].label}
            </span>
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Level {article.levelBukti.toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            {article.title}
          </h3>
          {!isExpanded && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 line-clamp-2">
              {article.ringkasan}
            </p>
          )}
        </div>
        <button className="p-2 text-gray-400 hover:text-primary-600 bg-gray-50 dark:bg-gray-700/50 rounded-full transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-gray-50 dark:border-gray-700">
              <div className="mt-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {article.ringkasan}
              </div>

              {/* Tags & Related Topics */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                {article.tags.map(tag => (
                  <span key={tag} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
                {article.relatedTopics.length > 0 && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400">
                    <span className="font-medium">Topik Terkait:</span>
                    {article.relatedTopics.map(t => topicLabels[t]).join(', ')}
                  </div>
                )}
              </div>

              {/* Sources */}
              <div className="mt-5 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <BookOpen className="w-4 h-4 text-primary-500" />
                  Sumber Pedoman & Referensi
                </div>
                <ul className="space-y-2">
                  {article.sumber.map((s, idx) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>
                        {s.title} ({s.year})
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-2 text-primary-500 hover:underline">
                            Tautan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-gray-500 dark:text-gray-400 gap-2">
                <div className="flex items-center gap-1" title={evidenceLevelDesc[article.levelBukti]}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Makna Level Bukti: {evidenceLevelDesc[article.levelBukti]}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Ditinjau oleh {article.reviewer} ({new Date(article.tanggalReview).toLocaleDateString('id-ID')})
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
