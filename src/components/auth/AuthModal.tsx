/* Hallmark · Light Mode Minimalist Auth Modal with Real MongoDB Atlas Auth & Skip Login Option */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus, Heart, Lock, Mail, ShieldCheck, CheckCircle2, RefreshCw, ArrowRight, Info } from '../icons/AppIcons';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore, SubscriptionTier } from '../../store/useAuthStore';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('pro_ehr');

  const addToast = useAppStore((state) => state.addToast);
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast({ type: 'warning', title: 'Data Belum Lengkap', message: 'Silakan isi email dan kata sandi.' });
      return;
    }

    try {
      if (tab === 'register') {
        if (!name) {
          addToast({ type: 'warning', title: 'Data Belum Lengkap', message: 'Silakan isi nama lengkap Anda.' });
          return;
        }

        await registerWithEmail(name, email, password, selectedTier);
        playSuccessChime();
        addToast({
          type: 'success',
          title: 'Registrasi MongoDB Atlas Berhasil!',
          message: `Selamat datang ${name}, akun SaaS EHR Anda berhasil dibuat.`
        });
      } else {
        await loginWithEmail(email, password);
        playSuccessChime();
        addToast({
          type: 'success',
          title: 'Autentikasi Berhasil!',
          message: `Selamat datang kembali di AortaLink SaaS EHR Platform.`
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: tab === 'login' ? 'Gagal Masuk' : 'Gagal Mendaftar',
        message: err.message || 'Terjadi kesalahan autentikasi database.'
      });
    }
  };

  const handleGoogleClick = async () => {
    try {
      await loginWithGoogle();
      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Google OAuth Berhasil!',
        message: 'Akun Google berhasil terhubung dan tersimpan ke MongoDB Atlas.'
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'OAuth Error', message: 'Gagal menghubungkan akun Google.' });
    }
  };

  const handleSkipLogin = () => {
    playClickSound();
    addToast({
      type: 'info',
      title: 'Mode Offline-First Aktif',
      message: 'Anda menggunakan AortaLink secara lokal. Data tersimpan di browser perangkat Anda.'
    });
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-auto flex flex-col text-slate-900 dark:text-slate-100 max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/25 text-white">
                <Heart size={20} className="fill-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  AortaLink EHR Platform
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {tab === 'login' ? 'Masuk dengan Akun Cloud' : 'Daftar Akun Baru'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Masuk dengan Akun Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-bold uppercase text-slate-400">atau email password</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Tab Switcher */}
            <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <LogIn size={13} />
                <span>Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <UserPlus size={13} />
                <span>Daftar Akun</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
              {tab === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Lengkap Pasien / Nakes
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ghani Hendra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Memproses Autentikasi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{tab === 'login' ? 'Masuk ke Dashboard Cloud' : 'Daftarkan Akun'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Skip Login Section with Medical Disclaimer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5 text-left">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  <Info size={14} className="text-amber-600 shrink-0" />
                  <span>Mode Tamu / Offline-First</span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Disclaimer:</strong> Anda dapat menggunakan seluruh fitur aplikasi tanpa akun. Data rekam medis Anda disimpan secara lokal di browser perangkat ini (Dexie.js). Fitur sinkronisasi multi-perangkat MongoDB Atlas dinonaktifkan hingga Anda masuk.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSkipLogin}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Lanjutkan Offline (Lewati Login)</span>
                <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

          </div>

          {/* Footer Note */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 font-medium shrink-0">
            SHA-256 Hash Protection • MongoDB Atlas Cloud Sync • HL7 FHIR R4
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
