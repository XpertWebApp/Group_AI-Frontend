/**
 * Synthesized notification chime — soft two-tone "ding-dong" via Web Audio API.
 * No external assets, total duration ~1.4s (well under the 1.5s budget).
 */

const MUTE_STORAGE_KEY = 'sett:notifications:muted';

let audioCtx: AudioContext | null = null;
let unlocked = false;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const w = window as WindowWithWebkit;
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

/**
 * Browsers block AudioContext until a user gesture. Call this once on the
 * first user interaction so subsequent programmatic plays succeed.
 */
export function unlockAudio(): void {
  if (unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  unlocked = true;
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  if (muted) {
    window.localStorage.setItem(MUTE_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(MUTE_STORAGE_KEY);
  }
}

/**
 * Play one tone with a smooth attack + exponential decay so it doesn't click.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peakGain: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startAt);

  // Attack → sustain → exponential decay envelope.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/**
 * Play the notification chime. No-ops if muted, audio unsupported, or audio
 * context is still locked (i.e. no user gesture yet).
 */
export function playNotificationChime(): void {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  // Skip silently if browser hasn't allowed audio yet — avoids console errors.
  if (ctx.state === 'suspended') return;

  const now = ctx.currentTime;
  // "Ding" — higher tone first, then a slightly lower "dong" overlap.
  // Peak gain kept low (0.18) so it's noticeable but never startling.
  playTone(ctx, 880,  now,        0.55, 0.18);  // A5
  playTone(ctx, 1320, now + 0.18, 0.85, 0.14);  // E6 — pleasant 5th interval
}
