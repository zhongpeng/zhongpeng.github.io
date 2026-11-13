import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(resolve(root, file), 'utf8');
const routes = ['moment-forever', 'museum', 'street', 'beat-pocket', 'money-compass', 'pelican-cycle', 'heye'];

test('homepage directly exposes all independent experiences without loading a game engine', async () => {
  const html = await read('index.html');
  for (const route of routes) {
    assert.ok(html.includes(`href="./${route}/"`), `missing direct entry: ${route}`);
    assert.ok((await stat(resolve(root, route, 'index.html'))).isFile());
  }
  assert.doesNotMatch(html, /<canvas|<iframe|(?:phaser|three)\.(?:min\.)?js/i);
});

test('homepage covers and stylesheet exist, and the published beat game uses directory-relative assets', async () => {
  const home = await read('index.html');
  for (const [, path] of home.matchAll(/(?:href|src)="(\.\/portal-assets\/[^"]+)"/g)) {
    assert.ok((await stat(resolve(root, path.split(/[?#]/)[0]))).size > 0, `missing homepage resource: ${path}`);
  }
  const beat = await read('beat-pocket/index.html');
  const assets = [...beat.matchAll(/(?:href|src)="(\.\/assets\/[^"?#]+)"/g)];
  assert.ok(assets.length >= 2, 'published game must have both JS and CSS');
  for (const [, path] of assets) assert.ok((await stat(resolve(root, 'beat-pocket', path))).isFile());
  assert.doesNotMatch(beat, /src="\/src\//);
});

test('rebuilding the street keeps the portal homepage intact and publishes the standalone route', async () => {
  const before = await read('index.html');
  execFileSync(process.execPath, ['build.mjs'], {cwd: resolve(root, '_app-source/midnight-street'), stdio: 'pipe'});
  assert.equal(await read('index.html'), before, 'street rebuild overwrote the portal');
  const street = await read('street/index.html');
  assert.match(street, /第八巷/);
  assert.match(street, /href="\/"[^>]*>作品首页/);
  assert.match(street, /\/street-assets\/street-v1\.js/);
});


test('Heye preview ships only local assets and clearly separates itself from the mini program', async () => {
  const html = await read('heye/index.html');
  assert.match(html, /data-hosting="static"/);
  assert.match(html, /与微信小程序独立/);
  for (const [, path] of html.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g)) {
    assert.ok((await stat(resolve(root, 'heye', path))).isFile(), `missing Heye resource: ${path}`);
  }
  assert.match(await read('heye/assets-ui.js'), /网页体验版未连接行情服务/);
});
