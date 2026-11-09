import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const runtime = process.env.CODEX_NODE_MODULES;
const require = createRequire(runtime ? path.join(runtime, 'index.js') : import.meta.url);
const sharp = require('sharp');
await fs.mkdir('publishing/images', { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const artworkSize = size === 128 ? 96 : size;
  const padding = (size - artworkSize) / 2;
  await sharp('branding/icon.svg').resize(artworkSize, artworkSize)
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`src/assets/icon-${size}.png`);
}
await fs.copyFile('src/assets/icon-128.png', 'publishing/images/icon-128.png');
await sharp('branding/promo-small.svg').png().toFile('publishing/images/promo-440x280.png');
console.log('Sean Lingo vector artwork exported to PNG.');
