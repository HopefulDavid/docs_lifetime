const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Vývojový náhled spouštějte pomocí npm run docs:dev.');

let building;
let server;
let pending = true;
let timer;
let stopping = false;

function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}

function stop() {
  stopping = true;
  clearTimeout(timer);
  watcher.close();
  stopChild(building);
  stopChild(server);
}

function build() {
  if (building || stopping || !pending) return;
  pending = false;
  console.log('Sestavuji aktuální zdroje…');
  building = spawn(process.execPath, [npmCli, 'run', 'docs:build'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  building.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
    stop();
  });
  building.on('exit', (code) => {
    building = undefined;
    if (stopping) return;
    if (code === 0 && !server) {
      server = spawn(
        'dotnet',
        ['tool', 'run', 'docfx', 'serve', '_site', '--hostname', '127.0.0.1', '--port', '8765'],
        { cwd: root, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' },
      );
      server.on('error', (error) => {
        console.error(error.message);
        process.exitCode = 1;
        stop();
      });
      server.on('exit', (code) => {
        if (!stopping) {
          process.exitCode = code || 0;
          stop();
        }
      });
    }
    console.log(
      code === 0
        ? 'Náhled je aktuální; obnovte stránku v prohlížeči.'
        : 'Sestavení selhalo; opravte zdroj, další uložení spustí nové ověření.',
    );
    if (pending) build();
  });
}

// Jeden sledovač zachytí i nově vytvořené adresáře; odvozené výstupy nikdy nespouštějí další build.
const watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
  const relative = String(filename || '').replace(/\\/g, '/');
  const sourceDirectory = /^(food|drink|data|scripts|templates|docs|\.github|\.config)(\/|$)/.test(
    relative,
  );
  const sourceFile =
    /^(package(?:-lock)?\.json|docfx\.json|cliff\.toml|pruvodce\.md|README\.md|AGENTS\.md|CLAUDE\.md|\.gitignore)$/.test(
      relative,
    );
  const history = /^\.git\/(HEAD|packed-refs|refs\/(heads|tags)(\/.*)?)$/.test(relative);
  if (!sourceDirectory && !sourceFile && !history) return;
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(build, 250);
});
watcher.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
  stop();
});
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
build();
