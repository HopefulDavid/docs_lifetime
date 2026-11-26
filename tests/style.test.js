import { expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');

// Recepty a průvodce nikoho neoslovují: místo „nakrájejte“ platí „nakrájí se“.
// Test zachytí tvary druhé osoby množného i jednotného čísla a přivlastňovací zájmena.
const patterns = [
  /(?<!\p{L})\p{L}{2,}(?:ujte|ejte|ijte|ěte|ete|áte|íte|ňte|ďte|ťte|lte|pte|vte|řte|žte|šte|čte|dte|nte|rte|ste|zte|kte|bte|mte|jte|chte|hte)(?!\p{L})/u,
  // Slova jako guláš nebo spíš končí stejně jako druhá osoba, proto je výjimka vylučuje.
  /(?<!\p{L})(?!(?:buřt)?guláš(?!\p{L})|spíš(?!\p{L}))\p{L}{2,}(?:eš|íš|áš|ěš)(?!\p{L})/iu,
  /(?<!\p{L})(?:vás|vám|vámi|vaše|váš|vaši|vašeho|vašem|vaším|vašich|tvůj|tvoje|tvá|tvé|tebe|tobě)(?!\p{L})/iu,
];

/** Ponechá prózu bez bloků kódu, kódu v textu, adres odkazů a HTML. Čísla řádků zůstanou. */
function prose(source) {
  return source
    .replace(/^(`{3,}|~{3,})[\s\S]*?^\1/gm, (block) => block.replace(/[^\n]/g, ''))
    .replace(/`[^`\n]*`/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>\n]*>/g, '');
}

function addressing(source) {
  return prose(source)
    .split('\n')
    .flatMap((line, index) =>
      patterns.some((pattern) => pattern.test(line)) ? [`${index + 1}: ${line.trim()}`] : [],
    );
}

const texts = () =>
  ['food', 'drink', 'guides']
    .filter((directory) => fs.existsSync(path.join(root, directory)))
    .flatMap((directory) =>
      fs
        .readdirSync(path.join(root, directory), { recursive: true })
        .filter((file) => file.endsWith('.md'))
        .map((file) => path.join(directory, file).replace(/\\/g, '/')),
    )
    .concat('pruvodce.md');

test('detektor rozpozná oslovení', () => {
  expect(addressing('- Cibuli nakrájejte.\n- Nechte vychladit.\n- Ulož váš nákup.')).toHaveLength(
    3,
  );
  expect(addressing('- Cibule se nakrájí.\n- Nechá se vychladit.\n`nakrájejte`')).toEqual([]);
});

test('recepty nepoužívají oslovení', () => {
  const findings = texts().flatMap((file) =>
    addressing(fs.readFileSync(path.join(root, file), 'utf8')).map((line) => `${file}:${line}`),
  );
  expect(findings).toEqual([]);
});
