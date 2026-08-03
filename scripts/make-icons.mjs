import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'icons', 'hanip-bowl.svg');
const outputDir = join(root, 'public', 'icons');

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon-180.png', 180],
];

await mkdir(outputDir, { recursive: true });
await Promise.all(targets.map(([name, size]) => (
  sharp(source).resize(size, size).png({ compressionLevel: 9 }).toFile(join(outputDir, name))
)));

console.log(`Generated ${targets.length} PWA icons from public/icons/hanip-bowl.svg.`);
