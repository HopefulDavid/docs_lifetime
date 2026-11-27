import { button, el, preserveView } from '../dom.js';
import { icon } from '../ui-icons.js';
import { storageNote } from './components.js';
import { cookingProgress } from './core.js';
import { recipeEditor } from './editor.js';
import { formatFactor } from './quantity.js';
import { announce } from './shell.js';
import { save, selected, state } from './store.js';

/** Otevře vaření krok za krokem a průběh průběžně ukládá. */
export function openCooking(recipe, contents, config, preparation, closed) {
  const cooking = (state.cooking[recipe.id] ||= { revision: recipe.revision, step: 0, done: [] });
  const dialog = el('dialog', {
    className: 'kitchen-app cooking-dialog',
    'aria-labelledby': 'cook-recipe',
  });
  let showCompletion = cookingProgress(recipe, config, cooking).complete;

  const focusStep = () => {
    const title = dialog.querySelector('#cook-title');
    title.focus({ preventScroll: true });
    // Při přechodu začíná posouvaný obsah aktuálním krokem i na nízkém displeji.
    dialog.querySelector('.cook-scroll').scrollTop = 0;
  };
  const move = (index) => {
    cooking.step = index;
    showCompletion = false;
    save();
    render();
    focusStep();
  };
  const render = () => {
    const progress = cookingProgress(recipe, config, cooking);
    const step = recipe.steps[cooking.step];
    const omitted = !progress.active.includes(cooking.step);
    const done = progress.done.includes(cooking.step);
    const previous = progress.active.filter((index) => index < cooking.step).at(-1);
    const next = progress.active.find((index) => index > cooking.step);
    const completed = showCompletion && progress.complete;

    const overview = el(
      'details',
      { className: 'cook-support', id: 'cook-overview' },
      el('summary', {}, icon('list'), 'Přehled kroků'),
      el(
        'ol',
        { className: 'cook-step-list' },
        recipe.steps.map((item, index) => {
          const excluded = !progress.active.includes(index);
          const finished = progress.done.includes(index);
          const control = button(item.title, () => move(index), {
            className: 'cook-step-link',
            ...(index === cooking.step && !completed ? { 'aria-current': 'step' } : {}),
          });
          control.prepend(
            el(
              'span',
              { className: 'cook-step-number', 'aria-hidden': true },
              finished ? icon('check') : String(index + 1),
            ),
          );
          control.append(
            el(
              'span',
              { className: 'cook-step-state' },
              excluded
                ? 'Vynecháno'
                : finished
                  ? 'Hotovo'
                  : index === cooking.step && !completed
                    ? 'Právě se vaří'
                    : 'Čeká',
            ),
          );
          return el('li', {}, control);
        }),
      ),
    );
    const ingredients = el(
      'details',
      { className: 'cook-support', id: 'cook-ingredients' },
      el('summary', {}, icon('carrot'), 'Suroviny a zvolené varianty'),
      recipeEditor(
        recipe,
        config,
        () => {
          if (selected(recipe)) state.selections[recipe.id] = structuredClone(config);
          save();
          preserveView(render);
        },
        'cook',
      ),
    );
    const options = el(
      'details',
      { className: 'cook-support', id: 'cook-options' },
      el('summary', {}, icon('info'), 'Uložení a možnosti'),
      storageNote(),
      button(
        'Začít postup znovu',
        () => {
          cooking.done = [];
          move(progress.active[0]);
        },
        { className: 'kitchen-button' },
      ),
    );
    const body = el('div', {
      className: 'cook-scroll',
      id: 'cook-scroll',
      'data-preserve-scroll': '',
    });
    if (completed) {
      body.append(
        el(
          'div',
          { className: 'cook-success', role: 'status' },
          icon('check-circle'),
          el('h2', { id: 'cook-title', tabIndex: -1 }, 'Dobrou chuť!'),
          el('p', {}, 'Všechny kroky máte hotové.'),
          button('Prohlédnout hotové kroky', () => move(progress.active[0]), {
            className: 'kitchen-button',
          }),
        ),
      );
    } else {
      body.append(
        el(
          'div',
          { className: 'cook-step-heading' },
          el(
            'p',
            { className: 'eyebrow' },
            omitted
              ? 'Volitelná příloha'
              : `Krok ${progress.active.indexOf(cooking.step) + 1} z ${progress.active.length}`,
          ),
          el('h2', { id: 'cook-title', tabIndex: -1 }, step.title),
        ),
      );
      if (done)
        body.append(
          el(
            'div',
            { className: 'cook-finished' },
            el('span', {}, icon('check-circle'), 'Tento krok je hotový'),
            button(
              'Vrátit mezi nedokončené',
              () => {
                cooking.done = cooking.done.filter((index) => index !== cooking.step);
                save();
                render();
                focusStep();
              },
              { className: 'cook-text-button' },
            ),
          ),
        );
      if (config.factor !== 1)
        body.append(
          el(
            'p',
            { className: 'shopping-hint' },
            `${formatFactor(config.factor)} dávka: suroviny jsou přepočítané, ale údaje v textu, časy a teploty zůstávají původní.`,
          ),
        );
      if (omitted)
        body.append(
          el(
            'p',
            { className: 'shopping-hint' },
            'Příloha není vybraná a pro dokončení ji není potřeba připravovat.',
          ),
        );
      if (preparation.length)
        body.append(
          el(
            'details',
            { className: 'cook-preparation', id: 'cook-preparation' },
            el('summary', {}, icon('clock'), 'Před přípravou'),
            preparation.map((node) => node.cloneNode(true)),
          ),
        );
      body.append(
        el(
          'div',
          { className: 'cook-content' },
          contents[cooking.step].map((node) => node.cloneNode(true)),
        ),
      );
    }
    body.append(el('div', { className: 'cook-tools' }, ingredients, overview, options));

    let actionLabel = omitted ? 'Přeskočit přílohu' : done ? 'Další krok' : 'Hotovo, pokračovat';
    if (completed) actionLabel = 'Zavřít vaření';
    else if (progress.complete) actionLabel = 'Zobrazit dokončení';
    else if (next === undefined)
      actionLabel = done || omitted ? 'K nedokončenému kroku' : 'Dokončit krok';
    const advance = () => {
      if (completed) {
        dialog.close();
        return;
      }
      if (!omitted && !done) cooking.done.push(cooking.step);
      const updated = cookingProgress(recipe, config, cooking);
      if (updated.complete) {
        showCompletion = true;
        save();
        render();
        focusStep();
        return;
      }
      if (next !== undefined) {
        move(next);
        return;
      }
      announce('Pokračuje se nedokončeným krokem.');
      move(updated.active.find((index) => !updated.done.includes(index)));
    };
    const primary = button(actionLabel, advance, { className: 'kitchen-button primary' });
    primary.append(icon(completed ? 'check' : 'arrow-right'));
    const back = button('Předchozí', () => move(previous), {
      disabled: previous === undefined,
      className: 'kitchen-button',
    });
    back.prepend(icon('arrow-left'));
    dialog.replaceChildren(
      el(
        'header',
        { className: 'cook-header' },
        el(
          'div',
          { className: 'cook-top' },
          el(
            'div',
            {},
            el('p', { className: 'eyebrow' }, icon('kitchen'), 'Vaření krok za krokem'),
            el('p', { id: 'cook-recipe', className: 'cook-recipe' }, recipe.title),
          ),
          button('Zavřít', () => dialog.close(), { className: 'kitchen-button' }),
        ),
        el(
          'div',
          { className: 'cook-progress' },
          el('progress', {
            value: progress.done.length,
            max: progress.active.length,
            'aria-label': 'Hotové kroky',
          }),
          el('span', {}, `${progress.done.length} / ${progress.active.length} hotovo`),
        ),
      ),
      body,
      el('footer', { className: 'cook-navigation' }, completed ? null : back, primary),
    );
  };
  dialog.addEventListener('close', () => {
    dialog.remove();
    closed();
    if (location.hash === '#vareni') {
      const address = new URL(location.href);
      address.hash = 'uvarit';
      history.replaceState(null, '', address);
    }
    document.getElementById('start-cooking')?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  render();
  dialog.showModal();
  focusStep();
}
