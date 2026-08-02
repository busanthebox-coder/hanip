import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DEPTH_FIELDS = [
  'nuance',
  'explanation',
  'shortExplanation',
  'commonMistakes',
  'conjugationTips',
  'usagePhrases',
  'examples',
  'forms',
  'irregular',
  'cluster',
  'collocations',
  'ex',
];

export function depthScore(entry) {
  return DEPTH_FIELDS.reduce((total, field) => total + JSON.stringify(entry?.[field] || '').length, 0);
}

export function resolveParentDataDir(root = projectRoot) {
  return process.env.HANIP_PARENT_DATA_DIR
    || join(root, '..', 'korean-core-starter', 'public', 'data');
}

export function loadDictionary({ root = projectRoot, directory = resolveParentDataDir(root), label = 'parent data' } = {}) {
  if (!existsSync(directory)) {
    throw new Error(`${label}: required parent enrichment source not found: ${directory}`);
  }

  const sourceFiles = readdirSync(directory)
    .filter((file) => file.startsWith('app-') && !file.includes('index') && !file.includes('manifest'))
    .sort();
  if (sourceFiles.length === 0) {
    throw new Error(`${label}: required parent enrichment files not found in: ${directory}`);
  }

  const byHangul = new Map();
  const byId = new Map();
  let clusters = [];
  let vocabPacks = [];
  let readers = [];

  for (const file of sourceFiles) {
    const json = JSON.parse(readFileSync(join(directory, file), 'utf8'));
    if (Array.isArray(json.expressionClusters)) clusters = json.expressionClusters;
    if (Array.isArray(json.vocabPacks)) vocabPacks = json.vocabPacks;
    if (Array.isArray(json.readers)) readers = json.readers;

    const lists = Array.isArray(json) ? [json] : Object.values(json);
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (!entry || typeof entry !== 'object') continue;
        if (entry.id && (!byId.has(entry.id) || depthScore(entry) > depthScore(byId.get(entry.id)))) {
          byId.set(entry.id, entry);
        }
        if (!entry.hangul) continue;
        const previous = byHangul.get(entry.hangul);
        if (!previous || depthScore(entry) > depthScore(previous)) byHangul.set(entry.hangul, entry);
      }
    }
  }

  if (byHangul.size === 0) {
    throw new Error(`${label}: parent enrichment source contains no dictionary entries: ${directory}`);
  }

  return { byHangul, byId, clusters, vocabPacks, readers, directory, sourceFiles };
}
