import { el } from '../dom.js';
import { announce, mountShell } from './shell.js';
import { base, catalog, openStore, save, url } from './store.js';

function showFailure(root) {
  if (root) {
    root.replaceChildren(
      el('p', {}, 'Výběr a nákup se nepodařilo načíst.'),
      el('p', {}, 'Pomůže obnovení stránky nebo otevření receptů.'),
      el('a', { href: url('kuchyne/index.html') }, 'Prohlédnout recepty'),
    );
    document.querySelector('.catalog-fallback')?.removeAttribute('hidden');
    return;
  }
  document
    .querySelector('article h1')
    ?.after(
      el(
        'div',
        { role: 'status' },
        el('p', {}, 'Nákup a vaření se nepodařilo načíst.'),
        el('p', {}, 'Recept lze číst níže nebo stránku obnovit.'),
      ),
    );
}

/** Přidá výběr, společný nákup a vaření k obsahu, který je čitelný i bez skriptů. */
export async function startKitchen() {
  const catalogRoot = document.getElementById('kitchen-catalog');
  const plannerRoot = document.getElementById('kitchen-planner');
  const page = decodeURI(location.pathname).slice(base.pathname.length);
  if (!catalogRoot && !plannerRoot && !/^(?:food|drink)\//.test(page)) return;
  try {
    const cookingReset = await openStore();
    mountShell();
    const recipe = catalog.recipes.find(({ id }) => page === `${id}.html`);
    if (catalogRoot) (await import('./catalog.js')).renderCatalog(catalogRoot);
    if (plannerRoot) (await import('./planner.js')).renderPlanner(plannerRoot);
    if (recipe) (await import('./recipe-page.js')).enhanceRecipe(recipe);
    if (cookingReset) {
      save();
      announce('Starší průběh vaření byl obnoven od začátku.');
    }
  } catch (error) {
    console.error('Kuchařka:', error);
    showFailure(catalogRoot ?? plannerRoot);
  }
}
