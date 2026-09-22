---
canonical_for: decision-0008-local-svg-icons
status: accepted
date: 2026-09-13
last_verified: 2026-09-13
owner: architecture
supersedes: null
superseded_by: null
---

# ADR-0008: Místní SVG ikony z knihoven Iconify

## Kontext a varianty

Uživatel požaduje spolehlivé ikony, vlajky u zemí a rozsáhlou knihovnu pro další rozvoj.

Vizuální audit všech 54 stránek reprodukoval chybějící znak v nákupu a systémově závislé vykreslení vlajek jako písmen.

| Varianta | Posouzení |
|---|---|
| Lucide | Konzistentní SVG a ISC licence; užší katalog a samostatné řešení vlajek |
| Samostatný Tabler | Rozsáhlá jednotná sada, ale vlajky vyžadují druhý způsob integrace |
| Iconify s vybranými sadami | Jedno rozhraní pro rozsáhlý katalog, Tabler a barevné Circle Flags; licence se ověřují pro každou sadu |

## Rozhodnutí

Použít Iconify pouze při sestavení, s přesně uzamčenými sadami Tabler a Circle Flags a oficiálními funkcemi `getIconData`, `iconToSVG` a `iconToHTML`.

Registr `data/icons.json` určuje použité symboly a známé popisky; volitelné pole `flag` země v taxonomii odkazuje na její SVG vlajku.

Obecné oblasti bez konkrétní země mají symbol světa.

Generátor vytvoří malé CSS s vloženými SVG a modul popisků; prohlížeč nenačítá Iconify API, celý katalog ani nový runtime framework.

Jednobarevné SVG používají CSS masku a barvu textu, vlajky vlastní paletu.

Ikony doplňují viditelný text a jsou skryté před asistivní technologií.

## Podklady a omezení

Zdroje byly ověřené 2026-09-13; přesné verze vlastní npm manifest a lockfile.

| Zdroj | Význam pro rozhodnutí | Omezení |
|---|---|---|
| [Iconify](https://iconify.design/) a [generování SVG](https://iconify.design/docs/usage/svg/utils/) | Rozsáhlý katalog a podporovaný převod uzamčených dat při buildu | Licence frameworku není licencí každé sady |
| [Tabler](https://github.com/tabler/tabler-icons) | Jednotná mřížka a tahy, rozsáhlý výběr a MIT | Neposkytuje barevné vlajky |
| [Circle Flags](https://github.com/HatScripts/circle-flags) | Vlajky zemí s MIT licencí a konzistentním kruhovým tvarem | Stylizovaná paleta, nejde o normativní reprodukci vlajek |
| [Lucide](https://lucide.dev/) | Reálná alternativa s SVG a jednotným stylem | Menší výběr proti více sadám Iconify |
| [W3C: dekorativní obrázky](https://www.w3.org/WAI/tutorials/images/decorative/) | Textový popisek zůstává nositelem významu | Samotné ikony nedokazují úplnou přístupnost |
| Lokální build, test SVG a prohlížeč | Vykreslení vlajek a nákupu bez fontu, deterministické assety kolem 36 kB bez komprese | Další sady mohou zvětšit artefakt |

## Licence, aktualizace a návrat

Distribuční licence jsou v `templates/life/public/licenses/Tabler-MIT.txt` a `Circle-Flags-MIT.txt`, protože datové balíčky je neobsahují.

Původem jsou [Tabler v3.45.0](https://raw.githubusercontent.com/tabler/tabler-icons/v3.45.0/LICENSE) a [Circle Flags](https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/LICENSE.md), stažené 2026-09-13.

Při aktualizaci sady se ověří také licence, přítomnost používaných ikon a skutečný build; nepoužité symboly se z registru odstraní.

Při odstranění rozšíření zůstávají texty, odkazy a zdrojové recepty čitelné; neprobíhá migrace uložených dat.

Rozhodnutí se přezkoumá při potřebě jiné sady, animovaných ikon nebo podpory prohlížeče bez CSS masek.
