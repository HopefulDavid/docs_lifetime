---
canonical_for: decision-0009-reader-changelog-timeline
status: accepted
date: 2026-09-21
last_verified: 2026-09-21
owners:
  - product
  - engineering
supersedes: ADR-0003
superseded_by: null
---

# ADR-0009: Čtenářská časová osa změn

## Kontext

Původní [ADR-0003](ADR-0003-generovani-changelogu-pomoci-git-cliff.md) zavedl spolehlivé generování z úplné Git historie.

Seskupení položek uvnitř roku podle technického typu však narušovalo pořadí od nejnovějších událostí a čtenáře nevedlo přímo k upravenému článku.

Uživatel výslovně požaduje časové pořadí, odkazy na články a důkladnější vzhled vhodný pro kuchyni i další běžné návody.

## Rozhodovací kritéria

- Zachovat úplnou dosažitelnou historii, češtinu, determinismus a generování bez sítě.
- Ukázat nejnovější změnu jako první i při různých kategoriích v témže roce.
- Nabídnout přímý odkaz pouze na článek, který stále existuje.
- Udržet čitelný mobilní přehled a přístupné ovládání starších roků i seznamů odkazů.
- Zachovat stávající stabilní kotvy kategorií.

## Výzkumné podklady

| Kritérium | Zdroj a verze | Datum ověření | Závěr | Omezení |
|---|---|---|---|---|
| Šablona zůstane nad Git historií | [`git-cliff` šablony](https://git-cliff.org/docs/configuration/changelog/) a lokální `git-cliff` 2.13.1 | 2026-09-21 | Tera šablona vykreslí úplný chronologický seznam a rok určí z data commitu | Odkaz na současnou cestu článku doplňuje projektový generátor |
| Pořadí a vazby na články | Víceletá fixture v [`../../../tests/changelog.test.mjs`](../../../tests/changelog.test.mjs) | 2026-09-21 | Pořadí zůstalo shodné ve dvou časových pásmech; přidaný, změněný a smazaný článek mají očekávané odkazy | Fixture nepokrývá vzdálený GitHub Pages provoz |
| Použitelnost výstupu | Místní DocFX web na 320 a 390 px a kontrola přímého odkazu | 2026-09-21 | Časová osa je čitelná a odkaz otevřel sestavený recept | Nejde o úplný audit přístupnosti ani test na fyzickém telefonu |

## Zvažované varianty

### Varianta A: Ponechat roční skupiny kategorií

Vyžaduje nejméně úprav, ale člověk musí pro zjištění posledních změn procházet více skupin a nemá přímý přechod na článek.

### Varianta B: Časová osa s kategoriemi u položek

Zachová úplnou historii i typ změny, přitom uvnitř roku řadí všechny záznamy podle času a odkazuje na dostupný obsah.

Cena je malá projektová vrstva, která z Git diffu získá současné veřejné cesty článků.

## Rozhodnutí

Přijímáme variantu B a nahrazujeme prezentační část ADR-0003.

`git-cliff` 2.13.1, jeho uzamčená verze, offline provoz, úplná historie bez segmentace tagy a krátké neklikací hashe zůstávají zachované.

Nejnovější rok je otevřený, starší roky jsou samostatné sbalené bloky a roky bez záznamů se neukazují.

Kategorie se zobrazují jako české štítky s místními ikonami u jednotlivých položek.

Generátor doplní odkazy na změněné soubory pod `food/`, `drink/` a na obecný průvodce, jen pokud tyto cesty stále existují v sestavovaném checkoutu.

## Důsledky

### Pozitivní

- Čtenář vidí poslední změny nahoře a může otevřít související článek jedním kliknutím.
- Úplnost historie, stabilní kotvy a rozlišení typu i důležitosti změny zůstávají zachované.

### Negativní

- Starší technické záznamy zůstávají v časové ose viditelné a stránka může být dlouhá.
- Starý odkaz na přesunutou nebo odstraněnou cestu se nevytváří; současný článek na nové cestě lze určit pouze z commitu, který ji upravil.

### Rizika a opatření

| Riziko | Dopad | Opatření | Ověření |
|---|---|---|---|
| Nefunkční odkaz na odstraněný článek | Střední | Generátor ověří existenci cesty v checkoutu | Test fixture a kontrola odkazů sestaveného webu |
| Ztráta pořadí mezi kategoriemi | Vysoký | Jedna chronologická iterace commitů | Víceletý integrační test |
| Nepřehledná mobilní stránka | Střední | Karty, sbalené starší roky a responzivní CSS | Vizuální průchod na úzkém telefonu |

## Migrace a kompatibilita

Změna se promítá pouze do při sestavení znovu vytvářeného changelogu a šablony webu.

Zdrojové články ani Git historie se nemigrují.

Dosavadní kotvy kategorií a roků zůstávají platné.

## Ověření rozhodnutí

`npm test` ověřuje pořadí, úplnost, datum, kotvy a odkazy nad dočasnou historií.

`npm run docs:build` ověřuje výsledné HTML a interní odkazy.

Reprezentativní mobilní průchod ověřuje rozvržení a otevření článku.

## Stav a nahrazení

Rozhodnutí je přijaté a nahrazuje ADR-0003 jako platné rozhodnutí o generování a prezentaci changelogu.
