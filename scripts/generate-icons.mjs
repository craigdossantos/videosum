import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');
const svgPath = join(publicDir, 'icon.svg');

// Read SVG
const svgBuffer = readFileSync(svgPath);

// Icon sizes needed
const sizes = [16, 32, 64, 128, 256, 512, 1024];
const iconsetDir = join(publicDir, 'icon.iconset');

async function generateIcons() {
  console.log('Generating icons from SVG...');

  // Create iconset directory for macOS
  if (existsSync(iconsetDir)) {
    rmSync(iconsetDir, { recursive: true });
  }
  mkdirSync(iconsetDir, { recursive: true });

  // Generate PNGs for macOS iconset
  for (const size of sizes) {
    // Regular resolution
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsetDir, `icon_${size}x${size}.png`));

    // @2x retina (except for 1024 which is already max)
    if (size <= 512) {
      await sharp(svgBuffer)
        .resize(size * 2, size * 2)
        .png()
        .toFile(join(iconsetDir, `icon_${size}x${size}@2x.png`));
    }
  }

  // Generate main icon.png (1024x1024 for Linux)
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(join(publicDir, 'icon.png'));
  console.log('Created icon.png (1024x1024)');

  // Generate icon.icns for macOS using iconutil
  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${join(publicDir, 'icon.icns')}"`, {
      stdio: 'inherit'
    });
    console.log('Created icon.icns for macOS');
  } catch (err) {
    console.error('Failed to create icns:', err.message);
  }

  // Generate ICO for Windows (multiple sizes embedded)
  // Create PNGs for ICO embedding
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoPngs = [];

  for (const size of icoSizes) {
    const pngPath = join(publicDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    icoPngs.push(pngPath);
  }

  // Create ICO file
  const icoBuffer = await pngToIco(icoPngs);
  writeFileSync(join(publicDir, 'icon.ico'), icoBuffer);
  console.log('Created icon.ico for Windows');

  // Clean up temporary PNG files
  for (const pngPath of icoPngs) {
    rmSync(pngPath);
  }

  // Clean up iconset directory
  rmSync(iconsetDir, { recursive: true });
  console.log('Cleaned up temporary files');

  console.log('\nIcon generation complete!');
  console.log('Files created:');
  console.log('  - public/icon.png (1024x1024 - Linux/general)');
  console.log('  - public/icon.icns (macOS)');
  console.log('  - public/icon.ico (Windows)');
}

generateIcons().catch(console.error);
