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

// The parent ships two shelves: the built app data under public/data (the
// dictionary, vocab packs, readers) and the authoring source under korean/data.
// Situational expressions only exist on the authoring shelf, so its path
// resolution lives here too instead of being re-derived by each extractor.
export function resolveParentRepoDir(root = projectRoot) {
  if (process.env.HANIP_PARENT_REPO_DIR) return process.env.HANIP_PARENT_REPO_DIR;
  if (process.env.HANIP_PARENT_DATA_DIR) return join(process.env.HANIP_PARENT_DATA_DIR, '..', '..');
  return join(root, '..', 'korean-core-starter');
}

export function loadExpressions({
  root = projectRoot,
  file = join(resolveParentRepoDir(root), 'korean', 'data', 'expressions.json'),
  label = 'expressions',
} = {}) {
  if (!existsSync(file)) {
    throw new Error(`${label}: required parent expression source not found: ${file}`);
  }
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const entries = Array.isArray(json.entries) ? json.entries : [];
  if (!entries.length) {
    throw new Error(`${label}: parent expression source contains no entries: ${file}`);
  }
  return { entries, file };
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
