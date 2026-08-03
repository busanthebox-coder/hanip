import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SCOPE = 'https://example.test/hanip/';

function keyOf(request) {
  const value = typeof request === 'string' ? request : request.url;
  return new URL(value, SCOPE).href;
}

function createHarness() {
  const listeners = {};
  const stores = new Map();
  const network = new Map([
    [SCOPE, '<main>home</main>'],
    [new URL('./index.html', SCOPE).href, '<main>home</main>'],
    [new URL('./assets/index-app.js', SCOPE).href, 'entry'],
    [new URL('./assets/a1-course.js', SCOPE).href, 'a1'],
    [new URL('./assets/a2-course.js', SCOPE).href, 'a2'],
  ]);
  let offline = false;

  const fetch = vi.fn(async (request) => {
    if (offline) throw new TypeError('offline');
    const body = network.get(keyOf(request));
    if (body === undefined) return new Response('missing', { status: 404 });
    return new Response(body, { status: 200 });
  });

  function cache(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const values = stores.get(name);
    return {
      async addAll(urls) {
        for (const url of urls) {
          const absolute = keyOf(url);
          const response = await fetch(absolute);
          if (!response.ok) throw new Error(`Could not precache ${absolute}`);
          values.set(absolute, response.clone());
        }
      },
      async match(request) {
        return values.get(keyOf(request))?.clone();
      },
      async put(request, response) {
        values.set(keyOf(request), response.clone());
      },
    };
  }

  const caches = {
    open: async (name) => cache(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    async match(request) {
      for (const name of stores.keys()) {
        const response = await cache(name).match(request);
        if (response) return response;
      }
      return undefined;
    },
  };
  const self = {
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    skipWaiting: vi.fn(),
    addEventListener(type, handler) { listeners[type] = handler; },
  };

  const template = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  const source = template
    .replace('__HANIP_CACHE_VERSION__', 'hanip-pwa-test')
    .replace('__HANIP_PRECACHE_MANIFEST__', JSON.stringify([
      './',
      './index.html',
      './assets/index-app.js',
      './assets/a1-course.js',
    ]));
  runInNewContext(source, { self, caches, fetch, URL, Set, Promise });

  async function dispatch(type, event = {}) {
    let pending;
    let response;
    listeners[type]({
      ...event,
      waitUntil(value) { pending = value; },
      respondWith(value) { response = value; },
    });
    if (pending) await pending;
    return response ? response : undefined;
  }

  return {
    dispatch,
    fetch,
    self,
    setOffline(value) { offline = value; },
  };
}

describe('service worker runtime', () => {
  let app;

  beforeEach(async () => {
    app = createHarness();
    await app.dispatch('install');
  });

  it('preloads home and A1 without activating the update automatically', async () => {
    app.setOffline(true);
    const home = await app.dispatch('fetch', { request: { method: 'GET', mode: 'navigate', url: SCOPE } });
    const a1 = await app.dispatch('fetch', {
      request: { method: 'GET', mode: 'cors', url: new URL('./assets/a1-course.js', SCOPE).href },
    });

    await expect(home.text()).resolves.toContain('home');
    await expect(a1.text()).resolves.toBe('a1');
    expect(app.self.skipWaiting).not.toHaveBeenCalled();
  });

  it('makes a later level available offline after its first online request', async () => {
    const request = { method: 'GET', mode: 'cors', url: new URL('./assets/a2-course.js', SCOPE).href };
    const online = await app.dispatch('fetch', { request });
    await expect(online.text()).resolves.toBe('a2');

    app.setOffline(true);
    const offline = await app.dispatch('fetch', { request });
    await expect(offline.text()).resolves.toBe('a2');
  });

  it('activates a waiting worker only after the update message', () => {
    app.dispatch('message', { data: { type: 'SKIP_WAITING' } });
    expect(app.self.skipWaiting).toHaveBeenCalledOnce();
  });
});
