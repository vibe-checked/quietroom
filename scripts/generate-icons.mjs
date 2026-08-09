import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, '..', 'assets');
const iconSvg = path.join(__dirname, 'icon.svg');
const splashSvg = path.join(__dirname, 'splash.svg');

const BG = '#180f0a';

async function run() {
  // iOS + generic app icon: opaque, flattened.
  await sharp(iconSvg)
    .resize(1024, 1024)
    .flatten({ background: BG })
    .png()
    .toFile(path.join(assets, 'icon.png'));

  // Splash mark: transparent logo, composited/resized by expo-splash-screen at runtime.
  await sharp(splashSvg).resize(1024, 1024).png().toFile(path.join(assets, 'splash-icon.png'));

  // Favicon (web) — small, opaque.
  await sharp(iconSvg).resize(48, 48).flatten({ background: BG }).png().toFile(path.join(assets, 'favicon.png'));

  // Android adaptive icon: foreground (mark on transparent, padded into safe zone)
  // and background (flat brand color fill).
  const fgMark = await sharp(splashSvg).resize(768, 768).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fgMark, gravity: 'center' }])
    .png()
    .toFile(path.join(assets, 'android-icon-foreground.png'));

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .png()
    .toFile(path.join(assets, 'android-icon-background.png'));

  // Monochrome (Android 13+ themed icon): single-color silhouette with a real
  // alpha cutout for the crescent — Android tints by alpha, so the "cutout"
  // circle must actually punch transparency (dest-out), not just paint over it.
  const outerDisc = await sharp(
    Buffer.from(`<svg width="1024" height="1024"><circle cx="512" cy="460" r="196" fill="#ffffff"/></svg>`),
  )
    .png()
    .toBuffer();
  const innerDisc = await sharp(
    Buffer.from(`<svg width="1024" height="1024"><circle cx="586" cy="392" r="178" fill="#ffffff"/></svg>`),
  )
    .png()
    .toBuffer();
  const crescentAlpha = await sharp(outerDisc)
    .composite([{ input: innerDisc, blend: 'dest-out' }])
    .png()
    .toBuffer();
  await sharp(crescentAlpha).resize(432, 432).png().toFile(path.join(assets, 'android-icon-monochrome.png'));

  console.log('Icons generated.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
