---
canonical_for: decision-0006-generated-docset
status: accepted
date: 2026-09-13
last_verified: 2026-09-13
owner: architecture
supersedes: null
superseded_by: null
---

# ADR-0006: Izolované generování veřejného docsetu

## Kontext a kritéria

Uživatel požaduje automatické odlišení ručních a generovaných dat a stejný jediný zdroj pravdy ve vývoji i produkci.

Audit prokázal verzované přehledy a klientský JSON mezi ručními recepty, kontrolní příkaz přepisující changelog a nákupní testy závislé na předem vytvořeném JSON.

Rozhodnutí doplňuje [ADR-0003](ADR-0003-generovani-changelogu-pomoci-git-cliff.md) umístěním changelogu a [ADR-0004](ADR-0004-nakup-a-vareni-nad-markdownem.md) oddělením autorských zdrojů a sestavovacích kopií.

Kritéria vycházejí z `REQ-003`, `REQ-E002` a `QLT-001` v [požadavcích](../../product/requirements.md).

## Varianty

| Varianta | Přínos | Nevýhoda |
|---|---|---|
| Ponechat verzované výstupy u receptů a doplnit označení | Přehledy lze číst přímo v Git checkoutu | Autor musí nadále commitovat mechanické změny a zdrojový strom zůstává promíchaný |
| Ignorovat jednotlivé výstupy na původních cestách | Odpadnou generované commity | Křehké ignorovací vzory a stejné adresáře pro ruční obsah i automatické mazání |
| Izolovat celý veřejný docset | Jedna bezpečná hranice generování, čištění a kontroly; stejné relativní URL | Čitelné přehledy vzniknou až po generování a build obsahuje obnovitelné kopie receptů |

## Rozhodnutí

Zachovat existující Node.js generátor a vytvořit ignorovaný docset `_generated/`, který DocFX mapuje do kořene `_site/`.

Ruční recepty, průvodce a slovníky zůstanou ve zdrojovém stromu; kopie pro build nejsou editovatelným kanonickým zdrojem.

Přesné vlastnictví dat a manifest původu popisuje [architektura](../overview.md#odvozená-data-a-rozsah-automatizace).

Generování včetně historie se nejprve vyhodnotí v paměti a kontrolní režim používá stejný výpočet bez zápisu.

Testy čerpají ze zdrojů, čisté testování a sestavení si výstupy připraví automaticky a průběžný náhled volá stejný build po změně zdroje.

Nový runtime, knihovna ani alternativní produkční generátor nejsou potřebné; sledování souborů používá standardní API Node.js.

## Podklady

| Zdroj | Ověření 2026-09-13 a význam | Omezení |
|---|---|---|
| [DocFX configuration](https://dotnet.github.io/docfx/reference/docfx-json-reference.html) | Mapování `content` a `resource` s `src` umožňuje zachovat URL při přemístění vstupů | Kompatibilitu s připnutou verzí potvrdilo skutečné sestavení |
| [Git ignore](https://git-scm.com/docs/gitignore) | Ignorování platí pro nesledované soubory, proto je nutné odstranit historické odvozené soubory z verzovaného stromu | Lockfile zůstává záměrně verzovaným vstupem |
| [git-cliff npm API](https://git-cliff.org/docs/installation/npm/) | Podporované `runGitCliff` umožňuje zachytit výstup bez vlastního parseru historie | Úplnost Git historie kontroluje projekt před voláním |
| [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/) | Projektové příkazy tvoří společný vstup lokálního prostředí a CI | Watch proces pouze spouští tento vstup, nikoli druhou implementaci buildu |
| Lokální experiment s DocFX a dočasnou obsahovou fixture | Nový docset sestavil 53 obsahových stránek bez varování; změna, přesun a smazání receptu obnovily JSON i navigaci a odstranily staré výstupy | Nejde o publikování změny do GitHub Pages |

## Migrace, rizika a ověření

Dosavadní generované soubory se odstraní ze zdrojových cest a vytvoří v izolovaném adresáři; zdrojové recepty a jejich veřejná URL se nemění.

Starý kořenový `changelog.md` se odstraní jako obnovitelný výstup a publikační oznámení přejde na novou cestu.

Již publikované adresy a místní nákupní identifikátory nemění samotný přesun build vstupů, zatímco autorské přejmenování receptu nadále vyžaduje posouzení kompatibility.

Při plném disku nebo chybě zápisu může být docset neúplný; další generování jej opraví a selhaný build se nepublikuje.

Průběžný náhled neslibuje nulovou nedostupnost během čistého sestavení ani automatické obnovení stránky v prohlížeči.

Integrační scénáře, skutečné sestavení a test pod podsložkou vlastní [testovací strategie](../../quality/testing.md).

Rozhodnutí se přezkoumá při požadavku na editaci přímo v generovaných přehledech, nový obsahový systém nebo souběžné buildy ve stejném checkoutu.
