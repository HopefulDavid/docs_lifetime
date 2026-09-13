---
task_id: WORK-20260913-kuchyne-validace-sdileni
status: active
started: 2026-09-13
last_updated: 2026-09-13T15:00:00Z
owner: Codex
branch: develop
scope:
  - content-validation
  - shopping-transfer
  - public-navigation
---

# WORK-20260913: Kuchyně, kontrola obsahu a sdílení nákupu

## Požadovaný výsledek

Suroviny mají důslednou kontrolu před generováním, chybějící množství vyvolává neblokující varování a obecné stránky nepřebírají receptový kontrakt.

Nákup lze exportovat a importovat se sloučením nebo nahrazením a obecný úvod vede do samostatné části Kuchyně.

## Kanonické vstupy

- [Požadavky](../product/requirements.md), [receptový formát](../product/recipe-format.md), [architektura](../architecture/overview.md).
- [Příkazy](../development/commands.md), [testování](../quality/testing.md), [provoz](../operations/runbook.md), [CI](../delivery/ci-cd.md).
- [ADR](../architecture/decisions/README.md), [workflow](../development/workflow.md), [pravidla výzkumu](../governance/research.md).
- Zadání a odpověď uživatele v této úloze: import nabídne sloučení i převzetí celého nákupu.

## Akceptační kritéria

- [ ] Chybná surovina nebo slovník zastaví zápis a uvede přesné místo a opravu.
- [ ] `neuvedeno` hlásí warning pouze v receptových surovinách; platný build projde.
- [ ] Přenos zachová výběr, dávky, alternativy, přílohy, vlastní množství i platné odškrtnutí.
- [ ] Import kontroluje vnější data, nabízí náhled a obě schválené varianty bez tichého přepsání konfliktů.
- [ ] Úvod je obecný; Kuchyně zahrnuje Jídlo, Nápoje a nákup při zachování současných URL receptů.
- [ ] Automatické, negativní a mobilní browser scénáře mají důkaz a kanonické návody odpovídají výsledku.

## Omezení a mimo rozsah

- Zachovat statický hosting, současné recepty, jejich URL a lokální uložený nákup.
- Sdílení je předání kopie uživatelem, nikoli živá serverová synchronizace.
- Nedopočítávat chybějící kulinářské údaje ani automaticky neurčovat odbornou správnost suroviny.
- Žádný push, nasazení ani odesílání zpráv skutečným lidem.

## Orientace v dotčené oblasti

| Prvek | Úloha |
|---|---|
| `scripts/recipe-content.cjs` a `scripts/generate-docs.js` | Obsahová kontrola a generování |
| `templates/kitchen/public/kitchen-core.mjs` | Doména a uložený stav nákupu |
| `templates/kitchen/public/kitchen.mjs`, `main.css`, `main.js` | Interakce, navigace a mobilní podoba |
| `pruvodce.md`, kanonická dokumentace | Čtenářský postup, kontrakty, ověření |

## Výchozí stav a baseline

Čistý `develop` na `61efdea`, úplná Git historie, remote SSH GitHub; žádný aktivní předchozí pracovní záznam.

Windows, Node 24.13.0, npm 11.6.2, připnutý DocFX: `npm test` 34/34 PASS a `npm run docs:build` 53 obsahových stránek, 27 receptů, 0 varování a 0 chyb.

Příkazy s `git-cliff` vyžadují schválené spuštění mimo sandbox podle již doložené vlastnosti prostředí.

## Rozhodnutí a výzkum

Uživatel schválil nabídnout sloučení i převzetí; název Kuchyně a zachování současných adres jsou odvozené ze zadání a kompatibility.

Výzkum přenosu: porovnat prostý soubor, kompaktní přenositelný odkaz a službu se serverem; ověřit standardní webová API, omezení vstupu a konflikty lokálním experimentem.

## Milníky a průběh

| ID | Výsledek | Stav | Důkaz |
|---|---|---|---|
| M1 | Pravidla, průzkum a baseline | done | 34 testů a standardní build PASS |
| M2 | Suroviny, warning a samostatná Kuchyně | in-progress | — |
| M3 | Přenos nákupu a řešení konfliktů | pending | — |
| M4 | Regrese, prohlížeč a přenos znalostí | pending | — |

## Objevy a rizika

Parser již odmítá neznámé a duplicitní suroviny, ale nevyhodnocuje přesně všechny řádky tabulky ani nevypisuje varování pro `neuvedeno`.

Stav obsahuje podpisy zdrojů a revize; import nesmí obnovit potvrzení pro jiné množství ani jinou verzi receptu.

## Dotčené soubory a necommitované změny

Výchozí strom byl čistý; změny po baseline náleží tomuto úkolu.

## Další bezpečný krok

Rozšířit obsahový parser o strukturovanou diagnostiku s řádky a neblokující warning, následně ověřit fixture v `tests/`.

## Stav předání

- Poslední ověřený commit: `61efdea`.
- Běžící procesy: žádné.
- Cizí změny a blokace: žádné.

## Kontrola přenosu trvalých znalostí

- [ ] Požadavky, architektura a ADR jsou aktualizované.
- [ ] Příkazy, testování, provoz a průvodce odpovídají ověřenému chování.
- [ ] Rizika a omezení jsou popsaná; záznam lze odstranit.
