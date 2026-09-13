---
task_id: WORK-20260913-zdroje-a-generovani
status: active
started: 2026-09-13
last_updated: 2026-09-13T12:00:00Z
owner: Codex
branch: develop
scope:
  - content-generation
  - build-and-validation
  - canonical-documentation
---

# WORK-20260913: Jediný zdroj ručních a generovaných dat

## Požadovaný výsledek

Ruční obsah je jednoznačně oddělený od obnovitelných výstupů a stejná automatizace platí pro lokální náhled i produkční sestavení.

Přidání, úprava a odstranění receptu obnoví všechny odvozené soubory a kanonická dokumentace vysvětlí zbývající autorskou práci.

## Kanonické vstupy

- [Požadavky](../product/requirements.md), [formát receptu](../product/recipe-format.md), [architektura](../architecture/overview.md).
- [Příkazy](../development/commands.md), [testování](../quality/testing.md), [CI](../delivery/ci-cd.md), [provoz](../operations/runbook.md).
- [ADR](../architecture/decisions/README.md), [dokumentační pravidla](../governance/documentation.md), [workflow](../development/workflow.md).
- Zadání uživatele v této úloze: důkladný audit automatizace a one source of truth.

## Akceptační kritéria

- [ ] Odvozené soubory mají rozpoznatelný původ a lze je obnovit bez ručního přepisu.
- [ ] Čistá zdrojová kopie, změna receptu i odstranění posledního receptu oblasti vytvoří správné výstupy.
- [ ] Neplatné vstupy zastaví zápis; kontrolní režim nezmění soubory.
- [ ] Lokální i produkční sestavení používají shodný ověřený tok.
- [ ] Postup autora v kanonické dokumentaci odpovídá skutečně ověřenému přidání receptu.

## Omezení a mimo rozsah

- Zachovat URL, DocFX, statický hosting i místní data nákupu podle přijatých ADR.
- Neodhadovat věcně chybějící množství a kulinářské údaje.
- Nasazení, push a e-mail nejsou součástí tohoto zadání.

## Orientace v dotčené oblasti

| Prvek | Úloha |
|---|---|
| `scripts/generate-docs.js` | Odvozuje přehledy, TOC, nákup a JSON; zatím zapisuje mezi zdroje |
| `scripts/recipe-content.cjs` | Parser a slovník surovin |
| `package.json`, `docfx.json`, workflow | Lokální a CI sestavení |
| `scripts/validate-docs.js`, `tests/` | Konzistence, odkazy a chybové scénáře |

## Výchozí stav a baseline

| Prostředí | Příkaz nebo pozorování | Výsledek |
|---|---|---|
| Windows, 2026-09-13 | Git inventura | Čistý `develop` na `9bf933f`, o 4 commity před `origin/develop`, úplná historie; žádný předchozí pracovní záznam |
| Windows | Verze nástrojů | Node 24.13.0, npm 11.6.2, .NET SDK 10.0.401, DocFX 2.78.5 |
| Windows | `npm ls --depth=0` | Chybí obě deklarované npm závislosti; nejprve obnovit |

## Výzkumné podklady a rozhodnutí

Probíhá průzkum existujícího toku a podporovaných hranic DocFX.

Blokující uživatelské rozhodnutí zatím není známé.

## Milníky a průběh

| ID | Ověřitelný výsledek | Stav | Důkaz |
|---|---|---|---|
| M1 | Pravidla, úplný audit zdrojů a baseline | done | 29 testů, build a lokální katalog prošly |
| M2 | Automatické odvozování a ochrana ručních zdrojů | in-progress | Izolovaný ignorovaný docset, stejné veřejné URL |
| M3 | Čisté sestavení, negativní a browser scénáře | pending | — |
| M4 | Kanonický postup autora a přenos znalostí | pending | — |

## Objevy a rizika

- Odvozené přehledy, TOC a `data/recipes.json` se verzují; build je přepisuje mezi ručními zdroji.
- TOC nemá označení generovaného původu.
- `docs:serve` pouze servíruje starý `_site/`; čerstvost závisí na ručním předchozím sestavení.
- Slovník surovin tiše přepíše duplicitní název v jiném oddělení.
- Parser cest dovoluje neznámé štítky a neplatné hodnoty pouze podle počtu segmentů.

## Ověření výsledku

Baseline po obnově závislostí: npm test všech 29 scénářů PASS; npm run docs:build PASS, 0 varování a 0 chyb; prohlížeč načetl katalog 27 položek. Sandbox blokuje Git v git-cliff, shodné příkazy mimo sandbox prošly.

## Dotčené soubory a necommitované změny

Změny vzniklé po čistém výchozím stavu patří tomuto úkolu.

## Další bezpečný krok

Obnovit závislosti projektovým příkazem a spustit nezměněný `npm test` a `npm run docs:build`.

## Stav předání

- Poslední ověřený commit: `9bf933f`.
- Aktuální milník: M1.
- Běžící procesy: žádné.
- Cizí změny a blokace: žádné.

## Kontrola přenosu trvalých znalostí

- [ ] Požadavky, architektura a případné ADR odpovídají výsledku.
- [ ] Příkazy, testy, CI, provoz a autorský postup jsou ověřené.
- [ ] Akceptační kritéria mají důkaz a rizika vlastníka.
- [ ] Soubor lze bezpečně odstranit.
