---
canonical_for: decision-0010-pnpm-package-management
status: accepted
date: 2026-09-21
last_verified: 2026-09-21
owners:
  - engineering
supersedes: null
superseded_by: null
---

# ADR-0010: pnpm pro správu JavaScript balíčků

## Kontext

Projekt používal npm a `package-lock.json` pro jediný kořenový manifest, lokální příkazy i oba joby GitHub Actions.

Uživatel požádal o přechod na pnpm, pokud jej projekt podporuje.

Statický web nemá runtime server a změna se týká vývojových nástrojů, generování, testů a sestavení.

## Rozhodovací kritéria

- Zachovat Node.js 24, přesně uzamčené verze závislostí a sestavení DocFX.
- Používat jeden lockfile a shodné příkazy lokálně i v CI.
- Zachovat funkčnost Windows a linuxového CI bez spoléhání na globální náhodnou verzi správce balíčků.
- Udržet návrat možný z Git historie bez migrace veřejných dat.

## Výzkumné podklady

| Tvrzení | Zdroj | Ověřeno | Závěr a omezení |
|---|---|---|---|
| Kompatibilita a migrace | [Instalace pnpm 12](https://pnpm.io/installation), [pnpm import](https://pnpm.io/cli/import) | 2026-09-21 | pnpm 12 podporuje Node.js 24 a převod `package-lock.json`; dokumentace sama nepotvrzuje tento konkrétní build |
| Reprodukovatelná instalace | [pnpm install](https://pnpm.io/cli/install) | 2026-09-21 | `--frozen-lockfile` odmítá nesoulad manifestu a lockfilu |
| Podpora CI a cache | [pnpm/action-setup](https://github.com/pnpm/action-setup), [actions/setup-node](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md) | 2026-09-21 | Akce umějí připravit verzi z `packageManager` a cache podle `pnpm-lock.yaml`; skutečný běh GitHub Actions čeká na publikování změny |
| Kompatibilita projektu | Místní experiment v tomto repozitáři, Node.js 24.13.0, pnpm 12.4.0, Windows | 2026-09-21 | Import lockfilu, uzamčená instalace a 77 testů prošly; linuxový běh prověří CI |

## Zvažované varianty

### Zachovat npm

Vyžaduje nejméně změn a dosavadní CI jej používá.

Nesplňuje požadovaný přechod a ponechává samostatný npm lockfile.

### Přejít na pnpm

Zachovává uzamčené verze a poskytuje shodný projektový vstup pro lokální práci i CI.

Vyžaduje převod lockfilu, aktualizaci skriptů, CI a dokumentace a přidává přípravnou akci do obou jobů.

## Rozhodnutí

Přijímáme pnpm 12.4.0 v `packageManager` a `pnpm-lock.yaml` jako jediný JavaScript lockfile.

CI používá připnutý `pnpm/action-setup`, `actions/setup-node` s pnpm cache a `pnpm install --frozen-lockfile --ignore-scripts`.

Lokální příkazy, generované pokyny a vývojový náhled používají pnpm.

## Důsledky a rizika

Uživatel musí mít dostupný pnpm v projektové verzi a čistá instalace potřebuje npm registry při prázdné cache.

Některé závislosti mohou předpokládat plochou strukturu `node_modules`; místní test a sestavení toto riziko ověřují pro současné verze.

Linuxový runner může odhalit platformní rozdíl v `git-cliff` nebo assetech, proto oba joby instalují z téhož lockfilu a ověřovací job blokuje publikování.

## Migrace a ověření

Lockfile byl odvozen z dosavadního `package-lock.json` pomocí `pnpm import`, následně aktualizován pro připnutý správce balíčků a původní lockfile se odstraní.

Návrat lze provést revertem změny v Gitu; veřejný obsah ani uživatelská data se nemigrují.

Rozhodnutí se průběžně ověřuje uzamčenou instalací, `pnpm test` a `pnpm run docs:build` v místním prostředí i CI.
