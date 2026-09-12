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
  for (const control of root.querySelectorAll('a[data-bs-toggle="dropdown"][title]:not([role])')) {
    control.setAttribute('role', 'button');
    control.setAttribute('aria-label', control.title);
    control.tabIndex = 0;
    control.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); }
    });
  }
}

/** Poskytuje české popisky a spouštěcí chování veřejnému kontraktu šablony DocFX. */
const docfxOptions = {
  anchors: {
    ariaLabel: 'Odkaz na nadpis',
  },
  start() {
    localizeAriaLabels(document);
    const main = document.querySelector('main');
    if (main) {
      main.id = 'main-content';
      main.tabIndex = -1;
      const skip = document.createElement('a');
      skip.href = '#main-content';
      skip.className = 'skip-to-content';
      skip.textContent = 'Přejít k obsahu';
      skip.addEventListener('click', event => { event.preventDefault(); main.focus(); });
      document.body.prepend(skip);
    }
    document.getElementById('logo')?.setAttribute('alt', '');
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

    for (const root of [document.getElementById('search-results'), document.querySelector('header')].filter(Boolean)) {
      new MutationObserver(() => localizeAriaLabels(root)).observe(root, {
        childList: true,
        subtree: true,
      });
    }
  },
};

export default docfxOptions;
