import fs from 'node:fs';
import path from 'node:path';
import { overview } from './pages.js';
import { sections } from './sections.js';

const notice = 'Generováno příkazem bun run build z data/areas.json a guides/.';
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const types = new Set(['kitchen', 'guides']);
// Tyto složky ve výstupu už plní recepty, média, ikony a katalog. Oblast by je přepsala.
const reservedPaths = new Set([...Object.keys(sections), 'media', 'public', 'data']);
const collator = new Intl.Collator('cs', { sensitivity: 'base' });

/**
 * Načte oblasti života z data/areas.json. Kuchyně má vlastní generátor, oblast typu `guides`
 * vznikne ze složky guides/<id> s návody v Markdownu. Chybný záznam ukončí sestavení.
 */
export function readAreas(root) {
  const { areas } = JSON.parse(fs.readFileSync(path.join(root, 'data/areas.json'), 'utf8'));
  const seen = new Set();
  for (const area of areas) {
    const where = `data/areas.json: oblast '${area.id}'`;
    if (!slugPattern.test(area.id ?? ''))
      throw new Error(`${where} potřebuje id z malých písmen a pomlček`);
    if (!slugPattern.test(area.path ?? ''))
      throw new Error(`${where} potřebuje path z malých písmen a pomlček`);
    if (reservedPaths.has(area.path))
      throw new Error(
        `${where} nemůže použít path '${area.path}', protože ji používá jiný obsah webu`,
      );
    if (!types.has(area.type)) throw new Error(`${where} má neznámý type '${area.type}'`);
    for (const field of ['title', 'intro', 'icon'])
      if (typeof area[field] !== 'string' || !area[field].trim())
        throw new Error(`${where} nemá ${field}`);
    if (seen.has(area.path)) throw new Error(`${where} používá stejnou path jako jiná oblast`);
    seen.add(area.path);
  }
  if (areas.filter(({ type }) => type === 'kitchen').length !== 1)
    throw new Error('data/areas.json: kuchyně musí být uvedená právě jednou');
  return areas;
}

function parseGuide(file, source) {
  const [, frontMatter, body] = source
    .replaceAll('\r\n', '\n')
    .match(/^(?:---\n([\s\S]*?)\n---\n)?([\s\S]*)$/);
  const metadata = (frontMatter && Bun.YAML.parse(frontMatter)) || {};
  const title = body.match(/^# (.+)$/m)?.[1]?.trim();
  if (!title) throw new Error(`${file}: chybí hlavní nadpis`);
  if (typeof metadata.description !== 'string' || !metadata.description.trim())
    throw new Error(`${file}: chybí description v metadatech`);
  return { title, description: metadata.description.trim() };
}

/**
 * Sestaví oblasti typu `guides`: zkopíruje návody pod path oblasti a vytvoří přehled s kartami
 * a navigaci. Oblast bez návodů se vynechá, aby úvod neodkazoval na prázdnou stránku.
 * Vrací soubory a počty návodů podle id oblasti.
 */
export function renderGuideAreas(root, areas) {
  const files = new Map();
  const counts = new Map();
  for (const area of areas.filter(({ type }) => type === 'guides')) {
    const directory = path.join(root, 'guides', area.id);
    if (!fs.existsSync(directory)) continue;
    const guides = fs
      .readdirSync(directory, { recursive: true })
      .map((file) => file.replace(/\\/g, '/'))
      .filter((file) => file.endsWith('.md'))
      .map((file) => {
        if (file === 'index.md')
          throw new Error(`guides/${area.id}/index.md je vyhrazený pro přehled oblasti`);
        const source = fs.readFileSync(path.join(directory, file), 'utf8');
        return { file, source, ...parseGuide(`guides/${area.id}/${file}`, source) };
      })
      .sort((a, b) => collator.compare(a.title, b.title));
    if (guides.length === 0) continue;

    counts.set(area.id, guides.length);
    for (const { file, source } of guides) files.set(`${area.path}/${file}`, source);
    // Karty sdílí podobu i escapování HTML s přehledy kuchyně.
    const cards = overview(
      guides.map(({ file, title, description }) => [`[${title}](${file})`, description]),
      { cards: true },
    );
    files.set(
      `${area.path}/index.md`,
      `<!-- ${notice} -->\n\n# ${area.title}\n\n${area.intro}\n\n## Návody\n\n${cards}`,
    );
    const items = [
      { name: 'Přehled', href: 'index.md' },
      ...guides.map(({ file, title }) => ({ name: title, href: file })),
    ];
    files.set(`${area.path}/toc.yml`, `# ${notice}\n${JSON.stringify(items, null, 2)}\n`);
  }
  return { files, counts };
}
