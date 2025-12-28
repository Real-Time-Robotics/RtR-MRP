const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcon(size) {
  // Create SVG with RTR logo
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#3b82f6"/>
      <text
        x="50%"
        y="55%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-weight="bold"
        font-size="${size * 0.35}px"
        fill="white"
      >RTR</text>
    </svg>
  `;

  const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Generated: icon-${size}x${size}.png`);
}

async function generateShortcutIcon(name, symbol, size = 96) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1f2937"/>
      <text
        x="50%"
        y="55%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${size * 0.4}px"
        fill="#3b82f6"
      >${symbol}</text>
    </svg>
  `;

  const outputPath = path.join(iconsDir, `${name}-${size}x${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${name}-${size}x${size}.png`);
}

async function main() {
  console.log('Generating PWA icons...\n');

  // Generate main app icons
  for (const size of sizes) {
    await generateIcon(size);
  }

  // Generate shortcut icons
  await generateShortcutIcon('scan', '📷');
  await generateShortcutIcon('inventory', '📦');
  await generateShortcutIcon('work-order', '📋');

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
