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
