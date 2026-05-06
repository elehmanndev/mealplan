import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const maskable = readFileSync(join(pub, 'icon-maskable.svg'));

const targets = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
];

for (const { name, size } of targets) {
  await sharp(maskable, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(pub, name));
  console.log(`wrote ${name} (${size}x${size})`);
}
