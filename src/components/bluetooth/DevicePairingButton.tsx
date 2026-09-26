/**
 * DevicePairingButton — AortaLink
 *
 * A button that initiates Web Bluetooth scanning for blood pressure monitors,
 * connects via GATT, reads a measurement, and auto-saves to IndexedDB.
 *
 * States:
 * - hidden:  Web Bluetooth API not available
 * - idle:    Ready to scan
 * - scanning: Actively scanning for devices
 * - connecting: Connected to GATT server, discovering characteristics
 * - reading:  Waiting for measurement data
 * - done:     Measurement saved, brief success flash
 * - error:    Error state with message
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Bluetooth, BluetoothOff, Loader2, CheckCircle2, AlertCircle } from '../icons/AppIcons';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import {
  isBluetoothAvailable,
  scanAndReadBP,
  cleanup,
  type BLEConnectionState,
} from '../../services/bluetooth/ble-service';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';

export const DevicePairingButton: React.FC = () => {
  const addToast = useAppStore((state) => state.addToast);
  const setCacheDirty = useAppStore((state) => state.setCacheDirty);
  const { activeProfileId } = useProfiles();

  const [bluetoothSupported, setBluetoothSupported] = useState<boolean | null>(null);
  const [connectionState, setConnectionState] = useState<BLEConnectionState>('idle');
  const [stateMessage, setStateMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check Bluetooth availability on mount
  useEffect(() => {
    setBluetoothSupported(isBluetoothAvailable());
  }, []);

  // Auto-reset done/error state back to idle after a few seconds
  useEffect(() => {
    if (connectionState === 'done' || connectionState === 'error') {
      const timer = setTimeout(() => {
        if (connectionState === 'error') {
          // Keep error message visible slightly longer
          setTimeout(() => {
            setConnectionState('idle');
            setErrorMessage('');
          }, 4000);
        } else {
          setConnectionState('idle');
          setStateMessage('');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [connectionState]);

  const handlePair = useCallback(async () => {
    if (connectionState !== 'idle' && connectionState !== 'error') return;

    playClickSound();
    setErrorMessage('');
    setStateMessage('');

    try {
      const reading = await scanAndReadBP(activeProfileId, (state, message) => {
        setConnectionState(state);
        setStateMessage(message || '');
      });

      // Trigger data refresh
      setCacheDirty(true);
      playSuccessChime();

      addToast({
        type: 'success',
        title: 'Tensi Tersimpan via Bluetooth',
        message: `${reading.systolic}/${reading.diastolic} mmHg · Nadi ${reading.pulse} BPM · ${reading.tags?.join(', ') || 'Bluetooth'}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghubungkan ke tensimeter.';
      setErrorMessage(message);
      setConnectionState('error');

      addToast({
        type: 'error',
        title: 'Gagal Pairing Bluetooth',
        message,
      });

      // Clean up any lingering connections
      cleanup();
    }
  }, [activeProfileId, connectionState, addToast, setCacheDirty]);

  // Not supported state — hidden entirely
  if (bluetoothSupported === false) {
    return null;
  }

  // Still determining support — show nothing until we know
  if (bluetoothSupported === null) {
    return null;
  }

  // --- Render based on connection state ---

  const isBusy = connectionState === 'scanning' || connectionState === 'connecting' || connectionState === 'reading';
  const isSuccess = connectionState === 'done';
  const isError = connectionState === 'error';

  // Determine color scheme based on state
  let iconBg = 'bg-blue-500';
  let iconText = 'text-white';
  let shadowClass = 'shadow-md shadow-blue-500/20';
  let borderClass = 'border-blue-200 dark:border-blue-900/60';
  let bgClass = 'bg-blue-50/20 dark:bg-blue-950/10';

  if (isSuccess) {
    iconBg = 'bg-teal-500';
    shadowClass = 'shadow-md shadow-teal-500/20';
    borderClass = 'border-teal-200 dark:border-teal-900/60';
    bgClass = 'bg-teal-50/20 dark:bg-teal-950/10';
  } else if (isError) {
    iconBg = 'bg-rose-500';
    shadowClass = 'shadow-md shadow-rose-500/20';
    borderClass = 'border-rose-200 dark:border-rose-900/60';
    bgClass = 'bg-rose-50/20 dark:bg-rose-950/10';
  } else if (isBusy) {
    iconBg = 'bg-amber-500';
    shadowClass = 'shadow-md shadow-amber-500/20';
    borderClass = 'border-amber-200 dark:border-amber-900/60';
    bgClass = 'bg-amber-50/20 dark:bg-amber-950/10';
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handlePair}
        disabled={isBusy}
        className={`hallmark-card p-4 text-left active:scale-[0.98] transition-all space-y-2 flex flex-col justify-between cursor-pointer min-h-32 border ${borderClass} ${bgClass} ${
          isBusy ? 'opacity-80 cursor-wait' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
        title={isBusy ? stateMessage : 'Pairing tensimeter digital via Bluetooth'}
      >
        {/* Icon */}
        <div className={`p-2 rounded-xl ${iconBg} ${iconText} w-fit ${shadowClass} transition-colors duration-300`}>
          {isBusy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Bluetooth className="w-5 h-5" />
          )}
        </div>

        {/* Label */}
        <div>
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
            {isBusy ? stateMessage : isSuccess ? 'Tersimpan!' : isError ? 'Gagal' : 'Bluetooth Tensi'}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            {isBusy
              ? 'Mohon tunggu...'
              : isSuccess
                ? stateMessage
                : isError
                  ? errorMessage || 'Coba lagi'
                  : 'Pairing otomatis Omron/Beurer'}
          </p>
        </div>
      </button>

      {/* Floating pulse indicator when busy */}
      {isBusy && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white dark:border-slate-900"></span>
        </span>
      )}
    </div>
  );
};
