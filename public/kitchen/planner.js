import { button, el, focusSection, preserveView } from '../dom.js';
import { icon } from '../ui-icons.js';
import { chooseRecipesLink, setPhase, storageNote, workflow } from './components.js';
import { cookingSelection } from './cooking-selection.js';
import { recipeEditor } from './editor.js';
import { formatFactor } from './quantity.js';
import { openShoppingExport, openShoppingImport } from './share.js';
import { announce, setPageTray, updateTray } from './shell.js';
import { clearFilters, createFilters, shoppingList } from './shopping-list.js';
import { isPrepared, save, selectedRecipes, shoppingItems, state, url } from './store.js';

const sharedLink = '#nakup=';

/** Zobrazí společný nákup. Kotva přepíná výběr jídel, nakupování a výběr k vaření. */
export function renderPlanner(root) {
  root.className = 'kitchen-app';
  document.body.classList.add('kitchen-shopping-page');
  const filters = createFilters();
  let undoState;
  let navigation;

  const isCooking = () => location.hash === '#uvarit';
  const isShopping = () => location.hash === '#nakupovat' && selectedRecipes().length > 0;

  function syncViews(focus = false) {
    document.body.classList.toggle('kitchen-shopping-mode', isShopping());
    document.body.classList.toggle('kitchen-cooking-view', isCooking());
    root.querySelector('#shopping-view').hidden = isCooking();
    root.querySelector('#cooking-selection').hidden = !isCooking();
    setPhase(navigation, isCooking() ? 'cooking' : 'shopping');
    updateTray();
    if (focus) focusSection(isShopping() ? root.querySelector('#shopping-heading') : navigation);
  }

  function openView(hash) {
    location.hash = hash;
    syncViews(true);
  }

  function tray() {
    if (!selectedRecipes().length) return null;
    if (isCooking())
      return [
        el('span', {}, 'Jídla připravená k vaření'),
        el('a', { href: '#nakup', className: 'kitchen-button' }, icon('basket'), 'Zpět k nákupu'),
      ];
    const items = shoppingItems();
    if (!isShopping())
      return [
        el('span', {}, `${items.length} položek v seznamu`),
        button('Začít nakupovat', () => openView('nakupovat'), {
          className: 'kitchen-button primary',
        }),
      ];
    const remaining = items.filter((item) => !isPrepared(item)).length;
    return [
      el('span', {}, el('strong', {}, String(remaining)), ' položek zbývá'),
      button('Filtr', () => focusSection(document.getElementById('shopping-filter')), {
        className: 'kitchen-button',
      }),
      button('Jídla', () => openView('nakup'), {
        className: 'kitchen-button',
        'aria-label': 'Jídla: upravit výběr',
      }),
      el('a', { href: '#uvarit', className: 'kitchen-button primary' }, icon('kitchen'), 'Uvařit'),
    ];
  }

  const rememberState = () => {
    undoState = structuredClone(state);
  };

  function restoreUndo() {
    const { selections, checked, amounts } = undoState;
    Object.assign(state, { selections, checked, amounts });
    undoState = null;
    save();
    render();
    focusSection(root.querySelector('#selected-heading'));
    announce('Původní výběr obnoven.');
  }

  function applyImported(imported) {
    rememberState();
    Object.assign(state, imported);
    clearFilters(filters);
    save();
    render();
  }

  function removeRecipe(recipe) {
    rememberState();
    delete state.selections[recipe.id];
    save();
    preserveView(render);
    focusSection(root.querySelector('#selected-heading') ?? root.querySelector('.kitchen-empty a'));
    announce(`${recipe.title}: odebráno, změnu lze vrátit.`);
  }

  function startNew() {
    rememberState();
    Object.assign(state, { selections: {}, checked: {}, amounts: {} });
    save();
    render();
    root.querySelector('.kitchen-empty a')?.focus();
    announce('Nákup je vymazaný, ale lze jej vrátit.');
  }

  function sharing(recipes) {
    return el(
      'section',
      { className: 'shopping-sharing', 'aria-label': 'Sdílení nákupu' },
      el(
        'div',
        {},
        el('strong', {}, 'Nakupuje se společně?'),
        el(
          'p',
          { className: 'kitchen-muted' },
          'Aktuální nákup včetně hotových položek lze poslat druhému člověku.',
        ),
      ),
      el(
        'div',
        { className: 'button-group' },
        button('Export nákupu', openShoppingExport, {
          id: 'export-shopping',
          className: 'kitchen-button',
          disabled: !recipes.length,
        }),
        button('Import nákupu', () => openShoppingImport(applyImported), {
          id: 'import-shopping',
          className: 'kitchen-button',
        }),
      ),
    );
  }

  function selectedRecipe(recipe) {
    const id = `selection-${recipe.id.replaceAll('/', '-')}`;
    const settings = state.selections[recipe.id];
    const changed = () => {
      save();
      preserveView(render);
    };
    return el(
      'div',
      { className: 'selected-recipe-card' },
      el(
        'div',
        { className: 'selected-recipe-title' },
        el('h3', {}, el('a', { href: url(`${recipe.id}.html#ingredience`) }, recipe.title)),
      ),
      el(
        'details',
        { className: 'selected-recipe', id },
        el('summary', {}, `${formatFactor(settings.factor)} dávka · upravit suroviny`),
        recipeEditor(recipe, settings, changed, id),
        el(
          'div',
          { className: 'selected-actions' },
          button('Odebrat z nákupu', () => removeRecipe(recipe), { className: 'kitchen-button' }),
        ),
      ),
    );
  }

  const undoButton = (text) =>
    undoState ? button(text, restoreUndo, { className: 'kitchen-button' }) : null;

  function emptyShopping() {
    return [
      el(
        'div',
        { className: 'kitchen-empty' },
        el('div', { className: 'empty-symbol' }, icon('basket')),
        el('h2', {}, 'Co bude dobrého?'),
        el('p', {}, 'Suroviny z několika vybraných jídel se spojí do jednoho nákupního seznamu.'),
        chooseRecipesLink(),
      ),
      undoButton('Vrátit vymazaný výběr'),
    ];
  }

  function filledShopping(recipes) {
    return [
      el(
        'section',
        { className: 'selected-recipes', 'aria-label': 'Vybraná jídla' },
        el(
          'div',
          { className: 'section-heading' },
          el('h2', { id: 'selected-heading', tabIndex: -1 }, `Vybraná jídla (${recipes.length})`),
          el('a', { href: url('kuchyne/index.html#recepty') }, '+ Přidat další'),
        ),
        recipes.map(selectedRecipe),
      ),
      ...shoppingList(shoppingItems(), recipes, filters),
      el(
        'div',
        { className: 'plan-footer' },
        storageNote(),
        el(
          'p',
          { className: 'kitchen-muted' },
          'Bez připojení poslouží stažený nebo vytištěný seznam.',
        ),
        button('Začít nový nákup', startNew, { className: 'kitchen-button' }),
      ),
      undoButton('Vrátit poslední změnu'),
    ];
  }

  function render() {
    const recipes = selectedRecipes();
    navigation = workflow('shopping', { shopping: '#nakup', cooking: '#uvarit' }, syncViews);
    root.replaceChildren(
      navigation,
      el(
        'section',
        { id: 'shopping-view', 'aria-label': 'Nákup' },
        sharing(recipes),
        recipes.length ? filledShopping(recipes) : emptyShopping(),
      ),
      cookingSelection(recipes),
    );
    syncViews();
  }

  /** Kód z odkazu se po převzetí z adresy odstraní, aby jej obnovení stránky nenačetlo znovu. */
  function importFromLink() {
    const code = location.hash.slice(sharedLink.length);
    const address = new URL(location.href);
    address.hash = '';
    history.replaceState(null, '', address);
    document.querySelector('.shopping-transfer-dialog')?.close();
    openShoppingImport(applyImported, code);
  }

  render();
  setPageTray(tray);
  if (location.hash.startsWith(sharedLink)) importFromLink();
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith(sharedLink)) importFromLink();
    else syncViews(true);
  });
}
