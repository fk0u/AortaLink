import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  X, 
  Heart, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  HelpCircle,
  PhoneCall
} from '../icons/AppIcons';
import { playClickSound } from '../../utils/audio-fx';

interface GlossaryItem {
  id: string;
  term: string;
  category: 'dasar' | 'angka' | 'gaya-hidup' | 'darurat';
  simpleExplanation: string;
  clinicalNote?: string;
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    id: 'sistolik',
    term: 'Angka Atas (Sistolik)',
    category: 'angka',
    simpleExplanation:
      'Tekanan darah di pembuluh saat jantung sedang berdetak memompa darah ke seluruh tubuh. Nilai normal umumnya di bawah 120 mmHg.',
    clinicalNote: 'Tekanan puncak pada fase kontraksi ventrikel kiri jantung.'
  },
  {
    id: 'diastolik',
    term: 'Angka Bawah (Diastolik)',
    category: 'angka',
    simpleExplanation:
      'Tekanan darah di pembuluh saat jantung sedang beristirahat di antara dua detakan. Nilai normal umumnya di bawah 80 mmHg.',
    clinicalNote: 'Tekanan terendah pada fase relaksasi ventrikel jantung.'
  },
  {
    id: 'pulse',
    term: 'Denyut Nadi / Detak Jantung',
    category: 'angka',
    simpleExplanation:
      'Berapa kali jantung berdetak dalam 1 menit saat Anda beristirahat. Pada orang dewasa sehat, normalnya berkisar antara 60 hingga 100 detak per menit.',
    clinicalNote: 'Resting Heart Rate (RHR) diukur dalam beats per minute (bpm).'
  },
  {
    id: 'normal',
    term: 'Tekanan Darah Normal',
    category: 'dasar',
    simpleExplanation:
      'Angka atas kurang dari 120 DAN angka bawah kurang dari 80 (contoh: 115/75 mmHg). Pertahankan dengan pola makan sehat dan aktivitas fisik rutin.',
    clinicalNote: 'Klasifikasi JNC 8 / PERHI / AHA: <120/<80 mmHg.'
  },
  {
    id: 'pre-hipertensi',
    term: 'Pra-Hipertensi / Mulai Tinggi',
    category: 'dasar',
    simpleExplanation:
      'Angka atas antara 120-129 dengan angka bawah di bawah 80. Ini sinyal pengingat agar Anda mengurangi konsumsi garam dan mengelola stres sebelum naik menjadi darah tinggi.',
    clinicalNote: 'Elevated BP: Sistolik 120-129 dan Diastolik <80 mmHg.'
  },
  {
    id: 'hipertensi-1',
    term: 'Hipertensi Derajat 1',
    category: 'dasar',
    simpleExplanation:
      'Angka atas antara 130-139 ATAU angka bawah 80-89. Perlu evaluasi pola makan ketat dan konsultasikan dengan dokter puskesmas/klinik.',
    clinicalNote: 'Stage 1 Hypertension: 130-139 / 80-89 mmHg.'
  },
  {
    id: 'hipertensi-2',
    term: 'Hipertensi Derajat 2',
    category: 'dasar',
    simpleExplanation:
      'Angka atas 140 ke atas ATAU angka bawah 90 ke atas. Memerlukan penanganan rutin oleh dokter dan kemungkinan terapi obat penurun tensi.',
    clinicalNote: 'Stage 2 Hypertension: >=140 / >=90 mmHg.'
  },
  {
    id: 'krisis-hipertensi',
    term: 'Krisis Hipertensi (Bahaya)',
    category: 'darurat',
    simpleExplanation:
      'Angka atas di atas 180 ATAU angka bawah di atas 120. JANGAN DITUNDA: Duduk tenang, tunggu 5 menit dan ukur ulang. Jika tetap tinggi atau ada nyeri dada/sesak, segera ke IGD rumah sakit terdekat!',
    clinicalNote: 'Hypertensive Urgency / Emergency: Sistolik >180 dan/atau Diastolik >120 mmHg.'
  },
  {
    id: 'aorta',
    term: 'Aorta (Pembuluh Nadi Utama)',
    category: 'dasar',
    simpleExplanation:
      'Pipa darah terbesar di tubuh manusia yang mengalirkan darah kaya oksigen langsung dari jantung ke kepala, tangan, perut, dan kaki. Menjaga tensi terkontrol melindungi aorta agar tidak robek atau menggelembung.',
    clinicalNote: 'Arteri sistemik elastis utama; rentan terhadap aneurisma atau diseksi pada hipertensi kronis tak terkontrol.'
  },
  {
    id: 'garam-dash',
    term: 'Batas Konsumsi Garam Harian',
    category: 'gaya-hidup',
    simpleExplanation:
      'Kementerian Kesehatan menganjurkan maksimal 1 sendok teh garam dapur (sekitar 5 gram garam atau 2.000 mg natrium) per orang per hari. Kurangi makanan instan, kecap, dan camilan gurih berpengawet.',
    clinicalNote: 'Rekomendasi DASH diet: <2.300 mg natrium/hari, optimal <1.500 mg/hari pada hipertensi.'
  },
  {
    id: 'white-coat',
    term: 'Sindrom Jas Putih (White Coat)',
    category: 'dasar',
    simpleExplanation:
      'Kondisi di mana tensi Anda melonjak tinggi hanya saat diukur oleh dokter di rumah sakit/klinik karena rasa cemas atau tegang, padahal normal saat diukur mandiri di rumah.',
    clinicalNote: 'White-Coat Hypertension: Tensi klinik >=130/80 namun rata-rata HBPM/ABPM rumah <130/80 mmHg.'
  }
];

