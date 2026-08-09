import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets', 'nowplaying');
fs.mkdirSync(outDir, { recursive: true });

const BG = '#180f0a';
const GRADIENT_DEFS = `
  <linearGradient id="amber" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#f6e9d8"/>
    <stop offset="45%" stop-color="#eac48a"/>
    <stop offset="100%" stop-color="#d99a52"/>
  </linearGradient>
`;

function frame(inner) {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>${GRADIENT_DEFS}</defs>
    <rect width="1024" height="1024" fill="${BG}"/>
    ${inner}
  </svg>`;
}

// Nature: crescent moon over rolling hills and a treeline - covers
// rain/ocean/wind/campfire/thunder/night, all calming outdoor sounds.
const nature = frame(`
  <circle cx="700" cy="300" r="110" fill="url(#amber)"/>
  <circle cx="742" cy="266" r="94" fill="${BG}"/>
  <path d="M0 620 Q 220 500 420 610 T 1024 580 V 1024 H 0 Z" fill="#2a1a10"/>
  <path d="M0 700 Q 260 620 512 700 T 1024 680 V 1024 H 0 Z" fill="url(#amber)" opacity="0.9"/>
  <path d="M150 700 L200 560 L250 700 Z" fill="${BG}"/>
  <path d="M300 700 L365 520 L430 700 Z" fill="${BG}"/>
  <path d="M600 700 L655 570 L710 700 Z" fill="${BG}"/>
  <path d="M780 700 L840 540 L900 700 Z" fill="${BG}"/>
`);

// Static/Noise: a scattered grid of dots fading toward the edges - the
// classic "TV static" visual for white/pink/brown noise.
function staticDots() {
  let dots = '';
  const cols = 14;
  const rows = 14;
  const cellW = 1024 / cols;
  const cellH = 1024 / rows;
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2 + (rand() - 0.5) * cellW * 0.4;
      const cy = r * cellH + cellH / 2 + (rand() - 0.5) * cellH * 0.4;
      const dCenter = Math.hypot(cx - 512, cy - 512) / 720;
      const op = Math.max(0.08, 0.9 - dCenter * 0.9) * (0.5 + rand() * 0.5);
      const radius = 6 + rand() * 16;
      dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="url(#amber)" opacity="${op.toFixed(2)}"/>`;
    }
  }
  return dots;
}
const staticArt = frame(staticDots());

// Fans: a simple, symmetric three-blade fan - one teardrop blade pointing
// up from the hub, rotated three ways.
const fanBlade = `<path d="M0,-40 C 90,-160 90,-280 0,-330 C -90,-280 -90,-160 0,-40 Z" fill="url(#amber)"/>`;
const fans = frame(`
  <g transform="translate(512 512)">
    ${fanBlade}
    <g transform="rotate(120)">${fanBlade}</g>
    <g transform="rotate(240)">${fanBlade}</g>
    <circle r="54" fill="${BG}"/>
    <circle r="54" fill="none" stroke="url(#amber)" stroke-width="10"/>
  </g>
`);

// Music: three soft, overlapping wave bands - the ambient "pad" texture.
const music = frame(`
  <g fill="none" stroke-linecap="round">
    <path d="M100 380 Q 300 260 512 380 T 924 380" stroke="url(#amber)" stroke-width="26" opacity="0.9"/>
    <path d="M100 540 Q 300 660 512 540 T 924 540" stroke="url(#amber)" stroke-width="26" opacity="0.6"/>
    <path d="M100 700 Q 300 610 512 700 T 924 700" stroke="url(#amber)" stroke-width="26" opacity="0.35"/>
  </g>
`);

// Headphone Tones: a headphone icon - the app's binaural sounds explicitly
// need headphones, so this doubles as a visual reminder.
const headphones = frame(`
  <g fill="none" stroke="url(#amber)" stroke-width="34" stroke-linecap="round">
    <path d="M240 560 V470 A272 272 0 0 1 784 470 V560"/>
  </g>
  <rect x="180" y="540" width="130" height="200" rx="46" fill="url(#amber)"/>
  <rect x="714" y="540" width="130" height="200" rx="46" fill="url(#amber)"/>
`);

// Mix: the app's own crescent-moon mark - used whenever a custom blend
// spans more than one category, so there's no single "correct" scene.
const mix = frame(`
  <g fill="none" stroke="#d99a52">
    <circle cx="512" cy="490" r="330" stroke-opacity="0.22" stroke-width="10"/>
    <circle cx="512" cy="490" r="400" stroke-opacity="0.14" stroke-width="9"/>
    <circle cx="512" cy="490" r="468" stroke-opacity="0.08" stroke-width="8"/>
  </g>
  <circle cx="512" cy="480" r="196" fill="url(#amber)"/>
  <circle cx="586" cy="412" r="178" fill="${BG}"/>
`);

const ARTWORK = { nature, static: staticArt, fans, music, headphones, mix };

async function run() {
  for (const [name, svg] of Object.entries(ARTWORK)) {
    await sharp(Buffer.from(svg)).resize(600, 600).png().toFile(path.join(outDir, `${name}.png`));
  }
  console.log('Now Playing artwork generated:', Object.keys(ARTWORK).join(', '));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
