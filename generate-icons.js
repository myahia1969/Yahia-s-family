// Generate simple valid PNG icons for PWA
import fs from 'fs';

function createSimplePNG(width, height) {
  // A minimal valid PNG with emerald/slate background and family icon
  // Alternatively, create an SVG and save as well
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="50%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#0369a1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" rx="${width * 0.22}" fill="url(#grad)"/>
    <circle cx="${width/2}" cy="${height/2}" r="${width * 0.38}" fill="none" stroke="#38bdf8" stroke-width="${width * 0.02}" stroke-dasharray="12 8" opacity="0.6"/>
    <circle cx="${width/2}" cy="${height/2}" r="${width * 0.34}" fill="#1e293b" fill-opacity="0.85"/>
    
    <!-- Family Symbol / House with Heart -->
    <path d="M${width*0.35} ${height*0.48} L${width*0.5} ${height*0.35} L${width*0.65} ${height*0.48} V${height*0.65} H${width*0.35} Z" fill="none" stroke="#38bdf8" stroke-width="${width*0.028}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M${width*0.5} ${height*0.52} C${width*0.46} ${height*0.48}, ${width*0.43} ${height*0.52}, ${width*0.47} ${height*0.58} L${width*0.5} ${height*0.61} L${width*0.53} ${height*0.58} C${width*0.57} ${height*0.52}, ${width*0.54} ${height*0.48}, ${width*0.5} ${height*0.52} Z" fill="#f43f5e"/>
    
    <!-- Text -->
    <text x="${width/2}" y="${height*0.77}" font-family="'Tajawal', 'Segoe UI', Tahoma, sans-serif" font-size="${width * 0.085}" font-weight="bold" fill="#f8fafc" text-anchor="middle">عائلة صبيح</text>
  </svg>`;
  return svg;
}

const svg192 = createSimplePNG(192, 192);
const svg512 = createSimplePNG(512, 512);

fs.writeFileSync('icon.svg', svg512);
fs.writeFileSync('icon-192.svg', svg192);
fs.writeFileSync('icon-512.svg', svg512);

console.log('Icons generated successfully');
