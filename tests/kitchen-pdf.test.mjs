import assert from 'node:assert/strict';
import test from 'node:test';
import { kitchenPdfDefinition } from '../templates/life/public/kitchen-pdf.mjs';

// Úzká DOM fixture obsahuje jen kontrakt čtený PDF převodníkem, bez prohlížeče.
function element(tag, ...content) {
  const childNodes = content.map((item) =>
    typeof item === 'string' ? { nodeType: 3, textContent: item } : item,
  );
  return {
    nodeType: 1,
    tagName: tag,
    childNodes,
    children: childNodes.filter((node) => node.nodeType === 1),
    classList: { contains: () => false },
    get textContent() {
      return childNodes.map((node) => node.textContent).join('');
    },
    querySelector(name) {
      return this.children.find((node) => node.tagName === name.toUpperCase());
    },
  };
}

test('PDF zachová text kroku před vnořenou poznámkou, tučné údaje i neznámé množství', () => {
  const sheet = element(
    'DIV',
    element('H1', 'Kuřecí recept'),
    element('P', '2× dávka'),
    element(
      'UL',
      element(
        'LI',
        'Opečte maso.',
        element(
          'BLOCKQUOTE',
          element('P', element('STRONG', 'Poznámka:'), ' Kontrolujte šťavnatost.'),
        ),
      ),
      element('LI', element('STRONG', 'Máslo'), ' — Množství neuvedeno'),
    ),
  );

  const document = kitchenPdfDefinition(sheet);
  const text = JSON.stringify(document.content);
  for (const expected of [
    '2× dávka',
    'Opečte maso.',
    'Poznámka:',
    'Kontrolujte šťavnatost.',
    'Množství neuvedeno',
  ])
    assert(text.includes(expected), `PDF musí zachovat: ${expected}`);

  assert(text.includes('"bold":true'));
  assert.equal(document.info.title, 'Kuřecí recept');
});

test('nákupní PDF opakuje oddělení na další stránce a nerozdělí název suroviny od původu', () => {
  const department = element(
    'SECTION',
    element('H2', 'Mléčné výrobky'),
    element(
      'DIV',
      element('P', '☑ Máslo — 1 balení (vlastní)'),
      element('SMALL', 'Recept: neuvedeno'),
    ),
  );
  department.classList.contains = (name) => name === 'print-department';

  const document = kitchenPdfDefinition(
    element('DIV', element('H1', 'Nákupní seznam'), department),
  );
  const { table } = document.content[1];

  assert.equal(table.headerRows, 1);
  assert.equal(table.keepWithHeaderRows, 1);
  assert.equal(table.dontBreakRows, true);
  assert.equal(table.body.length, 2);
  assert(JSON.stringify(table.body[1]).includes('[x] Máslo'));
  assert(JSON.stringify(table.body[1]).includes('Recept: neuvedeno'));
});
