import { button, el } from '../dom.js';
import { icon } from '../ui-icons.js';
import { batchFactors, buildShoppingList } from './core.js';
import { formatFactor, formatQuantity, parseQuantity, scaleQuantity } from './quantity.js';
import { announce } from './shell.js';
import { catalog, isPrepared, onSave, selected, state } from './store.js';

// Stejná surovina může být na stránce vícekrát, uložená změna se proto promítne do všech řádků.
onSave(() => {
  for (const control of document.querySelectorAll('.ingredient-prepared')) {
    const { shoppingKey, shoppingSignature } = control.dataset;
    control.checked = state.checked[shoppingKey] === shoppingSignature;
    control.closest('.ingredient-row').classList.toggle('is-prepared', control.checked);
  }
});

/** Zobrazí množství v dávce, nečíselný údaj ponechá podle receptu. */
export function quantityLabel({ quantity }, factor) {
  const parsed = parseQuantity(quantity);
  if (parsed) return formatQuantity(scaleQuantity(parsed, factor));
  return quantity === 'neuvedeno' ? 'Množství neuvedeno' : quantity;
}

/** Řádek suroviny s připraveností, výběrem varianty a vynecháním volitelné položky. */
function ingredientRow({ recipe, item, config, groupOn, planned, changed, idPrefix }) {
  const enabled = groupOn && (!item.optional || config.enabled[item.id]);
  const option = item.options[config.choices[item.id]];
  const ready = Boolean(planned && isPrepared(planned));
  const row = el('div', {
    className: `ingredient-row has-prepared-check${enabled ? '' : ' is-omitted'}${ready ? ' is-prepared' : ''}`,
  });
  const prepared = el('input', {
    type: 'checkbox',
    id: `${idPrefix}-${item.id}-prepared`,
    className: 'ingredient-prepared',
    checked: ready,
    disabled: !enabled,
    'aria-label': `Mám připraveno: ${option.name}`,
    'data-shopping-key': planned?.key || '',
    'data-shopping-signature': planned?.signature || '',
    onChange: (event) => {
      const added = !selected(recipe);
      state.selections[recipe.id] = structuredClone(config);
      if (event.target.checked) state.checked[planned.key] = planned.signature;
      else delete state.checked[planned.key];
      changed();
      announce(
        `${option.name}: ${event.target.checked ? 'připraveno' : 'zbývá připravit'}${added ? `, recept ${recipe.title} byl přidán do nákupu` : ''}.`,
      );
    },
  });
  const content = el(
    'div',
    { className: 'ingredient-content' },
    el(
      'label',
      { htmlFor: prepared.id, className: 'ingredient-name' },
      el('strong', {}, option.name),
    ),
  );
  if (item.options.length > 1) {
    content.append(
      el(
        'label',
        {},
        el('span', { className: 'kitchen-muted choice-caption' }, 'Jedna z možností'),
        el(
          'select',
          {
            id: `${idPrefix}-${item.id}-choice`,
            'aria-label': `Varianta: ${item.options.map((option) => option.name).join(' nebo ')}`,
            disabled: !enabled,
            onChange: (event) => {
              config.choices[item.id] = Number(event.target.value);
              changed();
            },
          },
          item.options.map((option, index) =>
            el(
              'option',
              { value: String(index), selected: config.choices[item.id] === index },
              option.name,
            ),
          ),
        ),
      ),
    );
  }
  const note = item.note.replace(/(?:^|[;,]\s*)volitelné(?:[;,]\s*|$)/, '').trim();
  if (note) content.append(el('small', {}, note));
  if (planned && planned.sources.length > 1)
    content.append(
      el(
        'small',
        { className: 'ingredient-shared' },
        `V celém nákupu se potvrzuje ${planned.amount} ze všech použití této suroviny.`,
      ),
    );
  if (item.optional)
    content.append(
      button(
        config.enabled[item.id] ? 'Vynechat' : 'Zahrnout',
        () => {
          config.enabled[item.id] = !config.enabled[item.id];
          changed();
        },
        {
          id: `${idPrefix}-${item.id}`,
          className: 'ingredient-inclusion kitchen-button',
          disabled: !groupOn,
          'aria-pressed': String(Boolean(config.enabled[item.id])),
          'aria-label': `${config.enabled[item.id] ? 'Vynechat' : 'Zahrnout'} volitelnou surovinu: ${option.name}`,
        },
      ),
      el('small', { className: 'ingredient-optional' }, 'Volitelné'),
    );
  row.append(
    prepared,
    content,
    el(
      'span',
      {
        className: `ingredient-amount${item.quantity === 'neuvedeno' ? ' amount-unknown' : ''}`,
      },
      enabled ? quantityLabel(item, config.factor) : 'Nezahrnuto',
    ),
  );
  return row;
}

/** Nabídne dávku, varianty, volitelné části a připravenost surovin jednoho receptu. */
export function recipeEditor(recipe, config, changed, idPrefix) {
  const plannedItems = new Map(
    buildShoppingList(
      catalog.recipes,
      { ...state.selections, [recipe.id]: config },
      catalog.departments,
    ).map((item) => [item.key, item]),
  );
  /** Položka společného nákupu, do které surovina přispívá. */
  const plannedItem = (item) => {
    const [contribution] = buildShoppingList(
      [{ ...recipe, ingredients: [item] }],
      { [recipe.id]: config },
      catalog.departments,
    );
    return plannedItems.get(contribution?.key);
  };
  const factor = el(
    'select',
    {
      id: `${idPrefix}-factor`,
      value: String(config.factor),
      onChange: (event) => {
        config.factor = Number(event.target.value);
        changed();
      },
    },
    batchFactors.map((value) =>
      el(
        'option',
        { value: String(value), selected: config.factor === value },
        `${formatFactor(value)} původní dávka`,
      ),
    ),
  );
  const editor = el(
    'div',
    { className: 'recipe-editor' },
    el('label', { className: 'factor-label', htmlFor: factor.id }, 'Kolik připravit', factor),
    el(
      'p',
      { className: 'kitchen-muted' },
      'Protože zdroj neuvádí počet porcí, násobí se pouze uvedená množství.',
    ),
  );
  editor.append(
    el(
      'p',
      { className: 'ingredient-check-help' },
      icon('check'),
      'Zaškrtnutí označí, co už je doma nebo připravené.',
    ),
  );
  if (!selected(recipe))
    editor.append(
      el('p', { className: 'kitchen-muted' }, 'První zaškrtnutí přidá tento recept do nákupu.'),
    );
  for (const group of recipe.groups) {
    const groupOn = !group.optional || config.enabled[group.id];
    const groupBox = el('fieldset', {
      className: `ingredient-group${groupOn ? '' : ' is-omitted'}`,
    });
    const legend = el('legend', {}, group.title);
    if (group.optional)
      legend.replaceChildren(
        el(
          'label',
          { className: 'check-label' },
          el('input', {
            type: 'checkbox',
            id: `${idPrefix}-${group.id}`,
            checked: groupOn,
            onChange: (event) => {
              config.enabled[group.id] = event.target.checked;
              changed();
            },
          }),
          `Zahrnout: ${group.title} · volitelné`,
        ),
      );
    groupBox.append(legend);
    groupBox.append(
      ...recipe.ingredients
        .filter((item) => item.group === group.id)
        .map((item) =>
          ingredientRow({
            recipe,
            item,
            config,
            groupOn,
            planned: plannedItem(item),
            changed,
            idPrefix,
          }),
        ),
    );
    editor.append(groupBox);
  }
  return editor;
}
