import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const out = join(root, 'www');
const skipTop = new Set([
  '.git', '.github', 'node_modules', 'www', 'ios', 'android',
  'native-src', 'scripts', 'netlify', '.netlify'
]);
const skipFiles = new Set([
  'package.json', 'package-lock.json', 'capacitor.config.ts',
  'README_NATIVE_APP.md', 'CHANGELOG.md', 'APPLE_OPDRACHT_WATERKAARTEN.md'
]);
const allowedExtensions = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.webp',
  '.svg', '.ico', '.txt', '.xml', '.webmanifest', '.woff', '.woff2', '.ttf',
  '.mp3', '.m4a', '.wav', '.pdf', '.gpx', '.kmz'
]);

async function copyTree(source, target, depth = 0) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (depth === 0 && skipTop.has(entry.name)) continue;
    if (depth === 0 && skipFiles.has(entry.name)) continue;
    if (depth === 0 && /^CONTROLE_/i.test(entry.name)) continue;
    if (entry.name === '.DS_Store') continue;

    const src = join(source, entry.name);
    const dst = join(target, entry.name);

    if (entry.isDirectory()) {
      await mkdir(dst, { recursive: true });
      await copyTree(src, dst, depth + 1);
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext) && entry.name !== 'CNAME') continue;
    await mkdir(join(dst, '..'), { recursive: true });
    await cp(src, dst);
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyTree(root, out);

await build({
  entryPoints: [join(root, 'native-src', 'bridge.ts')],
  outfile: join(out, 'native-app-bridge.js'),
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'iife',
  platform: 'browser',
  target: ['safari16']
});

const indexPath = join(out, 'index.html');
let html = await readFile(indexPath, 'utf8');
const nativeScript = '<script src="native-app-bridge.js"></script>';
if (!html.includes('native-app-bridge.js')) {
  html = html.includes('</body>')
    ? html.replace('</body>', `${nativeScript}\n</body>`)
    : `${html}\n${nativeScript}\n`;
}
await writeFile(indexPath, html, 'utf8');

const indexStat = await stat(indexPath);
console.log(`MijnSerenity native webbuild gereed: ${relative(root, out)} (${indexStat.size} bytes index.html)`);
