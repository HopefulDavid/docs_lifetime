import assert from 'node:assert/strict';
import test from 'node:test';
import { createIconAssets } from '../scripts/generate-icons.cjs';

test('sestavené ikony jsou samostatné SVG a nevyžadují font ani vzdálenou službu', () => {
  const assets = createIconAssets();
  const css = assets.get('public/icons.css');
  const embeddedIcons = [...css.matchAll(/url\("data:image\/svg\+xml,([^\"]+)"\)/g)];

  assert(embeddedIcons.length > 0, 'výběr musí obsahovat vykreslitelné ikony');
  for (const [, encoded] of embeddedIcons) {
    const svg = decodeURIComponent(encoded);
    assert.match(svg, /<svg[^>]+viewBox=/);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b|(?:href|src)=["']https?:/);
  }
  assert.doesNotMatch(css, /@font-face|url\(["']?https?:/);
  assert.deepEqual(createIconAssets(), assets, 'stejný zdroj musí vytvořit shodné assety');
});
