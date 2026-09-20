/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg192 = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="36" fill="#E85002"/>
  <path d="M48 64 L144 64 L136 144 L56 144 Z" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round"/>
  <path d="M72 64 C72 44 120 44 120 64" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
</svg>`;

const svg512 = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#E85002"/>
  <path d="M128 170 L384 170 L362 384 L150 384 Z" fill="none" stroke="#FFFFFF" stroke-width="32" stroke-linejoin="round"/>
  <path d="M192 170 C192 117 320 117 320 170" fill="none" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round"/>
</svg>`;

async function main() {
  const iconsDir = path.join(__dirname, '../public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  await sharp(Buffer.from(svg192)).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(Buffer.from(svg512)).png().toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('PWA icons icon-192.png and icon-512.png created successfully!');
}

main().catch(console.error);
