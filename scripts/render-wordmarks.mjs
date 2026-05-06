import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const targets = [
  { src: 'wordmark.svg', out: 'wordmark.png', width: 1040 },
  { src: 'wordmark-gradient.svg', out: 'wordmark-gradient.png', width: 1040 },
];

for (const { src, out, width } of targets) {
  await sharp(readFileSync(join(pub, src)), { density: 384 })
    .resize({ width })
    .png()
    .toFile(join(pub, out));
  console.log(`wrote ${out}`);
}