interface HealthGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSOS?: () => void;
}

export const HealthGlossaryModal: React.FC<HealthGlossaryModalProps> = ({
  isOpen,
  onClose,
  onOpenSOS
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return GLOSSARY_ITEMS.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        item.term.toLowerCase().includes(search.toLowerCase()) ||
        item.simpleExplanation.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Kamus Istilah Tekanan Darah dan Jantung"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Kamus Istilah Tensi & Jantung</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Penjelasan bahasa manusia yang mudah dipahami</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { playClickSound(); onClose(); }}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar & Category Pills */}
          <div className="p-4 border-b border-slate-100 dark:border-white/10 space-y-3 bg-white dark:bg-[#1c1c1e]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari istilah (contoh: sistolik, garam, bahaya)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-black focus:outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'angka', label: 'Arti Angka' },
                { id: 'dasar', label: 'Kategori Tensi' },
                { id: 'gaya-hidup', label: 'Pola Hidup' },
                { id: 'darurat', label: 'Tanda Bahaya' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { playClickSound(); setActiveCategory(cat.id); }}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Definitions */}
          <div className="p-4 overflow-y-auto space-y-3 text-sm flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Istilah tidak ditemukan</p>
                <p className="text-[11px] text-slate-400">Coba gunakan kata kunci lain seperti "sistolik" atau "garam"</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.category === 'darurat'
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                      : 'bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/70 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      {item.category === 'darurat' && <AlertTriangle size={14} className="text-rose-500" />}
                      {item.term}
                    </h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      item.category === 'darurat'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : item.category === 'angka'
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                    }`}>
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {item.simpleExplanation}
                  </p>

                  {item.clinicalNote && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 italic">
                      <span>Catatan Medis:</span>
                      <span>{item.clinicalNote}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Emergency Assistance */}
          <div className="p-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Pertanyaan darurat?
            </span>
            <div className="flex items-center gap-2">
              <a
                href="tel:119"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <PhoneCall size={13} />
                <span>Darurat 119</span>
              </a>
              <button
                type="button"
                onClick={() => { playClickSound(); onClose(); }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
