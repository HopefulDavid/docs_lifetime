import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const site = path.join(root, '_site');

// Výstupy a závislosti nesmějí spustit další sestavení. Nový commit mění stránku Změny.
const sources =
  /^(?:(?:food|drink|guides|data|media|scripts|templates)[\\/]|(?:docfx\.json|cliff\.toml|pruvodce\.md)$|\.git[\\/](?:HEAD$|refs[\\/]heads[\\/]))/;

let building = false;
let pending = true;
let timer;

async function build() {
  if (building || !pending) return;
  building = true;
  pending = false;
  console.log('Sestavují se aktuální zdroje.');
  const exitCode = await Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
  }).exited;
  console.log(
    exitCode === 0
      ? `Náhled je aktuální: ${server.url}`
      : 'Sestavení selhalo. Další uložení zdroje jej zopakuje.',
  );
  building = false;
  build();
}

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 8765,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const target = path.join(site, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
    const file = Bun.file(target);
    if (!target.startsWith(site + path.sep) || !(await file.exists()))
      return new Response('Stránka neexistuje.', { status: 404 });
    return new Response(file);
  },
});

fs.watch(root, { recursive: true }, (_event, filename) => {
  if (!sources.test(filename ?? '')) return;
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(build, 250);
});

build();
