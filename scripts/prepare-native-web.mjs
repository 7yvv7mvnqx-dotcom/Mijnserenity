import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const out = join(root, 'www');
const nativeRelease = { build: '8.27.7', token: '827700' };
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

async function alignNativeReleaseVersions() {
  const bootstrapPath = join(out, 'auth-bootstrap.js');
  let bootstrap = await readFile(bootstrapPath, 'utf8');
  bootstrap = bootstrap
    .replace(/MijnSerenity\s+\d+\.\d+\.\d+\s+—\s+snelle uniforme stabiliteitsbootstrap/, `MijnSerenity ${nativeRelease.build} — snelle uniforme stabiliteitsbootstrap`)
    .replace(/const BUILD='[^']+';/, `const BUILD='${nativeRelease.build}';`)
    .replace(/const VERSION='[^']+';/, `const VERSION='${nativeRelease.token}';`);
  await writeFile(bootstrapPath, bootstrap, 'utf8');
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyTree(root, out);
await alignNativeReleaseVersions();

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
html = html
  .replace(/(<meta\s+name="mijnserenity-build"\s+content=")[^"]+("\s*>)/i, `$1${nativeRelease.build}$2`)
  .replace(/window\.MIJSERENITY_BUILD='[^']+';/, `window.MIJSERENITY_BUILD='${nativeRelease.build}';`)
  .replace(/auth-bootstrap\.js\?v=\d+/g, `auth-bootstrap.js?v=${nativeRelease.token}`)
  .replace(/start-dashboard-71510\.js\?v=\d+/g, `start-dashboard-71510.js?v=${nativeRelease.token}`);

const nativeScript = '<script src="native-app-bridge.js"></script>';
if (!html.includes('native-app-bridge.js')) {
  if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/(<body[^>]*>)/i, `$1\n${nativeScript}`);
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', `${nativeScript}\n</body>`);
  } else {
    html = `${nativeScript}\n${html}`;
  }
}
await writeFile(indexPath, html, 'utf8');

const indexStat = await stat(indexPath);
console.log(`MijnSerenity native webbuild ${nativeRelease.build} gereed: ${relative(root, out)} (${indexStat.size} bytes index.html)`);
