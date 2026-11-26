import { button, el } from '../dom.js';
import { formatFactor, plural } from './quantity.js';
import { announce } from './shell.js';
import { base, catalog, state } from './store.js';
import { exportShopping, importShopping, previewShoppingImport } from './transfer.js';

function transferDialog(title) {
  const opener = document.activeElement;
  const body = el('div', { className: 'transfer-body' });
  const footer = el('footer', { className: 'transfer-footer button-group' });
  const dialog = el(
    'dialog',
    { className: 'kitchen-app shopping-transfer-dialog', 'aria-labelledby': 'transfer-title' },
    el(
      'header',
      { className: 'transfer-header' },
      el('h2', { id: 'transfer-title' }, title),
      button('Zavřít', () => dialog.close(), {
        className: 'kitchen-button',
        'aria-label': `Zavřít: ${title}`,
      }),
    ),
    body,
    footer,
  );
  dialog.addEventListener('close', () => {
    dialog.remove();
    (opener?.isConnected ? opener : document.getElementById('import-shopping'))?.focus({
      preventScroll: true,
    });
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, body, footer };
}

/** Připraví odkaz s kopií nákupu. */
export async function openShoppingExport() {
  const { dialog, body, footer } = transferDialog('Export nákupu');
  const status = el(
    'p',
    { role: 'status', className: 'kitchen-muted' },
    'Připravuji nákup ke sdílení…',
  );
  body.append(
    el(
      'div',
      { className: 'transfer-intro' },
      el('p', {}, 'Příjemce otevře odkaz a zvolí sloučení nebo převzetí nákupu.'),
      el('p', {}, 'Přenesou se vybraná jídla, jejich nastavení a hotové položky.'),
    ),
    status,
  );
  try {
    const code = await exportShopping(state, catalog);
    if (!dialog.isConnected) return;
    const address = new URL('nakup.html', base);
    address.hash = `nakup=${code}`;
    const field = el('textarea', {
      id: 'shopping-share-link',
      readOnly: true,
      rows: 4,
      value: address.href,
      spellcheck: false,
    });
    body.append(
      el('label', { htmlFor: field.id }, 'Odkaz k odeslání', field),
      el(
        'aside',
        { className: 'transfer-notes kitchen-muted', 'aria-label': 'Jak odkaz funguje' },
        el('p', {}, 'Odkaz je kopie nákupu v okamžiku odeslání.'),
        el('p', {}, 'Po změně nákupu je potřeba poslat nový odkaz.'),
        el('p', {}, 'Každý, kdo má odkaz, může nákup otevřít.'),
        el('p', {}, 'Odkaz se posílá celý, nejlépe přes chat, protože SMS jej může rozdělit.'),
      ),
    );
    status.textContent = 'Připravený odkaz patří do zprávy, případně poslouží sdílení telefonu.';
    footer.append(
      button(
        'Kopírovat odkaz',
        async () => {
          try {
            await navigator.clipboard.writeText(field.value);
            status.textContent = 'Zkopírovaný odkaz stačí vložit do zprávy příjemci.';
          } catch {
            field.focus();
            field.select();
            status.textContent =
              'Označený odkaz je potřeba zkopírovat ručně, protože prohlížeč automatické kopírování nepovolil.';
          }
        },
        { className: 'kitchen-button primary' },
      ),
    );
    if (typeof navigator.share === 'function')
      footer.append(
        button(
          'Sdílet…',
          async () => {
            try {
              await navigator.share({ title: 'Společný nákup', url: field.value });
              status.textContent = 'Odkaz byl předán sdílení zařízení.';
            } catch (error) {
              status.textContent =
                error.name === 'AbortError'
                  ? 'Sdílení je zrušené, ale připravený odkaz lze použít později.'
                  : 'Když sdílení není dostupné, odkaz se zkopíruje.';
            }
          },
          { className: 'kitchen-button' },
        ),
      );
  } catch (error) {
    status.textContent = error.message;
  }
}

function settingsDescription(recipe, settings) {
  return [
    `${formatFactor(settings.factor)} dávka`,
    ...recipe.ingredients
      .filter((item) => item.options.length > 1)
      .map((item) => item.options[settings.choices[item.id]].name),
    ...[...recipe.groups, ...recipe.ingredients]
      .filter((item) => item.optional)
      .map(
        (item) =>
          `${settings.enabled[item.id] ? 's' : 'bez'}: ${item.title || item.options.map((option) => option.name).join(' nebo ')}`,
      ),
  ].join(' · ');
}

/** Načte sdílený nákup, ukáže jeho náhled a po potvrzení předá výsledný stav. */
export function openShoppingImport(onApply, initial = '') {
  const { dialog, body, footer } = transferDialog('Import nákupu');
  const field = el('textarea', {
    id: 'shopping-import-code',
    rows: 4,
    value: initial,
    spellcheck: false,
    placeholder: 'Odkaz nebo kód od druhého člověka…',
  });
  const status = el('p', { role: 'status', className: 'transfer-status' });
  const preview = el('div', { className: 'transfer-preview' });
  let incoming;
  let mode = 'merge';
  let resolutions = {};
  let plan;
  let attempt = 0;
  const apply = button(
    'Sloučit nákupy',
    () => {
      plan = previewShoppingImport(state, incoming, catalog, mode, resolutions);
      if (!plan.ready) {
        renderPreview();
        return;
      }
      onApply(plan.state);
      dialog.close();
      announce(
        mode === 'merge'
          ? 'Nákupy jsou sloučené, změnu lze vrátit.'
          : 'Importovaný nákup je převzatý, změnu lze vrátit.',
      );
    },
    { disabled: true, className: 'kitchen-button primary' },
  );

  function renderPreview() {
    if (!incoming) return;
    plan = previewShoppingImport(state, incoming, catalog, mode, resolutions);
    const { summary } = plan;
    apply.disabled = !plan.ready;
    apply.textContent = mode === 'merge' ? 'Sloučit nákupy' : 'Převzít celý nákup';
    preview.replaceChildren(
      el(
        'fieldset',
        { className: 'transfer-mode' },
        el('legend', {}, 'Jak nákup použít'),
        ...[
          [
            'merge',
            'Sloučit s mým nákupem',
            [
              'Zachová vlastní jídla a přidá chybějící.',
              'U stejného seznamu spojí hotové položky od obou lidí.',
            ],
          ],
          [
            'replace',
            'Převzít celý nákup',
            ['Nahradí vlastní výběr a hotové položky importovaným stavem.'],
          ],
        ].map(([value, label, descriptions]) =>
          el(
            'label',
            {},
            el('input', {
              type: 'radio',
              name: 'shopping-import-mode',
              value,
              checked: mode === value,
              onChange: () => {
                mode = value;
                renderPreview();
                preview.querySelector(`input[value="${value}"]`)?.focus({ preventScroll: true });
              },
            }),
            el(
              'span',
              {},
              el('strong', {}, label),
              descriptions.map((description) =>
                el('span', { className: 'transfer-mode-description' }, description),
              ),
            ),
          ),
        ),
      ),
      el(
        'p',
        { className: 'transfer-summary', role: 'status' },
        `Výsledný nákup · recepty: ${summary.recipes} · položky: ${summary.items} · hotovo: ${summary.checked}`,
      ),
    );
    if (summary.recheck)
      preview.append(
        el(
          'p',
          { className: 'shopping-hint' },
          `${summary.recheck} ${plural(summary.recheck, 'položka vyžaduje', 'položky vyžadují', 'položek vyžaduje')} novou kontrolu, protože se změnilo množství nebo složení nákupu.`,
        ),
      );
    const imported = catalog.recipes.filter((recipe) =>
      Object.hasOwn(incoming.selections, recipe.id),
    );
    preview.append(
      el(
        'details',
        {},
        el('summary', {}, `Jídla v importu (${imported.length})`),
        el(
          'ul',
          {},
          imported.map((recipe) =>
            el(
              'li',
              {},
              `${recipe.title} · ${formatFactor(incoming.selections[recipe.id].factor)} dávka`,
            ),
          ),
        ),
      ),
    );
    for (const [index, conflict] of plan.conflicts.entries()) {
      preview.append(
        el(
          'fieldset',
          { className: 'transfer-conflict' },
          el(
            'legend',
            {},
            conflict.kind === 'recipe'
              ? `Odlišné nastavení: ${conflict.recipe.title}`
              : `Odlišné množství: ${conflict.name}`,
          ),
          ...[
            ['local', 'Můj nákup'],
            ['incoming', 'Importovaný nákup'],
          ].map(([side, label]) =>
            el(
              'label',
              {},
              el('input', {
                type: 'radio',
                name: `transfer-conflict-${index}`,
                id: `transfer-conflict-${index}-${side}`,
                checked: resolutions[conflict.key] === side,
                onChange: () => {
                  resolutions[conflict.key] = side;
                  renderPreview();
                  document
                    .getElementById(`transfer-conflict-${index}-${side}`)
                    ?.focus({ preventScroll: true });
                },
              }),
              el(
                'span',
                {},
                el('strong', {}, label),
                el(
                  'small',
                  {},
                  conflict.kind === 'recipe'
                    ? settingsDescription(conflict.recipe, conflict[side])
                    : conflict[side],
                ),
              ),
            ),
          ),
        ),
      );
    }
    status.textContent = plan.ready
      ? 'Po kontrole náhledu změnu potvrdí tlačítko dole.'
      : 'U každého rozdílu se vybere hodnota, která se má použít.';
  }

  async function load() {
    const currentAttempt = ++attempt;
    apply.disabled = true;
    loadButton.disabled = true;
    incoming = null;
    plan = null;
    preview.replaceChildren();
    status.textContent = 'Kontroluji nákup…';
    try {
      const decoded = await importShopping(field.value, catalog);
      if (!dialog.isConnected || currentAttempt !== attempt) return;
      incoming = decoded;
      resolutions = {};
      sourceBox.open = false;
      sourceTitle.textContent = 'Změnit vložený odkaz';
      renderPreview();
      preview.querySelector('input')?.focus();
    } catch (error) {
      if (currentAttempt === attempt) status.textContent = error.message;
    } finally {
      if (currentAttempt === attempt) loadButton.disabled = false;
    }
  }
  const loadButton = button('Načíst nákup', load, { className: 'kitchen-button' });
  const sourceTitle = el('summary', {}, 'Odkaz k importu');
  const sourceBox = el(
    'details',
    { className: 'transfer-source', open: true },
    sourceTitle,
    el('p', {}, 'Patří sem celý odkaz nebo kód od druhého člověka.'),
    el('p', {}, 'Nejprve se zobrazí náhled, vlastní nákup se změní až po potvrzení.'),
    el('label', { htmlFor: field.id }, 'Odkaz nebo kód nákupu', field),
    loadButton,
  );
  field.addEventListener('input', () => {
    attempt++;
    incoming = null;
    plan = null;
    apply.disabled = true;
    loadButton.disabled = false;
    preview.replaceChildren();
    status.textContent = '';
  });
  body.append(sourceBox, status, preview);
  footer.append(
    apply,
    button('Zrušit', () => dialog.close(), { className: 'kitchen-button' }),
  );
  field.focus();
  if (initial) load();
}
