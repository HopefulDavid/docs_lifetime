import { expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

// Názvy testů čtou lidé ve výstupu bun test, proto jsou česky s diakritikou a v neutrálním stylu.
// Kontrola vezme první argument volání test, it, describe a suite (i s .each, .skip nebo .only),
// pokud je to řetězec. Slova podobná kódu nepočítá. Název aspoň ze dvou běžných slov
// bez české diakritiky a bez krátkého českého slova považuje za anglický.

const root = path.resolve(import.meta.dir, '..');
const hint =
  'Název testu se píše česky s diakritikou a v neutrálním stylu, například "recept se objeví v nákupním seznamu".';
const callee = /(?<![\w$.])(?:test|it|describe|suite)(?:\s*\.\s*[A-Za-z]+)*\s*(?=\()/g;
const czechLetter = /[áčďéěíňóřšťúůýž]/iu;
const czechWords = new Set(
  'a i k o s u v z se na je do po ze ve ke bez pro při jen ani nebo'.split(' '),
);
const keywordsBeforeRegex = new Set(
  'return typeof case do else in of new delete void throw yield await'.split(' '),
);

/**
 * Nahradí obsah komentářů, řetězců a regulárních výrazů mezerami, aby závorky a slova v nich
 * nepletly hledání volání. Konce řádků zachová kvůli číslům řádků.
 * Vrací maskovaný zdroj a řetězce podle pozice jejich úvodní uvozovky.
 */
function mask(source) {
  // Rozdělení po jednotkách UTF-16 drží pozice shodné s source.indexOf i u emoji.
  const chars = source.split('');
  const strings = new Map();
  const blank = (from, to) => {
    for (let index = from; index < to; index++) if (chars[index] !== '\n') chars[index] = ' ';
  };
  let previous = '';
  let word = '';

  const quoted = (start) => {
    const quote = chars[start];
    let index = start + 1;
    while (index < chars.length && chars[index] !== quote && chars[index] !== '\n')
      index += chars[index] === '\\' ? 2 : 1;
    strings.set(start, chars.slice(start + 1, index).join(''));
    blank(start + 1, index);
    return index + 1;
  };

  // Vložené výrazy ${…} šablony se nahradí znakem $, aby se počítaly jako kód.
  const template = (start) => {
    let index = start + 1;
    let value = '';
    while (index < chars.length && chars[index] !== '`') {
      if (chars[index] === '\\') {
        value += chars[index] + (chars[index + 1] ?? '');
        index += 2;
      } else if (chars[index] === '$' && chars[index + 1] === '{') {
        const end = code(index + 2, true);
        blank(index, end);
        value += '$';
        index = end;
      } else {
        value += chars[index++];
      }
    }
    strings.set(start, value);
    blank(start + 1, index);
    return index + 1;
  };

  const regex = (start) => {
    let index = start + 1;
    let inClass = false;
    while (index < chars.length && chars[index] !== '\n' && (inClass || chars[index] !== '/')) {
      if (chars[index] === '\\') index++;
      else if (chars[index] === '[') inClass = true;
      else if (chars[index] === ']') inClass = false;
      index++;
    }
    blank(start + 1, index);
    return index + 1;
  };

  // Projde kód od pozice start. Uvnitř ${…} skončí za odpovídající složenou závorkou.
  function code(start, nested = false) {
    let index = start;
    let depth = 0;
    while (index < chars.length) {
      const char = chars[index];
      const next = chars[index + 1];
      if (char === '/' && next === '/') {
        const end = source.indexOf('\n', index);
        const stop = end < 0 ? chars.length : end;
        blank(index, stop);
        index = stop;
      } else if (char === '/' && next === '*') {
        const end = source.indexOf('*/', index + 2);
        const stop = end < 0 ? chars.length : end + 2;
        blank(index, stop);
        index = stop;
      } else if (char === "'" || char === '"') {
        index = quoted(index);
        previous = char;
      } else if (char === '`') {
        index = template(index);
        previous = char;
      } else if (
        char === '/' &&
        (!previous || /[(,=:[!&|?{};+\-*%<>~^]/.test(previous) || keywordsBeforeRegex.has(word))
      ) {
        index = regex(index);
        previous = '/';
        word = '';
      } else if (/[\w$]/.test(char)) {
        word = '';
        while (index < chars.length && /[\w$]/.test(chars[index])) word += chars[index++];
        previous = word.at(-1);
      } else {
        if (nested && char === '{') depth++;
        if (nested && char === '}' && depth-- === 0) return index + 1;
        if (!/\s/.test(char)) {
          previous = char;
          word = '';
        }
        index++;
      }
    }
    return index;
  }

  code(0);
  return { masked: chars.join(''), strings };
}

/** Vrátí pozici za závorkou, která uzavírá skupinu otevřenou na pozici start. */
function closing(masked, start) {
  let depth = 0;
  for (let index = start; index < masked.length; index++) {
    if (masked[index] === '(') depth++;
    else if (masked[index] === ')' && --depth === 0) return index + 1;
  }
  return masked.length;
}

/** Najde názvy testů ve zdroji. U řetězených volání jako test.each(...)('název') rozhoduje poslední závorka. */
function testNames(source) {
  const { masked, strings } = mask(source);
  const names = [];
  for (const match of masked.matchAll(callee)) {
    let open = match.index + match[0].length;
    let first;
    while (masked[open] === '(') {
      const argument = open + 1 + masked.slice(open + 1).search(/\S/);
      first = strings.get(argument);
      const end = closing(masked, open);
      const after = masked.slice(end).search(/\S|$/);
      if (masked[end + after] !== '(') break;
      open = end + after;
    }
    if (first !== undefined)
      names.push({ line: source.slice(0, match.index).split('\n').length, name: first });
  }
  return names;
}

/** Rozhodne, zda název nejspíš není český podle pravidla v úvodním komentáři. */
function looksEnglish(name) {
  // Znak % označuje zástupce jako %s v test.each, $ vložený výraz šablony.
  const words = name
    .split(/\s+/)
    .filter((token) => !/[._(/\d`'"$%]/.test(token))
    .map((token) => token.replace(/^\P{L}+|\P{L}+$/gu, ''))
    .filter((word) => word && !/^\p{Lu}{2,}$/u.test(word) && !/\p{Ll}\p{Lu}/u.test(word));
  return (
    words.length >= 2 &&
    !czechLetter.test(name) &&
    !words.some((word) => czechWords.has(word.toLowerCase()))
  );
}

function testFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
      return entry.name === 'node_modules' || /^[._]/.test(entry.name) ? [] : testFiles(file);
    return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

test('detektor najde anglický název a ponechá český i kódový', () => {
  const source = [
    "test('shows the overview', () => {});",
    'describe.each([[1], [2]])("handles case %s", () => {});',
    'it.skip(`renders ${name} page`, () => {});',
    "test('recept se objeví', () => {});",
    "test('parse toc.yml CRLF', () => {});",
    "test('zápis do souboru', () => {});",
    "test('Bun API', () => {});",
    "// test('commented out name', () => {});",
    'const text = "test(\'quoted call name\')";',
    "expect(/test('regex call')/.test(text)).toBe(false);",
  ].join('\n');
  const flagged = testNames(source).filter(({ name }) => looksEnglish(name));

  expect(flagged).toEqual([
    { line: 1, name: 'shows the overview' },
    { line: 2, name: 'handles case %s' },
    { line: 3, name: 'renders $ page' },
  ]);
});

test('názvy testů jsou české', () => {
  const names = testFiles(root).flatMap((file) =>
    testNames(fs.readFileSync(file, 'utf8')).map(({ line, name }) => ({
      location: `${path.relative(root, file).replaceAll(path.sep, '/')}:${line}`,
      name,
    })),
  );
  // Kontrola, že hledání vůbec něco našlo, jinak by test prošel naprázdno.
  expect(names.map(({ name }) => name)).toContain('názvy testů jsou české');

  const findings = names
    .filter(({ name }) => looksEnglish(name))
    .map(({ location, name }) => `${location}: '${name}'`);
  expect(findings, hint).toEqual([]);
});
