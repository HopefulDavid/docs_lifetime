const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const allowedCanonicalStatuses = new Set([
  'not-initialized',
  'not-applicable',
  'draft',
  'accepted',
  'deprecated',
]);
const ignoredDirectoryNames = new Set(['.git', '.idea', '_site', 'node_modules']);
const initializedProjectDocuments = [
  'README.md',
  'docs/product/requirements.md',
  'docs/architecture/overview.md',
  'docs/development/commands.md',
  'docs/delivery/ci-cd.md',
  'docs/operations/runbook.md',
];
const errors = [];

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function relativeToRoot(fullPath) {
  return toPosix(path.relative(root, fullPath));
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const result = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }

  return result;
}

function readFile(fullPath) {
  return fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
}

function parseFrontMatter(content) {
  if (!content.startsWith('---\n')) {
    return null;
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return null;
  }

  const metadata = {};

  for (const line of content.slice(4, end).split('\n')) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (match) {
      metadata[match[1]] = match[2].trim();
    }
  }

  return metadata;
}

function validateCanonicalMetadata(markdownFiles) {
  const canonicalKeys = new Map();

  for (const fullPath of markdownFiles) {
    const relativePath = relativeToRoot(fullPath);
    if (relativePath.startsWith('docs/templates/')) {
      continue;
    }

    const metadata = parseFrontMatter(readFile(fullPath));
    if (!metadata?.canonical_for) {
      continue;
    }

    const previous = canonicalKeys.get(metadata.canonical_for);
    if (previous) {
      errors.push(
        `${relativePath}: canonical_for '${metadata.canonical_for}' už používá ${previous}`
      );
    } else {
      canonicalKeys.set(metadata.canonical_for, relativePath);
    }

    if (!allowedCanonicalStatuses.has(metadata.status)) {
      errors.push(`${relativePath}: neplatný kanonický stav '${metadata.status || 'chybí'}'`);
    }

    if (!metadata.owner && metadata.owners === undefined) {
      errors.push(`${relativePath}: chybí vlastník owner nebo owners`);
    }

    if (metadata.status === 'accepted' && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.last_verified)) {
      errors.push(`${relativePath}: přijatý dokument nemá platné last_verified`);
    }
  }
}

function stripFencedCode(content) {
  return content.replace(/```[\s\S]*?```/g, '');
}

function normalizeLinkTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  if (!trimmed || trimmed.includes('<') || trimmed.includes('>')) {
    return null;
  }

  const withoutTitle = trimmed.split(/\s+(?=["'])/, 1)[0];
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(withoutTitle) || withoutTitle.startsWith('#')) {
    return null;
  }

  const pathPart = withoutTitle.split(/[?#]/, 1)[0];
  if (!pathPart) {
    return null;
  }

  try {
    return decodeURIComponent(pathPart);
  } catch {
    return pathPart;
  }
}

function validateInternalLinks(markdownFiles) {
  const linkPattern = /!?\[[^\]]*\]\(([^)\n]+)\)/g;

  for (const fullPath of markdownFiles) {
    const relativePath = relativeToRoot(fullPath);
    const content = stripFencedCode(readFile(fullPath));
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const target = normalizeLinkTarget(match[1]);
      if (!target) {
        continue;
      }

      const resolved = target.startsWith('/')
        ? path.resolve(root, `.${target}`)
        : path.resolve(path.dirname(fullPath), target);
      const staysInRepository = resolved === root || resolved.startsWith(`${root}${path.sep}`);

      if (!staysInRepository) {
        errors.push(`${relativePath}: odkaz '${target}' míří mimo repozitář`);
      } else if (!fs.existsSync(resolved)) {
        errors.push(`${relativePath}: neexistující interní odkaz '${target}'`);
      }
    }
  }
}

function validateInitializedDocuments() {
  for (const relativePath of initializedProjectDocuments) {
    const fullPath = path.join(root, relativePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`${relativePath}: chybí projektový dokument`);
      continue;
    }

    if (readFile(fullPath).includes('PROJECT-INIT')) {
      errors.push(`${relativePath}: po inicializaci obsahuje PROJECT-INIT`);
    }
  }
}

function validateAgentAdapter() {
  const adapterPath = path.join(root, 'CLAUDE.md');
  const expected = '@AGENTS.md';

  if (!fs.existsSync(adapterPath) || readFile(adapterPath).trim() !== expected) {
    errors.push(`CLAUDE.md: musí obsahovat pouze '${expected}'`);
  }
}

function validateWorkRecords(markdownFiles) {
  for (const fullPath of markdownFiles) {
    const relativePath = relativeToRoot(fullPath);
    if (!/^docs\/work\/WORK-.*\.md$/.test(relativePath)) {
      continue;
    }

    const metadata = parseFrontMatter(readFile(fullPath));
    if (metadata?.status !== 'active') {
      errors.push(`${relativePath}: neaktivní pracovní záznam musí být odstraněn`);
    }
  }
}

function validateGeneratedArtifacts(allFiles) {
  for (const fullPath of allFiles) {
    const relativePath = relativeToRoot(fullPath);
    if (relativePath.endsWith('.pyc') || relativePath.includes('/__pycache__/')) {
      errors.push(`${relativePath}: generovaný Python artefakt nepatří do repozitáře`);
    }
  }
}

function validateWorkflowSecurity() {
  const relativePath = '.github/workflows/main.yml';
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: chybí kanonický workflow`);
    return;
  }

  const content = readFile(fullPath);
  const usesPattern = /^\s*uses:\s*[^@\s]+@([^\s#]+)/gm;
  let match;

  while ((match = usesPattern.exec(content)) !== null) {
    if (!/^[0-9a-f]{40}$/.test(match[1])) {
      errors.push(`${relativePath}: externí akce není připnutá na úplný commit SHA`);
    }
  }

  if (!content.includes('to: ${{ secrets.MAIL_RECIPIENTS }}')) {
    errors.push(`${relativePath}: příjemci oznámení musí pocházet z MAIL_RECIPIENTS`);
  }

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content)) {
    errors.push(`${relativePath}: workflow obsahuje veřejně zapsanou e-mailovou adresu`);
  }

  if (/\bgit\s+(?:commit|push)\b/.test(content)) {
    errors.push(`${relativePath}: publikační workflow nesmí měnit zdrojovou historii`);
  }
}

function main() {
  const allFiles = walkFiles(root);
  const markdownFiles = allFiles.filter((file) => file.endsWith('.md'));

  validateCanonicalMetadata(markdownFiles);
  validateInternalLinks(markdownFiles);
  validateInitializedDocuments();
  validateAgentAdapter();
  validateWorkRecords(markdownFiles);
  validateGeneratedArtifacts(allFiles);
  validateWorkflowSecurity();

  if (errors.length) {
    console.error(`Kontrola dokumentace selhala (${errors.length}):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Dokumentace je strukturálně platná (${markdownFiles.length} Markdown souborů).`);
}

main();
