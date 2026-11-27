import { button, el } from '../dom.js';
import { selectedIngredients, shoppingAmount, sourceNote } from './core.js';
import { quantityLabel } from './editor.js';
import { formatFactor } from './quantity.js';
import { catalog, isPrepared, state } from './store.js';

function openPrintPreview(sheet, description) {
  const opener = document.activeElement;
  const status = el(
    'div',
    { className: 'kitchen-muted', role: 'status' },
    el('p', {}, 'Připravuje se soubor PDF…'),
  );
  const download = el(
    'a',
    {
      className: 'kitchen-button primary',
      hidden: true,
      download: `${sheet
        .querySelector('h1')
        .textContent.normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}.pdf`,
    },
    'Stáhnout PDF',
  );
  const dialog = el(
    'dialog',
    { className: 'kitchen-app shopping-print-dialog', 'aria-labelledby': 'print-title' },
    el(
      'div',
      { className: 'print-controls' },
      el('p', {}, description),
      status,
      el(
        'div',
        { className: 'button-group' },
        download,
        button('Tisk', () => window.print(), { className: 'kitchen-button' }),
        button('Zavřít náhled', () => dialog.close(), { className: 'kitchen-button' }),
      ),
    ),
    el('div', { className: 'print-preview-scroll' }, sheet),
  );
  dialog.addEventListener('close', () => {
    dialog.remove();
    opener?.focus();
  });
  document.body.append(dialog);
  dialog.showModal();
  import('./pdf.js')
    .then((module) => module.createKitchenPdf(sheet))
    .then((href) => {
      download.href = href;
      download.hidden = false;
      status.textContent = 'PDF je připravené ke stažení a použití bez připojení.';
    })
    .catch(() => {
      status.replaceChildren(
        el('p', {}, 'PDF se nepodařilo připravit.'),
        el('p', {}, 'Pomůže nové otevření náhledu nebo Tisk → Uložit jako PDF.'),
      );
    });
}

/** Otevře náhled nákupu k uložení nebo tisku. */
export function openShoppingPrint(items, recipes) {
  const sheet = el(
    'div',
    { className: 'shopping-print-sheet' },
    el('h1', { id: 'print-title' }, 'Nákupní seznam'),
    el(
      'p',
      { className: 'print-recipes' },
      recipes
        .map((recipe) => `${recipe.title} (${formatFactor(state.selections[recipe.id].factor)})`)
        .join(' · '),
    ),
  );
  for (const category of catalog.departments) {
    const group = items.filter((item) => item.category === category);
    if (!group.length) continue;
    sheet.append(
      el(
        'section',
        { className: 'print-department' },
        el('h2', {}, category),
        group.map((item) =>
          el(
            'div',
            { className: 'print-item' },
            el(
              'p',
              {},
              isPrepared(item) ? '☑ ' : '☐ ',
              el('strong', {}, item.name),
              ` — ${shoppingAmount(item, state.amounts)}`,
            ),
            el('small', {}, item.sources.map(sourceNote).join(' · ')),
          ),
        ),
      ),
    );
  }
  openPrintPreview(sheet, 'Celý nákup včetně hotových položek a původních množství.');
}

/** Otevře náhled receptu v nastavené dávce k uložení nebo tisku. */
export function openRecipePrint(recipe, contents, config, preparation) {
  const sheet = el(
    'div',
    { className: 'shopping-print-sheet recipe-print-sheet' },
    el('h1', { id: 'print-title' }, recipe.title),
    el('p', {}, recipe.description),
    el('p', {}, `${formatFactor(config.factor)} původní dávka · počet porcí zdroj neuvádí`),
    preparation.length
      ? el(
          'section',
          {},
          el('h2', {}, 'Před přípravou'),
          preparation.map((node) => node.cloneNode(true)),
        )
      : null,
    el('h2', {}, 'Suroviny'),
  );
  const ingredients = selectedIngredients(recipe, config);
  for (const group of recipe.groups) {
    const included = ingredients.filter((item) => item.group === group.id);
    if (!included.length) continue;
    sheet.append(
      el('h3', {}, group.title),
      el(
        'ul',
        {},
        included.map((item) =>
          el(
            'li',
            {},
            el('strong', {}, item.name),
            ` — ${quantityLabel(item, config.factor)}${item.note ? ` · ${item.note}` : ''}`,
          ),
        ),
      ),
    );
  }
  sheet.append(el('h2', {}, 'Postup'));
  if (config.factor !== 1)
    sheet.append(
      el('p', {}, 'Množství uvedená přímo v textu postupu, časy a teploty zůstávají původní.'),
    );
  recipe.steps.forEach((step, index) => {
    if (step.optionalGroup && !config.enabled[step.optionalGroup]) return;
    sheet.append(
      el(
        'section',
        { className: 'print-step' },
        el('h3', {}, `${index + 1}. ${step.title}`),
        contents[index].map((node) => node.cloneNode(true)),
      ),
    );
  });
  openPrintPreview(sheet, 'Recept obsahuje právě zvolenou dávku, suroviny a přílohy.');
}
