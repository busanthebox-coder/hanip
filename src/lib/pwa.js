import { get, writable } from 'svelte/store';

export const installPrompt = writable(null);
export const updateReady = writable(false);

let waitingWorker = null;
let reloadRequested = false;
let registrationStarted = false;

export function shouldOfferInstall({ installEvent, prefsState, progressState }) {
  const hasBowlHistory = Object.values(progressState?.bowls || {}).some((count) => count > 0);
  return Boolean(installEvent)
    && prefsState?.pwaVisitCount >= 2
    && !prefsState?.installPromptDismissed
    && hasBowlHistory;
}

export async function promptInstall() {
  const event = get(installPrompt);
  if (!event) return 'unavailable';
  await event.prompt();
  const choice = await event.userChoice;
  installPrompt.set(null);
  return choice?.outcome || 'dismissed';
}

function announceWaiting(worker) {
  waitingWorker = worker;
  updateReady.set(Boolean(worker));
}

export function applyPwaUpdate() {
  if (!waitingWorker) return;
  reloadRequested = true;
  updateReady.set(false);
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function registerPwa() {
  if (registrationStarted || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  registrationStarted = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt.set(event);
  });
  window.addEventListener('appinstalled', () => installPrompt.set(null));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      announceWaiting(registration.waiting);
    }
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) announceWaiting(worker);
      });
    });
  }).catch((error) => {
    console.error('한입 서비스 워커를 등록하지 못했어요.', error);
  });
}
