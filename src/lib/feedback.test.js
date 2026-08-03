import { afterEach, describe, expect, it, vi } from 'vitest';

function fakeAudioContext() {
  const oscillator = {
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  return {
    currentTime: 1,
    state: 'running',
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
  };
}

async function setup({ sound, haptics }) {
  vi.resetModules();
  const audio = fakeAudioContext();
  const AudioContext = vi.fn(function AudioContext() { return audio; });
  const vibrate = vi.fn();
  vi.stubGlobal('window', { AudioContext });
  vi.stubGlobal('navigator', { vibrate });
  const [{ prefs, DEFAULT_PREFS }, feedback] = await Promise.all([
    import('./prefs.js'),
    import('./feedback.js'),
  ]);
  prefs.set({ ...DEFAULT_PREFS, sound, haptics });
  return { AudioContext, audio, vibrate, feedback };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('learning feedback', () => {
  it('does nothing when sound and haptics are disabled', async () => {
    const { AudioContext, vibrate, feedback } = await setup({ sound: false, haptics: false });

    feedback.tick();
    feedback.thud();
    feedback.fanfare();
    feedback.buzz([30, 40, 30]);

    expect(AudioContext).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('synthesizes the three cues and uses the requested vibration', async () => {
    const { AudioContext, audio, vibrate, feedback } = await setup({ sound: true, haptics: true });

    feedback.tick();
    feedback.thud();
    feedback.fanfare();
    feedback.buzz(15);
    feedback.buzz([30, 40, 30]);

    expect(AudioContext).toHaveBeenCalledOnce();
    expect(audio.createOscillator).toHaveBeenCalledTimes(5);
    expect(vibrate).toHaveBeenCalledWith(15);
    expect(vibrate).toHaveBeenCalledWith([30, 40, 30]);
  });
});
