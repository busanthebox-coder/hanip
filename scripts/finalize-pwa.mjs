import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, '..');

function defaultDistDir() {
  return join(projectRoot, 'dist');
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

export function collectPrecacheUrls(rootDir = defaultDistDir()) {
  const files = walk(rootDir)
    .map((file) => relative(rootDir, file).split(sep).join('/'))
    .filter((file) => (
      file === 'index.html'
      || file === 'manifest.webmanifest'
      || file === 'data/bites-index.json'
      || file.startsWith('icons/')
      || /^assets\/index-[^/]+\.(?:js|css)$/.test(file)
      || /^assets\/a1-[^/]+\.(?:js|json)$/.test(file)
    ))
    .sort()
    .map((file) => `./${file}`);
  return ['./', ...files];
}

export function buildCacheVersion(urls, rootDir, serviceWorkerSource = '') {
  const hash = createHash('sha256');
  hash.update(serviceWorkerSource);
  for (const url of urls) {
    const file = url === './' ? 'index.html' : url.replace(/^\.\//, '');
    const filePath = join(rootDir, file);
    hash.update(`${url}:`);
    hash.update(readFileSync(filePath));
  }
  return `hanip-pwa-${hash.digest('hex').slice(0, 12)}`;
}

function assertPrecacheContract(urls) {
  const required = [
    './',
    './index.html',
    './manifest.webmanifest',
    './data/bites-index.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon-180.png',
  ];
  const missing = required.filter((url) => !urls.includes(url));
  if (!urls.some((url) => /^\.\/assets\/index-.+\.js$/.test(url))) missing.push('entry JavaScript');
  if (!urls.some((url) => /^\.\/assets\/index-.+\.css$/.test(url))) missing.push('entry CSS');
  if (!urls.some((url) => /^\.\/assets\/a1-.+\.(?:js|json)$/.test(url))) missing.push('A1 chunks');
  if (missing.length) throw new Error(`PWA precache contract is incomplete: ${missing.join(', ')}`);
}

export function finalizePwa({
  distDir = defaultDistDir(),
  bitesIndexSource = join(projectRoot, 'src', 'lib', 'bites-index.json'),
} = {}) {
  const swPath = join(distDir, 'sw.js');
  if (!existsSync(swPath)) throw new Error('dist/sw.js was not found; run vite build first.');

  const dataDir = join(distDir, 'data');
  mkdirSync(dataDir, { recursive: true });
  copyFileSync(bitesIndexSource, join(dataDir, 'bites-index.json'));

  const urls = collectPrecacheUrls(distDir);
  assertPrecacheContract(urls);
  const template = readFileSync(swPath, 'utf8');
  const version = buildCacheVersion(urls, distDir, template);
  const source = template
    .replace('__HANIP_CACHE_VERSION__', version)
    .replace('__HANIP_PRECACHE_MANIFEST__', JSON.stringify(urls, null, 2));
  if (source.includes('__HANIP_')) throw new Error('Unresolved PWA service worker placeholder.');
  writeFileSync(swPath, source);
  return { version, urls };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = finalizePwa();
  console.log(`Finalized PWA service worker with ${result.urls.length} precached URLs (${result.version}).`);
}
