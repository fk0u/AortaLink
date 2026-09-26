import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Heart, CheckCircle2, ShieldCheck } from '../icons/AppIcons';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';

interface BPRestTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimerComplete: () => void;
}

export const BPRestTimerModal: React.FC<BPRestTimerModalProps> = ({
  isOpen,
  onClose,
  onTimerComplete
}) => {
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes = 300 seconds
  const [isRunning, setIsRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Tahan' | 'Exhale' | 'Santai'>('Inhale');

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      playSuccessChime();
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  // Breathing animation cycle timer (16s cycle: 4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
  useEffect(() => {
    if (!isRunning) return;
    const cycleTime = (300 - secondsLeft) % 16;
    if (cycleTime < 4) setBreathPhase('Inhale');
    else if (cycleTime < 8) setBreathPhase('Tahan');
    else if (cycleTime < 12) setBreathPhase('Exhale');
    else setBreathPhase('Santai');
  }, [secondsLeft, isRunning]);

  const toggleTimer = () => {
    playClickSound();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    playClickSound();
    setIsRunning(false);
    setSecondsLeft(300);
  };

  const formatMinutes = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl rounded-[32px] max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-white/10 p-6 overflow-hidden my-auto text-center space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Apple Health Rest Protocol
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Istirahat 5 Menit Sebelum Ukur
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Duduk tenang dan ikuti pernapasan lingkaran untuk menstabilkan pembuluh darah demi akurasi klinis 100%.
            </p>
          </div>

          {/* SwiftUI Style Breathing Ring Animation */}
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            {/* Animated Pulsing Ring */}
            <motion.div
              animate={{
                scale: breathPhase === 'Inhale' ? 1.25 : breathPhase === 'Exhale' ? 0.9 : 1.1,
                opacity: isRunning ? 0.8 : 0.3
              }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-500/30 via-sky-500/20 to-teal-400/40 blur-lg"
            ></motion.div>

            <div className="relative z-10 space-y-1">
              <div className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                {formatMinutes(secondsLeft)}
              </div>
              {isRunning && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {breathPhase === 'Inhale' && 'Tarik Napas (4s)'}
                  {breathPhase === 'Tahan' && 'Tahan Napas (4s)'}
                  {breathPhase === 'Exhale' && 'Hembuskan Napas (4s)'}
                  {breathPhase === 'Santai' && 'Istirahat Santai (4s)'}
                </span>
              )}
            </div>
          </div>

          {/* Action Timer Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleTimer}
              className="hallmark-button-primary px-6 py-3 text-xs inline-flex items-center gap-2"
            >
              {isRunning ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              {isRunning ? 'Jeda Istirahat' : secondsLeft === 0 ? 'Selesai' : 'Mulai 5 Menit'}
            </button>

            <button
              onClick={resetTimer}
              className="hallmark-button-secondary p-3 text-xs"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {secondsLeft === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2"
            >
              <button
                onClick={() => {
                  onClose();
                  onTimerComplete();
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Lanjut Catat Tensi Sekarang
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
