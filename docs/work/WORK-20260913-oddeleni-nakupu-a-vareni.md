---
task_id: WORK-20260913-oddeleni-nakupu-a-vareni
status: active
started: 2026-09-13
last_updated: 2026-09-13
owner: Codex
branch: develop
---

# Oddělení nákupu a vaření

## Výsledek a rozhodnutí

Uživatel potvrdil samostatná zobrazení nákupu a vaření; v nákupu sekce Uvařit nabídne vybraná jídla a detail receptu ukáže postup až v této sekci.

Odstranit vaření z karet nastavení nákupu, rozdělit souvislé věty do skutečných odstavců a zjednodušit veřejného průvodce podle stabilních principů.

## Kanonické vstupy a rozsah

[Požadavky](../product/requirements.md), [architektura](../architecture/overview.md), [příkazy](../development/commands.md), [testování](../quality/testing.md), [styl](../governance/documentation.md).

Dotčené jsou DOM a navigace v kitchen.mjs, styly a uživatelské texty; přenosový formát, uložený nákup a zdrojové recepty se nemění.

## Výchozí stav

Čistý develop na 1b97491; žádný starší pracovní záznam ani cizí změny.

Baseline npm test prošel se 73 testy; git-cliff vyžaduje přístup mimo sandbox.

Náhled na portu 8765 reprodukuje neklikatelné Uvařit a prázdný nákup.

## Milníky a ověření

- [x] Oddělené sekce s historií, přímými odkazy a správným obsahem článku.
- [ ] Odstavce dialogů a ostatních dotčených uživatelských textů.
- [ ] Obecný a stručný průvodce.
- [ ] Mobilní i desktopové ovládání, regrese, build a oddělené commity.

## Rizika a další krok

Ověřit obnovení sekce a krokových kotev, zobrazení pravého obsahu, zachování nastavení a rozepsaného množství při přepínání.

Bez JavaScriptu musí zůstat celý recept čitelný.

Implementovat sekce ve stávající klientské vrstvě; diagnostika patří do private/flow-audit/.

První změna prošla 73 testy a buildem 54 stránek; desktop a mobil potvrdily filtrování obsahu, historii, obnovu sekce, zachování rozepsaného celeru, dávku 2× a starý odkaz otevírající druhý krok vývaru.

Následuje úprava odstavců, průvodce a závěrečná širší vizuální kontrola.

## Přenos znalostí

- [ ] Produktové chování a architektonický tok aktualizované.
- [ ] Smoke a skutečné výsledky v kvalitě; po dokončení záznam odstranit.
