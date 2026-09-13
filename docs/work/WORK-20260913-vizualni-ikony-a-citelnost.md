---
task_id: WORK-20260913-vizualni-ikony-a-citelnost
status: active
started: 2026-09-13
last_updated: 2026-09-13T12:00:00Z
owner: Codex
branch: develop
scope:
  - UI, ikony a vaření
  - scripts a tests
---

# WORK-20260913: Vizuální orientace a čitelnost kódu

## Požadovaný výsledek

Spolehlivé ikony a vlajky napříč webem, přehledné vaření s jedinou akcí dokončení a snadno upravitelné skripty a testy.

Uživatel výslovně požaduje vizuální průchod celého webu, výzkum vhodných řešení a oddělené logické commity.

## Kanonické vstupy

- [Požadavky](../product/requirements.md), zejména REQ-001, REQ-006, REQ-010 a QLT-003.
- [Architektura](../architecture/overview.md) a [ADR](../architecture/decisions/README.md).
- [Příkazy](../development/commands.md), [standardy kódu](../development/coding-standards.md), [závislosti](../development/dependencies.md) a [testování](../quality/testing.md).

## Akceptační kritéria

- [ ] Ikony se zobrazují bez závislosti na systémovém emoji fontu; země mají odpovídající vlajku.
- [ ] Stránky a hlavní stavy jsou vizuálně zkontrolované v desktopu i mobilním zobrazení.
- [ ] Vaření má jedinou hlavní akci dokončení, zachová návrat, vynechané kroky, ukládání a klávesnici.
- [ ] Všechny scripts a tests jsou čitelně formátované, odpovědnosti a fixture mají jasné hranice.
- [ ] Regrese a sestavení projdou; logické výsledky mají vlastní české Conventional Commits.

## Omezení a mimo rozsah

Recepty, veřejné URL a datový kontrakt nákupu zůstávají zachované.

Nevzniká server, nový aplikační framework ani nasazení.

## Orientace v dotčené oblasti

Generátor tvoří statické přehledy; kitchen.mjs rozšiřuje katalog, nákup a recepty, main.js řídí obecné UI.

Výstupy a diagnostika patří do ignorovaných adresářů.

## Výchozí stav a baseline

Čistý develop na ad8977d, origin přes SSH, žádný starší pracovní záznam ani cizí změny.

Node.js 24.13.0, npm 11.6.2, .NET 10.0.401; npm závislosti původně chyběly, obnovené přes npm ci a dotnet tool restore.

`npm test` po obnově prošel; log je v private/ui-audit/baseline-test.log.

## Výzkumné podklady

Probíhá srovnání Iconify, Tabler a Lucide a primárních doporučení Node.js, Prettier, Google Engineering Practices a W3C.

Trvalé závěry budou přenesené do příslušného ADR nebo standardů kódu.

## Rozhodnutí

Rutinní vratné úpravy a volbu knihovny autorizuje zadání; nejsou blokující uživatelské volby.

## Milníky a průběh

| ID | Ověřitelný výsledek | Stav | Důkaz dokončení |
|---|---|---|---|
| M1 | Baseline, výzkum a vizuální inventura | done | 45 testů, build 54 stránek, vizuální snímky všech 54 stránek |
| M2 | Spolehlivé SVG ikony a vlajky | done | 46 testů, build, desktop nákupu a mobilní katalog 390 px |
| M3 | Přehledný režim vaření | in-progress | — |
| M4 | Čitelné a rozdělené scripts | pending | — |
| M5 | Čitelné, izolované tests | pending | — |
| M6 | Závěrečná regrese a přenos znalostí | pending | — |

## Objevy, neúspěšné pokusy a rizika

První npm test selhal kvůli chybějícím závislostem; po jejich obnově prošel.

Známá obsahová upozornění na neuvedené množství nejsou předmětem změny.

## Ověření výsledku

Průběžné logy a snímky: private/ui-audit/.

## Dotčené soubory a necommitované změny

Všechny nové změny patří tomuto úkolu.

## Další bezpečný krok

Zjednodušit dokončování kroků, ověřit návrat, vynechané kroky a mobilní dialog.

## Stav předání

- Poslední ověřený commit: ad8977d.
- Aktuální milník: M3.
- Náhled: exec session 41969, ukončení Ctrl+C.
- Cizí změny a blokace: žádné.

## Kontrola přenosu trvalých znalostí

- [ ] Produkt, architektura, rozhodnutí, příkazy a testy aktualizované.
- [ ] Akceptační kritéria mají důkaz a soubor lze odstranit.

