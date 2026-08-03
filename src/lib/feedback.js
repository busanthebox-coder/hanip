import { get } from 'svelte/store';
import { prefs } from './prefs.js';

let audioContext = null;

function context() {
  if (audioContext || typeof window === 'undefined') return audioContext;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume?.();
  return audioContext;
}

function tone(ctx, { frequency, duration, offset = 0, volume = 0.035 }) {
  const start = ctx.currentTime + offset;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function tick() {
  if (!get(prefs).sound) return;
  const ctx = context();
  if (ctx) tone(ctx, { frequency: 880, duration: 0.08, volume: 0.04 });
}

export function thud() {
  if (!get(prefs).sound) return;
  const ctx = context();
  if (ctx) tone(ctx, { frequency: 180, duration: 0.12, volume: 0.025 });
}

export function fanfare() {
  if (!get(prefs).sound) return;
  const ctx = context();
  if (!ctx) return;
  [523, 659, 880].forEach((frequency, index) => {
    tone(ctx, { frequency, duration: 0.1, offset: index * 0.075, volume: 0.035 });
  });
}

export function buzz(duration) {
  if (!get(prefs).haptics || typeof navigator === 'undefined') return;
  navigator.vibrate?.(duration);
}
