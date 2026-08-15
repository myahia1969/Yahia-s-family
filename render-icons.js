import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Standard SVG with rounded aesthetic
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#grad)"/>
  <circle cx="256" cy="256" r="190" fill="none" stroke="#38bdf8" stroke-width="8" stroke-dasharray="12 8" opacity="0.65"/>
  <circle cx="256" cy="256" r="170" fill="#1e293b" fill-opacity="0.9" filter="url(#shadow)"/>
  
  <!-- Family Symbol / House with Heart -->
  <path d="M176 242 L256 172 L336 242 V332 H176 Z" fill="none" stroke="#38bdf8" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M256 262 C236 240, 218 260, 238 292 L256 310 L274 292 C294 260, 276 240, 256 262 Z" fill="#f43f5e"/>
  
  <!-- Text -->
  <text x="256" y="390" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="1">عائلة صبيح</text>
</svg>`;

// Maskable SVG with full-bleed background and 80% safe zone
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="gradFull" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
  </defs>
  <!-- Full bleed 100% rect for Android maskable icon cropping -->
  <rect width="512" height="512" fill="url(#gradFull)"/>
  
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <circle cx="256" cy="256" r="190" fill="none" stroke="#38bdf8" stroke-width="8" stroke-dasharray="12 8" opacity="0.7"/>
    <circle cx="256" cy="256" r="170" fill="#1e293b" fill-opacity="0.92"/>
    
    <!-- Family House -->
    <path d="M176 242 L256 172 L336 242 V332 H176 Z" fill="none" stroke="#38bdf8" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M256 262 C236 240, 218 260, 238 292 L256 310 L274 292 C294 260, 276 240, 256 262 Z" fill="#f43f5e"/>
    
    <!-- Text -->
    <text x="256" y="390" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="1">عائلة صبيح</text>
  </g>
</svg>`;

async function generateAllIcons() {
  const publicDir = 'public';
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const stdBuffer = Buffer.from(standardSvg);
  const maskBuffer = Buffer.from(maskableSvg);

  fs.writeFileSync('icon.svg', stdBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), stdBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), stdBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), stdBuffer);

  const jobs = [
    { size: 192, name: 'icon-192.png', src: stdBuffer },
    { size: 512, name: 'icon-512.png', src: stdBuffer },
    { size: 192, name: 'icon-192-maskable.png', src: maskBuffer },
    { size: 512, name: 'icon-512-maskable.png', src: maskBuffer },
    { size: 180, name: 'apple-touch-icon.png', src: stdBuffer },
    { size: 180, name: 'apple-touch-icon-180x180.png', src: stdBuffer },
    { size: 64, name: 'favicon.png', src: stdBuffer },
    { size: 32, name: 'favicon-32x32.png', src: stdBuffer },
    { size: 32, name: 'favicon.ico', src: stdBuffer },
    { size: 512, name: 'icon.png', src: stdBuffer }
  ];

  for (const j of jobs) {
    const png = await sharp(j.src)
      .resize(j.size, j.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(j.name, png);
    fs.writeFileSync(path.join(publicDir, j.name), png);
    console.log(`✓ Generated ${j.name} (${j.size}x${j.size})`);
  }

  console.log('All icons generated with high precision in both root and public/ directories!');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
