import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectPrecacheUrls, finalizePwa } from './finalize-pwa.mjs';

const roots = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'hanip-pwa-'));
  roots.push(root);
  for (const dir of ['assets', 'icons', 'source']) mkdirSync(join(root, dir), { recursive: true });
  const files = {
    'index.html': '<main>한입</main>',
    'manifest.webmanifest': '{}',
    'sw.js': "const V='__HANIP_CACHE_VERSION__';const P=__HANIP_PRECACHE_MANIFEST__;",
    'assets/index-abc.js': 'entry',
    'assets/index-abc.css': 'style',
    'assets/a1-abc.js': 'a1',
    'assets/a2-abc.js': 'a2',
    'icons/icon-192.png': '192',
    'icons/icon-512.png': '512',
    'icons/icon-maskable-512.png': 'mask',
    'icons/apple-touch-icon-180.png': 'apple',
  };
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(root, name), contents);
  const bites = join(root, 'source', 'bites-index.json');
  writeFileSync(bites, '{}');
  return { root, bites };
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

describe('PWA build finalizer', () => {
  it('precaches entry and A1 but leaves later levels for runtime caching', () => {
    const { root, bites } = fixture();
    const { urls } = finalizePwa({ distDir: root, bitesIndexSource: bites });

    expect(urls).toContain('./assets/index-abc.js');
    expect(urls).toContain('./assets/a1-abc.js');
    expect(urls).toContain('./data/bites-index.json');
    expect(urls).not.toContain('./assets/a2-abc.js');
    expect(collectPrecacheUrls(root)).toEqual(urls);
  });

  it('replaces every service-worker build placeholder', () => {
    const { root, bites } = fixture();
    const { version } = finalizePwa({ distDir: root, bitesIndexSource: bites });
    const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');

    expect(version).toMatch(/^hanip-pwa-[a-f0-9]{12}$/);
    expect(serviceWorker).toContain(version);
    expect(serviceWorker).not.toContain('__HANIP_');
  });
});
