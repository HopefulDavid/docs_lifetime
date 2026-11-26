import { button, el, focusSection, preserveView } from '../dom.js';
import { labelIcon } from '../ui-icons.js';
import { originIcon, setPhase, storageNote, workflow } from './components.js';
import { openCooking } from './cooking.js';
import { cookingStatus } from './cooking-selection.js';
import { recipeSettings } from './core.js';
import { recipeEditor } from './editor.js';
import { openRecipePrint } from './print.js';
import { announce, updateTray } from './shell.js';
import { save, selected, state } from './store.js';

const cookingHash = '#vareni';

/** Vrátí prvky za nadpisem až po další nadpis některé z uvedených úrovní. */
function contentOf(heading, levels) {
  const nodes = [];
  for (
    let node = heading?.nextElementSibling;
    node && !levels.includes(node.tagName);
    node = node.nextElementSibling
  )
    nodes.push(node);
  return nodes;
}

const clones = (nodes) => nodes.map((node) => node.cloneNode(true));

/** Přesune uzly od prvního po poslední (bez něj) do nového rodiče. */
function moveRange(first, end, parent) {
  for (let node = first; node && node !== end;) {
    const next = node.nextSibling;
    parent.append(node);
    node = next;
  }
}

const contentsLinks = () => document.querySelectorAll('.affix a[href^="#"]');
const contentsItem = (heading) =>
  document.querySelector(`.affix a[href="#${heading.id}"]`)?.closest('li');

