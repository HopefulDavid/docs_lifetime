# Dokumentace ze života

Dokumentace ze života je veřejná česká osobní kuchařka, ve které lze rychle dohledat recepty a nápojové postupy podle původu a typu.

## Stav

Publikovaný web je dostupný na [GitHub Pages](https://hopefuldavid.github.io/docs_lifetime/).

Zdrojový obsah, generátor navigace a sestavení DocFX jsou udržované v tomto repozitáři.

## Rychlá orientace

- Produktový záměr a chování jsou v [`docs/product/requirements.md`](docs/product/requirements.md).
- Architektura je v [`docs/architecture/overview.md`](docs/architecture/overview.md).
- Přesné vývojové příkazy jsou v [`docs/development/commands.md`](docs/development/commands.md).
- Způsob práce je v [`docs/development/workflow.md`](docs/development/workflow.md).
- Úplná mapa kanonické dokumentace je v [`docs/index.md`](docs/index.md).
- Aktuálně rozpracovaná práce je rozpoznatelná podle souborů `docs/work/WORK-*.md`.

## Obsah a generované soubory

Ručně udržované recepty a nápoje jsou v adresářích [`food/`](food/) a [`drink/`](drink/).

Přehledové stránky a navigaci vytváří [`scripts/generate-docs.js`](scripts/generate-docs.js), proto se jejich seznamy odkazů neupravují ručně.

## První spuštění

Obnovu nástrojů, kontrolu, sestavení a lokální náhled proveď přesně podle [`docs/development/commands.md`](docs/development/commands.md).
