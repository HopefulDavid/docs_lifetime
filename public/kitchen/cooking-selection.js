import { el } from '../dom.js';
import { icon } from '../ui-icons.js';
import { chooseRecipesLink, recipeMeta } from './components.js';
import { cookingProgress, recipeSettings } from './core.js';
import { formatFactor } from './quantity.js';
import { state, url } from './store.js';

/** Uložený průběh vaření receptu a pojmenování vstupu do něj. */
export function cookingStatus(recipe, config) {
  const cooking = state.cooking[recipe.id] ?? { step: 0, done: [] };
  const progress = cookingProgress(recipe, config, cooking);
  const started = progress.done.length || cooking.step > 0;
  const action = started ? 'Pokračovat ve vaření' : 'Vařit krok za krokem';
  return { ...progress, action: progress.complete ? 'Otevřít hotové vaření' : action };
}

function cookingCard(recipe) {
  const config = recipeSettings(recipe, state.selections[recipe.id]);
  const { active, done, action } = cookingStatus(recipe, config);
  return el(
    'section',
    { className: 'cooking-selection-card' },
    recipeMeta(recipe),
    el('h3', {}, el('a', { href: url(`${recipe.id}.html#uvarit`) }, recipe.title)),
    el(
      'p',
      { className: 'kitchen-muted' },
      `${formatFactor(config.factor)} dávka · ${done.length} z ${active.length} kroků hotovo`,
    ),
    el(
      'div',
      { className: 'recipe-card-actions' },
      el(
        'a',
        {
          href: url(`${recipe.id}.html#vareni`),
          className: 'kitchen-button primary',
          'aria-label': `${action}: ${recipe.title}`,
        },
        icon('kitchen'),
        action,
      ),
      el(
        'a',
        { href: url(`${recipe.id}.html#uvarit`), 'aria-label': `Celý postup: ${recipe.title}` },
        icon('list'),
        'Celý postup',
      ),
    ),
  );
}

/** Nabídne vybraná jídla k vaření. */
export function cookingSelection(recipes) {
  return el(
    'section',
    { id: 'cooking-selection', 'aria-labelledby': 'cooking-selection-heading' },
    el(
      'div',
      { className: 'section-heading' },
      el('h2', { id: 'cooking-selection-heading', tabIndex: -1 }, 'Co se bude vařit?'),
    ),
    el('p', { className: 'kitchen-muted' }, 'Vaření krok za krokem, nebo nejprve celý postup.'),
    recipes.length
      ? el('div', { className: 'cooking-selection-grid' }, recipes.map(cookingCard))
      : el(
          'div',
          { className: 'kitchen-empty' },
          icon('kitchen'),
          el('h3', {}, 'Nejdřív je potřeba vybrat něco dobrého'),
          chooseRecipesLink(),
        ),
  );
}