function hashTarget(hash) {
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

/** Doplní statický recept o nákup, přepínání částí a vaření. */
export function enhanceRecipe(recipe) {
  const article = document.querySelector('article');
  const sectionHeading = (title) =>
    [...article.querySelectorAll('h2')].find((node) => node.textContent.trim().startsWith(title));
  const ingredientsHeading = sectionHeading('Ingredience');
  const procedureHeading = article.querySelector('#postup');
  if (!ingredientsHeading) return;
  const stepHeadings = contentOf(procedureHeading, ['H1', 'H2']).filter(
    (node) => node.tagName === 'H3' && /^\d+\. /.test(node.textContent.trim()),
  );
  if (stepHeadings.length !== recipe.steps.length)
    throw new Error('Obsah receptu neodpovídá katalogu, proto je potřeba sestavit celý web znovu.');

  const stepContents = stepHeadings.map((heading) =>
    clones(contentOf(heading, ['H1', 'H2', 'H3'])),
  );
  const config = recipeSettings(recipe, state.selections[recipe.id]);

  function showTitle() {
    const title = article.querySelector('h1');
    title.replaceChildren(labelIcon(recipe.typeLabel, 'food'), ` ${recipe.title}`);
    title.after(
      el(
        'p',
        { className: 'recipe-provenance' },
        originIcon(recipe),
        recipe.origin,
        el('span', {}, ` · ${recipe.typeLabel}`),
      ),
    );
  }

  /** Statické tabulky nahradí editor. Zůstávají v dokumentu, jen se nezobrazují. */
  function hideSourceIngredients() {
    for (const node of contentOf(ingredientsHeading, ['H2']))
      node.classList.add('source-ingredients');
    for (const link of contentsLinks())
      if (hashTarget(link.getAttribute('href'))?.classList.contains('source-ingredients'))
        link.closest('li')?.remove();
  }

  /** Zvýrazní přípravu před surovinami a vrátí ji s pomůckami pro vaření a tisk. */
  function showPreparation() {
    const preparation = [];
    const heading = sectionHeading('Před přípravou');
    if (heading) {
      preparation.push(...contentOf(heading, ['H2']));
      ingredientsHeading.before(
        el('aside', { className: 'recipe-preparation' }, heading, preparation),
      );
      const item = contentsItem(heading);
      if (item) contentsItem(ingredientsHeading)?.before(item);
    }
    const equipment = sectionHeading('Pomůcky');
    if (equipment)
      preparation.push(el('h3', {}, 'Pomůcky'), ...clones(contentOf(equipment, ['H2'])));
    return preparation;
  }

  showTitle();
  hideSourceIngredients();
  const preparation = showPreparation();

  const editor = el('div', { className: 'kitchen-app' });
  const shoppingActions = el('div', { className: 'kitchen-app recipe-actions' });
  const cookingActions = el('div', { className: 'kitchen-app recipe-actions' });
  const shoppingPanel = el('section', {
    id: 'recipe-shopping',
    'aria-labelledby': ingredientsHeading.id,
    tabIndex: -1,
  });
  const cookingPanel = el('section', {
    id: 'uvarit',
    className: 'recipe-procedure',
    'aria-labelledby': procedureHeading.id,
    tabIndex: -1,
  });
  const navigation = workflow('shopping', { shopping: '#ingredience', cooking: '#uvarit' }, () =>
    syncView(),
  );

  ingredientsHeading.before(shoppingPanel);
  moveRange(ingredientsHeading, procedureHeading, shoppingPanel);
  procedureHeading.before(cookingPanel);
  moveRange(procedureHeading, null, cookingPanel);
  shoppingPanel.prepend(shoppingActions);
  cookingPanel.prepend(cookingActions);
  ingredientsHeading.after(editor);
  (article.querySelector('.recipe-preparation') ?? shoppingPanel).before(
    el(
      'section',
      { className: 'kitchen-app recipe-controls', 'aria-label': 'Nákup a vaření' },
      navigation,
      storageNote('recipe-storage'),
    ),
  );

  /** V obsahu stránky ponechá jen odkazy do právě zobrazené části. */
  function syncContents() {
    for (const link of contentsLinks()) {
      const target = hashTarget(link.getAttribute('href'));
      const item = link.closest('li');
      if (item && target)
        item.hidden = Boolean(
          target.classList.contains('source-ingredients') ||
          target.closest('#recipe-shopping[hidden], #uvarit[hidden]'),
        );
    }
  }

  function syncView(focus = false) {
    const target = hashTarget(location.hash);
    const cooking =
      location.hash === cookingHash || Boolean(target && cookingPanel.contains(target));
    shoppingPanel.hidden = cooking;
    cookingPanel.hidden = !cooking;
    setPhase(navigation, cooking ? 'cooking' : 'shopping');
    syncContents();
    updateTray();
    const ownHash = location.hash === '#uvarit' || location.hash === '#ingredience';
    if (focus) focusSection(ownHash ? navigation : (target ?? navigation));
  }

  const startCooking = () => openCooking(recipe, stepContents, config, preparation, repaint);
  const printButton = () =>
    button('PDF / tisk receptu', () => openRecipePrint(recipe, stepContents, config, preparation), {
      className: 'kitchen-button',
    });

  function changed() {
    if (selected(recipe)) state.selections[recipe.id] = structuredClone(config);
    save();
    preserveView(repaint);
  }

  function toggle() {
    if (selected(recipe)) delete state.selections[recipe.id];
    else state.selections[recipe.id] = structuredClone(config);
    save();
    preserveView(repaint);
    announce(selected(recipe) ? 'Recept je v nákupu.' : 'Recept byl odebrán.');
  }

  function repaint() {
    editor.replaceChildren(recipeEditor(recipe, config, changed, 'detail'));
    shoppingActions.replaceChildren(
      button(selected(recipe) ? 'V nákupu' : 'Přidat do nákupu', toggle, {
        id: 'detail-select',
        className: 'kitchen-button',
        'aria-pressed': String(selected(recipe)),
      }),
      printButton(),
    );
    cookingActions.replaceChildren(
      button(cookingStatus(recipe, config).action, startCooking, {
        className: 'kitchen-button primary',
        id: 'start-cooking',
      }),
      printButton(),
    );
    syncView();
  }

  repaint();
  const contents = document.querySelector('.affix');
  if (contents)
    new MutationObserver(syncContents).observe(contents, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    syncView(true);
    if (location.hash === cookingHash && !document.querySelector('.cooking-dialog')) startCooking();
  });
  if (location.hash === cookingHash) startCooking();
}
