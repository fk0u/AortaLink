/**
 * Adobe & Awwwards Grade Web Audio API UI Sound Synthesizer
 * Safe, zero-dependency tactile audio feedback that NEVER throws errors or blocks UI interaction.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = (() => {
  try {
    return localStorage.getItem('aortalink_sound_enabled') !== '0';
  } catch {
    return true;
  }
})();

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      // Promise from resume is caught silently
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem('aortalink_sound_enabled', enabled ? '1' : '0');
  } catch {
    // storage unavailable — preference stays session-only
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * Play subtle tactile click sound on button press
 */
export function playClickSound() {
  try {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch (e) {
    // Audio errors must NEVER block UI event execution!
  }
}

/**
 * Play success chime upon completing an action
 */
export function playSuccessChime() {
  try {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
    });
  } catch (e) {
    // Audio errors must NEVER block UI event execution!
  }
}

/**
 * Play alert tone for high BP warnings
 */
export function playAlertSound() {
  try {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Audio errors must NEVER block UI event execution!
  }
}
