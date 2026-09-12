import { startKitchen } from './kitchen.mjs';

const ariaLabels = {
  'Toggle navigation': 'Přepnout navigaci',
  Search: 'Hledat',
  Close: 'Zavřít',
  'Show table of contents': 'Zobrazit obsah',
  Previous: 'Předchozí',
  Next: 'Další',
};

function localizeAriaLabels(root) {
  for (const [source, translation] of Object.entries(ariaLabels)) {
    root
      .querySelectorAll(`[aria-label="${source}"]`)
      .forEach((element) => element.setAttribute('aria-label', translation));
  }
}

/** Poskytuje české popisky a spouštěcí chování veřejnému kontraktu šablony DocFX. */
const docfxOptions = {
  anchors: {
    ariaLabel: 'Odkaz na nadpis',
  },
  start() {
    localizeAriaLabels(document);
    startKitchen().catch(error => {
      console.error('Kuchařka:', error);
      const target = document.getElementById('kitchen-catalog') || document.getElementById('kitchen-planner');
      if (target) {
        const message = document.createElement('p');
        message.textContent = 'Výběr a nákup se nepodařilo načíst. Obnovte stránku nebo otevřete recepty.';
        const link = document.createElement('a');
        link.href = new URL('../index.html', import.meta.url).href;
        link.textContent = 'Prohlédnout recepty';
        target.replaceChildren(message, link);
        document.querySelector('.catalog-fallback')?.removeAttribute('hidden');
      }
    });

    const searchResults = document.getElementById('search-results');
    if (searchResults) {
      new MutationObserver(() => localizeAriaLabels(searchResults)).observe(searchResults, {
        childList: true,
        subtree: true,
      });
    }
  },
};

export default docfxOptions;
