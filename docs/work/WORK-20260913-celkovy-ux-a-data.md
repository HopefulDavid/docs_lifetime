---
task_id: WORK-20260913-celkovy-ux-a-data
status: active
started: 2026-09-13
last_updated: 2026-09-13T10:00:00Z
owner: Codex
branch: develop
scope:
  - public-interface
  - content-generation
  - quality
---

# WORK-20260913: Použitelná dokumentace života

## Požadovaný výsledek

Vizuálně projít celý web, opravit zjištěné potíže při hledání, nákupu a vaření a zachovat prostor pro jiné životní návody.

Prověřit datové zdroje a automatizaci bez zbytečného růstu provozní složitosti.

## Kanonické vstupy

- [Požadavky](../product/requirements.md)
- [Architektura](../architecture/overview.md)
- [Příkazy](../development/commands.md)
- [Testování](../quality/testing.md)
- [Formát receptu](../product/recipe-format.md)

## Akceptační kritéria

- [ ] Celý hlavní uživatelský tok je vizuálně zkontrolovaný a významné závady opravené.
- [ ] Mobil, tablet, desktop, klávesnice, dialogy a chybové stavy mají zaznamenané důkazy.
- [ ] Obecné stránky nejsou považované za recepty a budoucí rozšíření má jasnou hranici.
- [ ] Data a automatické výstupy mají jeden zdroj pravdy a regresní kontroly.
- [ ] Kanonické dokumenty odpovídají výsledku a úplné testy i build prošly.

## Omezení a mimo rozsah

Zachovat URL, statický hosting, místní čtenářská data a autoritativní obsah.

Nepřidávat účty, server ani vymyšlené zdravotní či kulinářské údaje.

Publikování není součástí této lokální revize.

## Výchozí stav a baseline

- Čistý `develop`, HEAD `9a5c13b`, o dva commity před `origin/develop`.
- Remote SSH GitHub, úplná historie, `origin/HEAD` směřuje na `main`.
- Node 24.13.0, npm 11.6.2, .NET 10.0.401, DocFX 2.78.5; deklarované závislosti dostupné.
- Žádný existující pracovní záznam ani vnořené instrukce.

## Milníky a průběh

| ID | Výsledek | Stav | Důkaz |
|---|---|---|---|
| M1 | Baseline, vizuální audit a analýza dat | done | 26 testů, čistý build, mobilní katalog, společný nákup a vaření, přehled na 320 px |
| M2 | Opravené rozhraní a hranice obsahu | in-progress | 29 testů a build prošly, probíhá navazující vizuální regrese |
| M3 | Regrese, dokumentace a přenos znalostí | pending | — |

## Rozhodnutí a objevy

Changelog, katalog, navigace a klientský receptový JSON už mají generátor; nejprve ověřit jejich kontrakty místo zavádění druhého mechanismu.

## Ověření výsledku

Dosud pouze inventura prostředí.

`npm test` a `npm run docs:build` vyžadují eskalaci kvůli sandboxovému odmítnutí git-cliff; mimo sandbox prošel nezměněný baseline i rozšířená sada 29 testů.

Lokální server běží přes `npm run docs:serve` na portu 8765, exec session 15750.

Vizuálně potvrzeno na 320/390/768 px: přidání rajské a šunkofleků, cibule 2 ks, změna šunkofleků na 2× => cibule 3 ks, označení cibule, nákupní režim, první krok vaření, zavření Escape.

Zjištění: přehledy měly na telefonu vodorovně skryté sloupce, globální nákupní lišta zatěžovala i obecné stránky, průběh vaření nebyl svázaný s verzí zdroje a staré nákupní podpisy se mohly obnovit při návratu dávky.

Realizace používá stejný generátor a standardní API; obecný veřejný průvodce není recept, nové oblasti budou samostatné explicitní docset vstupy.

Primární podklady ověřené 2026-09-13: [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [dotykové cíle](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [nativní dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## Dotčené soubory a cizí změny

Žádné cizí necommitované změny na začátku úkolu.

## Další bezpečný krok

Pokračovat vizuální regresí nového sestavení na 320, 390, 768 a 1440 px v CUA tab 1 (browser 1), poté zapsat trvalé závěry do kanonických dokumentů.

## Stav předání

- Aktuální milník M1, bez blokujících rozhodnutí.
- Poslední ověřený commit: 9a5c13b (pouze inventura).

## Kontrola přenosu trvalých znalostí

- [ ] Požadavky a architektura.
- [ ] Testování, příkazy a provozní poznatky.
- [ ] Ověření, rizika a odstranění záznamu.
