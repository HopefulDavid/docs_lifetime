/**
 * Konfigurace pro generování changelogu
 * @module changelog-config
 */

// Mapování typů commitů na emoji ikony
const COMMIT_TYPE_EMOJIS = {
  feat: { emoji: '✨', desc: 'Nové funkcionality' },
  fix: { emoji: '🐛', desc: 'Opravy chyb' },
  docs: { emoji: '📚', desc: 'Změny v dokumentaci' },
  style: { emoji: '🎨', desc: 'Změny formátování' },
  refactor: { emoji: '♻️', desc: 'Refaktorizace kódu' },
  test: { emoji: '🧪', desc: 'Přidání nebo úprava testů' },
  chore: { emoji: '🔨', desc: 'Správa projektu' },
  perf: { emoji: '⚡', desc: 'Optimalizace výkonu' },
};

// Regulární výraz pro parsování commit zprávy
const COMMIT_PATTERN = /^(feat|fix|docs|style|refactor|test|chore|perf)(?:\s*\(([^)]+)\))?:\s*(.+)$/;

/**
 * Převede UTC datum na lokální datum ve formátu YYYY-MM-DD
 * @param {Date} date - UTC datum
 * @returns {string} Lokální datum ve formátu YYYY-MM-DD
 */
const convertToLocalDate = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
};

/**
 * Transformuje commit objekt do požadovaného formátu
 * @param {Object} commit - Původní commit objekt
 * @returns {Object} Transformovaný commit objekt
 */
const transformCommit = (commit) => {
  const headerMatch = commit.header.match(COMMIT_PATTERN);

  // Přeskakujeme commity, které obsahují "update changelog" v hlavičce
  if (commit.header.toLowerCase().includes('update changelog')) {
    return false;
  }

  const commitInfo = {
    type: '',
    desc: '',
    scope: '',
    subject: commit.header
  };

  if (headerMatch) {
    const [, type, scope, subject] = headerMatch;
    commitInfo.type = type;
    commitInfo.scope = scope;
    commitInfo.subject = subject;

    // Ensure we set both emoji and desc only when we have a valid type
    if (COMMIT_TYPE_EMOJIS[type]) {
      commitInfo.type = COMMIT_TYPE_EMOJIS[type].emoji;
      commitInfo.desc = COMMIT_TYPE_EMOJIS[type].desc || '';
    }
  }

  commitInfo.date = convertToLocalDate(new Date(commit.authorDate));

  return { ...commit, ...commitInfo };
};

/**
 * Šablona pro výstupní changelog
 */
const CHANGELOG_TEMPLATE = `Změny
{{#each commitGroups}}
  {{#if title}}
## {{title}}
    {{#each commits}}
  - {{#if type}}{{type}}{{/if}}{{#if desc}} {{desc}}{{/if}}{{#if subject}}{{#if type}}: {{/if}}{{subject}}{{/if}}{{#if scope}} ({{scope}}){{/if}}
    {{/each}}
  {{/if}}
{{/each}}
`;

/**
 * Seřadí skupiny commitů podle data sestupně
 */
const sortCommitGroups = (a, b) => new Date(b.title).getTime() - new Date(a.title).getTime();

// Exportovaná konfigurace
module.exports = {
  writerOpts: {
    transform: transformCommit,
    groupBy: 'date',
    commitGroupsSort: sortCommitGroups,
    commitsSort: ['-date', 'scope', 'subject'],
    noteGroupsSort: 'title',
    mainTemplate: CHANGELOG_TEMPLATE,
    finalizeContext: (context) => {
      context.commitGroups.sort(sortCommitGroups);
      return context;
    }
  },
  gitRawCommitsOpts: {
    format: '%B%n-hash-%n%H%n-gitTags-%n%d%n-authorDate-%n%aI%n-committerDate-%n%ci%n-authorName-%n%an%n-authorEmail-%n%ae',
  },
};