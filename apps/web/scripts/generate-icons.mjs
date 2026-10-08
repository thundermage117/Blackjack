// Renders the app icons in public/ from one SVG artwork, using Playwright's Chromium (already
// a dev dependency for e2e tests). Run with `npm --workspace apps/web run icons` after
// changing the artwork, and commit the output.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Two cards on felt, drawn in a 512 × 512 box. Shapes only, no text, so the render does not
// depend on installed fonts.
const artwork = `
  <g transform="rotate(-14 256 256)">
    <rect x="150" y="118" width="190" height="270" rx="20" fill="#4b2a16" stroke="#f4d58d" stroke-width="8"/>
    <rect x="172" y="140" width="146" height="226" rx="10" fill="none" stroke="#e9c46a" stroke-width="6"/>
    <path d="M245 190 L275 253 L245 316 L215 253 Z" fill="#e9c46a"/>
  </g>
  <g transform="rotate(10 256 256)">
    <rect x="190" y="124" width="190" height="270" rx="20" fill="#fffdf6" stroke="#1d1d1d" stroke-opacity="0.15" stroke-width="3"/>
    <path d="M285 196 C285 196 228 240 228 276 C228 300 252 312 272 298 C268 314 262 326 252 334 L318 334 C308 326 302 314 298 298 C318 312 342 300 342 276 C342 240 285 196 285 196 Z" fill="#1b1b1b"/>
    <path d="M214 194 L228 154 L242 194 M219 180 L237 180" fill="none" stroke="#1b1b1b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const felt = `
  <defs>
    <radialGradient id="felt" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#18804f"/>
      <stop offset="1" stop-color="#0a4a2f"/>
    </radialGradient>
  </defs>`;

/**
 * `rounded` icons are shown as-is (browser tabs, desktop installs). Full-bleed icons are
 * cropped by the platform (Android maskable, iOS home screen), so their artwork is scaled
 * into the central safe zone.
 */
function svg({ rounded, scale }) {
  const offset = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${felt}
  <rect width="512" height="512" rx="${rounded ? 96 : 0}" fill="url(#felt)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${artwork}</g>
</svg>
`;
}

const icons = [
  { file: "icons/icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "icons/icon-512.png", size: 512, rounded: true, scale: 1 },
  { file: "icons/maskable-512.png", size: 512, rounded: false, scale: 0.78 },
  { file: "icons/apple-touch-icon-180.png", size: 180, rounded: false, scale: 0.9 },
];

await mkdir(join(publicDir, "icons"), { recursive: true });
await writeFile(join(publicDir, "favicon.svg"), svg({ rounded: true, scale: 1 }));

const browser = await chromium.launch();
try {
  for (const icon of icons) {
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
    });
    const markup = svg(icon).replace("<svg ", `<svg width="${icon.size}" height="${icon.size}" `);
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`,
    );
    await page.screenshot({ path: join(publicDir, icon.file), omitBackground: true });
    await page.close();
    console.log(`wrote ${icon.file}`);
  }
} finally {
  await browser.close();
}
