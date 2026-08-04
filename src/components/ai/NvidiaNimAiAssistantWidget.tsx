/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Floating NVIDIA NIM AI Medical Assistant Widget */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, Send, Sparkles, HeartPulse, RefreshCw } from 'lucide-react';
import { queryNvidiaNimAi } from '../../services/ai/nvidia-nim-service';
import { useAppStore } from '../../store/useAppStore';

export const NvidiaNimAiAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [responseOutput, setResponseOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useAppStore((state) => state.addToast);

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;

    const currentQuestion = promptInput.trim();
    setPromptInput('');
    setIsLoading(true);
    setResponseOutput('');

    try {
      await queryNvidiaNimAi(
        {
          patientName: 'Pasien AortaLink',
          clinicalContextPrompt: 'Evaluasi Rekam Medis Elektronik (EHR) & Terapi Hipertensi/Asam Urat.',
          userQuestion: currentQuestion
        },
        (chunk) => {
          setResponseOutput((prev) => prev + chunk);
        }
      );
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Koneksi AI Terganggu',
        message: 'Gagal terhubung ke NVIDIA NIM API (z-ai/glm-5.2).'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[80] p-4 rounded-full bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-2xl shadow-teal-500/40 flex items-center gap-2.5 font-extrabold text-xs cursor-pointer border border-white/20 backdrop-blur-md"
      >
        <div className="relative">
          <BrainCircuit className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 animate-ping" />
        </div>
        <span className="hidden sm:inline">NVIDIA NIM AI Sp.PD</span>
      </motion.button>

      {/* Floating AI Consultation Drawer/Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-end sm:p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col h-[520px] max-h-[85vh] text-slate-900 dark:text-slate-100"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500 text-white shadow-sm">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-tight">
                      Asisten Medis AI Sp.PD
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </h3>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-extrabold">
                      NVIDIA NIM • Model z-ai/glm-5.2
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Content Body */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-teal-900 dark:text-teal-200">
                    <HeartPulse className="w-4 h-4 text-teal-600" />
                    <span>Halo! Ada yang bisa dibantu untuk rekam medis Anda?</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Tanyakan dosis Amlodipine/Candesartan, panduan pola dipping nocturnal, atau hasil laboratorium Anda.
                  </p>
                </div>

                {responseOutput && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {responseOutput}
                  </div>
                )}

                {isLoading && !responseOutput && (
                  <div className="flex items-center gap-2 p-3 text-xs text-slate-500 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
                    <span>Menghubungi NVIDIA NIM AI Engine (z-ai/glm-5.2)...</span>
                  </div>
                )}
              </div>

              {/* Prompt Input Form */}
              <form onSubmit={handleSendPrompt} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik pertanyaan medis Anda..."
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !promptInput.trim()}
                  className="p-2.5 rounded-2xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-extrabold shadow-md shadow-teal-500/20 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
