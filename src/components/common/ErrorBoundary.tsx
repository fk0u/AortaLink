import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Heart, RefreshCw, AlertCircle } from '../icons/AppIcons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in AortaLink:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-[32px] bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Heart size={28} className="fill-teal-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                Mohon Maaf, Terjadi Kendala Tampilan
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Data tensi dan riwayat kesehatan Anda tetap aman tersimpan di perangkat ini. Silakan muat ulang halaman untuk melanjutkan.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw size={15} />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold text-[11px] transition-colors"
              >
                Bersihkan Cache & Buka Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
