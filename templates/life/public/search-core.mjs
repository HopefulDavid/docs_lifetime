const wordPattern = /[\p{L}\p{N}]+/gu;
const markPattern = /\p{M}+/gu;
const siteCollator = new Intl.Collator(['cs', 'en'], { sensitivity: 'base' });

/**
 * Normalizuje indexovaný text v libovolném jazyce na porovnatelná Unicode slova.
 *
 * @param {unknown} value Text určený k normalizaci.
 * @returns {string} Slova malými písmeny bez diakritických znamének.
 */
export function normalizeSearchText(value) {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(markPattern, '')
    .toLocaleLowerCase('cs-CZ');

  return (normalized.match(wordPattern) ?? []).join(' ');
}

/**
 * Připraví vyhledávací data DocFX pro opakované klientské dotazy.
 *
 * @param {Record<string, object>} data Index DocFX klíčovaný výstupní cestou.
 * @returns {Array<object>} Prohledávatelné položky s normalizovanými poli.
 */
export function createSearchIndex(data) {
  return Object.values(data ?? {}).map((hit) => {
    const normalizedTitle = normalizeSearchText(hit.title);
    const normalizedKeywords = normalizeSearchText(
      [hit.keywords, hit.summary, hit.href].filter(Boolean).join(' ')
    );

    return {
      hit,
      normalizedTitle,
      normalizedKeywords,
      titleTokens: normalizedTitle.split(' ').filter(Boolean),
      keywordTokens: normalizedKeywords.split(' ').filter(Boolean),
    };
  });
}

/**
 * Vyhledá a seřadí položky DocFX pro přesný termín nebo prefix slova.
 *
 * @param {Array<object>} index Připravené položky z {@link createSearchIndex}.
 * @param {unknown} query Vyhledávací dotaz zadaný uživatelem.
 * @returns {Array<object>} Původní výsledky DocFX seřazené podle relevance.
 */
export function searchIndex(index, query) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = [...new Set(normalizedQuery.split(' ').filter(Boolean))];

  if (queryTokens.length === 0) {
    return [];
  }

  return index
    .map((entry) => scoreEntry(entry, normalizedQuery, queryTokens))
    .filter(Boolean)
    .sort(compareScoredEntries)
    .map(({ hit }) => hit);
}

function scoreEntry(entry, normalizedQuery, queryTokens) {
  let score = 0;

  for (const queryToken of queryTokens) {
    const titleScore = scoreToken(queryToken, entry.titleTokens, 100, 70);
    const keywordScore = scoreToken(queryToken, entry.keywordTokens, 20, 10);
    const tokenScore = Math.max(titleScore, keywordScore);

    if (tokenScore === 0) {
      return null;
    }

    score += tokenScore;
  }

  if (entry.normalizedTitle.includes(normalizedQuery)) {
    score += 200;
  } else if (entry.normalizedKeywords.includes(normalizedQuery)) {
    score += 40;
  }

  return { hit: entry.hit, score };
}

function scoreToken(queryToken, tokens, exactScore, prefixScore) {
  if (tokens.includes(queryToken)) {
    return exactScore;
  }

  if (queryToken.length >= 3 && tokens.some((token) => token.startsWith(queryToken))) {
    return prefixScore;
  }

  return 0;
}

function compareScoredEntries(left, right) {
  return (
    right.score - left.score ||
    siteCollator.compare(left.hit.title ?? '', right.hit.title ?? '') ||
    String(left.hit.href ?? '').localeCompare(String(right.hit.href ?? ''))
  );
}
