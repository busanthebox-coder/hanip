import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installPrompt, promptInstall, shouldOfferInstall } from './pwa.js';

describe('PWA install offer', () => {
  beforeEach(() => installPrompt.set(null));

  it('waits for a second visit with at least one bowl day', () => {
    const installEvent = {};
    const progressState = { bowls: { '2026-08-02': 1 } };

    expect(shouldOfferInstall({
      installEvent,
      prefsState: { pwaVisitCount: 1, installPromptDismissed: false },
      progressState,
    })).toBe(false);
    expect(shouldOfferInstall({
      installEvent,
      prefsState: { pwaVisitCount: 2, installPromptDismissed: false },
      progressState,
    })).toBe(true);
  });

  it('stays hidden after the user dismisses it or without bowl history', () => {
    expect(shouldOfferInstall({
      installEvent: {},
      prefsState: { pwaVisitCount: 2, installPromptDismissed: true },
      progressState: { bowls: { '2026-08-02': 1 } },
    })).toBe(false);
    expect(shouldOfferInstall({
      installEvent: {},
      prefsState: { pwaVisitCount: 2, installPromptDismissed: false },
      progressState: { bowls: {} },
    })).toBe(false);
  });

  it('opens the captured browser prompt once and clears it', async () => {
    const event = {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };
    installPrompt.set(event);

    await expect(promptInstall()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(get(installPrompt)).toBeNull();
  });
});
