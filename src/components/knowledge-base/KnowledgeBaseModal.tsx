import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, BookOpen, Filter, Stethoscope } from '../icons/AppIcons.tsx';
import { KnowledgeBaseService } from '../../services/knowledge-base/knowledge-base-service';
import { KnowledgeTopic, ContentTier, KnowledgeItem } from '../../types/knowledge-base';
import { KnowledgeArticleCard } from './KnowledgeArticleCard';
import { SurveillanceReminderPanel } from './SurveillanceReminderPanel';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: KnowledgeTopic | 'all';
}

const TOPIC_OPTIONS: { value: KnowledgeTopic | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Topik' },
  { value: 'hypertension', label: 'Hipertensi' },
  { value: 'taa', label: 'TAA' },
  { value: 'aaa', label: 'AAA' },
  { value: 'aortic_dissection', label: 'Diseksi Aorta' },
  { value: 'vasculitis', label: 'Vaskulitis' }
];

const TIER_OPTIONS: { value: ContentTier | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Kategori' },
  { value: 'non_pharmacological', label: 'Non-Farmakologis' },
  { value: 'pharmacological', label: 'Farmakologis' },
  { value: 'complementary', label: 'Komplementer' }
];

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ 
  isOpen, 
  onClose,
  initialTopic = 'all'
}) => {
  const [activeTopic, setActiveTopic] = useState<KnowledgeTopic | 'all'>(initialTopic);
  const [activeTier, setActiveTier] = useState<ContentTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    return KnowledgeBaseService.filter({
      topic: activeTopic,
      tier: activeTier,
      query: searchQuery
    });
  }, [activeTopic, activeTier, searchQuery]);

  // Determine if we should show surveillance panel based on active topic
  const surveillanceCondition = useMemo(() => {
    if (activeTopic === 'taa') return 'taa';
    if (activeTopic === 'aaa') return 'aaa';
    if (activeTopic === 'aortic_dissection') return 'post_dissection';
    return null;
  }, [activeTopic]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl h-[90vh] md:h-[85vh] flex flex-col md:relative md:inset-auto md:w-[800px] md:mx-auto md:mt-20 md:rounded-3xl md:h-[80vh]"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pusat Pengetahuan</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Panduan klinis dan edukasi multi-tier</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search and Filters */}
              <div className="p-5 space-y-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari artikel, topik, atau tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 transition-shadow"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex overflow-x-auto pb-1 hide-scrollbar gap-2">
                    {TOPIC_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setActiveTopic(opt.value)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          activeTopic === opt.value 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {TIER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setActiveTier(opt.value)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        activeTier === opt.value 
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-5 pb-20 md:pb-5">
                {surveillanceCondition && !searchQuery && activeTier === 'all' && (
                  <SurveillanceReminderPanel condition={surveillanceCondition} />
                )}

                {filteredArticles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400">
                      <Stethoscope className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">Tidak ada artikel ditemukan</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coba ubah filter atau kata kunci pencarian Anda.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setActiveTopic('all');
                        setActiveTier('all');
                      }}
                      className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                    >
                      Reset Filter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Menampilkan {filteredArticles.length} artikel edukasi
                    </p>
                    {filteredArticles.map(article => (
                      <KnowledgeArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
