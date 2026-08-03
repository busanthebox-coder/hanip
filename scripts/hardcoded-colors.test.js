import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const components = join(root, 'src', 'components');

function svelteFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? svelteFiles(path) : entry.name.endsWith('.svelte') ? [path] : [];
  });
}

describe('color token contract', () => {
  it('keeps literal colors out of components', () => {
    const literals = /#[0-9a-f]{3,8}\b|rgba?\(/gi;
    const offenders = svelteFiles(components).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(literals)].map((match) => `${relative(root, file)}:${source.slice(0, match.index).split('\n').length}:${match[0]}`);
    });

    expect(offenders).toEqual([]);
  });
});
