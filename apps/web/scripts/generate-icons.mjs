// Renders the app icons in public/ (and, once `npx cap add android` has run, the Android
// launcher icons and splash screens) from one SVG artwork, using Playwright's Chromium (already
// a dev dependency for e2e tests). Run with `npm --workspace apps/web run icons` after
// changing the artwork, and commit the output.
import { existsSync } from "node:fs";
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
 * into the central safe zone. `circle` is Android's legacy round icon, and `none` (no felt)
 * is the foreground layer of Android's adaptive icon, drawn over a solid felt colour.
 */
function svg({ shape, scale }) {
  const offset = (512 * (1 - scale)) / 2;
  const background = {
    rounded: '<rect width="512" height="512" rx="96" fill="url(#felt)"/>',
    square: '<rect width="512" height="512" fill="url(#felt)"/>',
    circle: '<circle cx="256" cy="256" r="256" fill="url(#felt)"/>',
    none: "",
  }[shape];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${felt}
  ${background}
  <g transform="translate(${offset} ${offset}) scale(${scale})">${artwork}</g>
</svg>
`;
}

/** The splash screen: the rounded icon centred on the app background. */
function splashSvg(width, height) {
  const size = Math.min(width, height) * 0.32;
  const icon = svg({ shape: "rounded", scale: 1 }).replace(
    "<svg ",
    `<svg x="${(width - size) / 2}" y="${(height - size) / 2}" width="${size}" height="${size}" `,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#0d1512"/>${icon}</svg>`;
}

const webIcons = [
  { file: "icons/icon-192.png", size: 192, shape: "rounded", scale: 1 },
  { file: "icons/icon-512.png", size: 512, shape: "rounded", scale: 1 },
  { file: "icons/maskable-512.png", size: 512, shape: "square", scale: 0.78 },
  { file: "icons/apple-touch-icon-180.png", size: 180, shape: "square", scale: 0.9 },
];

// Android launcher icons per density. Adaptive foregrounds are 108dp, of which only the
// central 66dp circle is guaranteed visible, hence the smaller artwork.
const androidRes = join(publicDir, "..", "android", "app", "src", "main", "res");
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const androidIcons = Object.entries(densities).flatMap(([density, factor]) => [
  { file: `mipmap-${density}/ic_launcher.png`, size: 48 * factor, shape: "rounded", scale: 1 },
  {
    file: `mipmap-${density}/ic_launcher_round.png`,
    size: 48 * factor,
    shape: "circle",
    scale: 0.85,
  },
  {
    file: `mipmap-${density}/ic_launcher_foreground.png`,
    size: 108 * factor,
    shape: "none",
    scale: 0.6,
  },
]);
const splashes = [
  { file: "drawable/splash.png", width: 480, height: 320 },
  ...Object.entries({
    mdpi: [480, 320],
    hdpi: [800, 480],
    xhdpi: [1280, 720],
    xxhdpi: [1600, 960],
    xxxhdpi: [1920, 1280],
  }).flatMap(([density, [w, h]]) => [
    { file: `drawable-land-${density}/splash.png`, width: w, height: h },
    { file: `drawable-port-${density}/splash.png`, width: h, height: w },
  ]),
];

async function render(browser, markup, width, height, path) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`,
  );
  await page.screenshot({ path, omitBackground: true });
  await page.close();
}

const sized = (icon) =>
  svg(icon).replace("<svg ", `<svg width="${icon.size}" height="${icon.size}" `);

await mkdir(join(publicDir, "icons"), { recursive: true });
await writeFile(join(publicDir, "favicon.svg"), svg({ shape: "rounded", scale: 1 }));

const browser = await chromium.launch();
try {
  for (const icon of webIcons) {
    await render(browser, sized(icon), icon.size, icon.size, join(publicDir, icon.file));
    console.log(`wrote public/${icon.file}`);
  }
  if (existsSync(androidRes)) {
    for (const icon of androidIcons) {
      await render(browser, sized(icon), icon.size, icon.size, join(androidRes, icon.file));
    }
    for (const splash of splashes) {
      const markup = splashSvg(splash.width, splash.height);
      await render(browser, markup, splash.width, splash.height, join(androidRes, splash.file));
    }
    console.log(`wrote ${androidIcons.length} Android icons and ${splashes.length} splash screens`);
  }
} finally {
  await browser.close();
}
