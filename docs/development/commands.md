---
canonical_for: project-commands
status: accepted
last_verified: 2026-08-28
owner: engineering
---

# Projektové příkazy

Tento dokument je kanonickým lidským rozhraním pro lokální generování, kontrolu, sestavení a spuštění projektu.

Skripty, manifesty a build konfigurace zůstávají kanonické pro prováděnou strojovou logiku.

## Požadované prostředí

| Nástroj nebo služba | Podporovaná verze | Kanonický zdroj verze | Lokální nebo řízená dostupnost | Ověření |
|---|---|---|---|---|
| Node.js | Řada 24 LTS | [`../../package.json`](../../package.json) | Lokální instalace a `actions/setup-node` | `node --version` |
| npm | Verze kompatibilní s Node.js 24 a lockfile v3, ověřeno s 9.9.4 | Distribuce Node.js a [`../../package-lock.json`](../../package-lock.json) | Lokální instalace a `actions/setup-node` | `npm --version` |
| .NET SDK | 8.0 nebo vyšší, lokálně ověřeno s 10.0.301 | [Workflow](../../.github/workflows/main.yml) a požadavek DocFX | Lokální instalace a `actions/setup-dotnet` | `dotnet --version` |
| DocFX | Přesná verze z manifestu, ověřeno s 2.78.5 | [`../../.config/dotnet-tools.json`](../../.config/dotnet-tools.json) | Lokální .NET tool cache nebo NuGet.org | `dotnet tool run docfx --version` |
| Git | Verze podporující běžné checkout a log operace | Systémová instalace | Lokální prostředí a GitHub Actions | `git --version` |

Generování changelogu vyžaduje úplnou Git historii, nikoli mělký checkout.

## Inicializace prostředí

Spusť příkazy z kořene repozitáře v uvedeném pořadí.

| Účel | Pracovní adresář | Přesný příkaz | Očekávaný výsledek | Síťové požadavky |
|---|---|---|---|---|
| Obnovení npm závislostí | Kořen repozitáře | `npm ci --ignore-scripts --no-audit --no-fund` | Přesné balíčky z lockfilu a kód 0 | npm registry při prázdné cache |
| Obnovení DocFX | Kořen repozitáře | `dotnet tool restore` | DocFX z lokálního manifestu a kód 0 | NuGet.org při prázdné cache |
| Kontrola instalovaných npm balíčků | Kořen repozitáře | `npm ls --depth=0` | Pouze deklarované přímé balíčky bez `UNMET DEPENDENCY` | Žádné po obnově |

`npm ci` znovu vytvoří ignorovaný adresář `node_modules/` a nesmí měnit `package-lock.json`.

## Generování a sestavení

| Varianta | Pracovní adresář | Přesný příkaz | Výstup | Úspěch znamená |
|---|---|---|---|---|
| Přepočet katalogu a navigace | Kořen repozitáře | `npm run docs:generate` | Verzované `index.md` a `toc.yml` soubory | Generátor skončí kódem 0 a vypíše změněné cesty nebo aktuální stav |
| Vyčištění statického výstupu | Kořen repozitáře | `npm run docs:clean` | Odstraněný ignorovaný adresář `_site/` | Staré stránky nemohou zůstat v následujícím artefaktu |
| Vývojové sestavení | Kořen repozitáře | `npm run docs:build` | Ignorovaný `changelog.md` a adresář `_site/` | Changelog, katalog, navigace a připnutý DocFX projdou bez varování |
| Produkční sestavení | Kořen repozitáře | `npm run docs:build` | Stejný ignorovaný changelog a adresář `_site/` | Vznikne tentýž typ artefaktu, který publikuje CI |

Vývojové a produkční sestavení se liší pouze prostředím spuštění, nikoli projektovým vstupem.

## Spuštění

Nejdříve vytvoř `_site/` příkazem `npm run docs:build`.

| Scénář | Pracovní adresář | Přesný příkaz | Adresa nebo rozhraní | Bezpečné zastavení |
|---|---|---|---|---|
| Hlavní lokální náhled | Kořen repozitáře | `npm run docs:serve` | `http://127.0.0.1:8765/` | `Ctrl+C` v běžícím terminálu |

Lokální server zpřístupňuje pouze již sestavený statický adresář a neprovádí hot reload.

Po změně zdroje web znovu sestav a stránku obnov.

## Statické kontroly

| Kontrola | Přesný příkaz | Rozsah | Oprava formátu | Očekávaný výsledek |
|---|---|---|---|---|
| Cílené automatické testy | `npm run test:unit` | České i anglické hledání, chybové vstupy generátoru a automatický changelog v dočasném Git repozitáři | Ruční oprava modulu, workeru, generátoru nebo konfigurace changelogu | Jedenáct scénářů projde a dočasné kopie se odstraní |
| Konzistence generovaných souborů | `npm run docs:check` | Nejprve obnoví ignorovaný changelog, potom ověří recepty, nápoje, katalog, přehledy a TOC | `npm run docs:generate` | `Dokumentace je aktuální.` a kód 0 |
| Struktura dokumentace | `npm run docs:validate` | Interní odkazy, kanonická metadata, adaptéry, pracovní záznamy a zakázané artefakty | Ruční oprava zdroje | Souhrn platných Markdown souborů a kód 0 |
| Úplná rychlá kontrola | `npm test` | Cílené testy, generované soubory a strukturální validace | Podle konkrétního výstupu | Všechny tři vrstvy projdou |
| DocFX s varováními jako chybami | `npm run docs:build` | Produktový docset a vlastní šablona | Ruční oprava zdroje nebo konfigurace | `Build succeeded`, 0 varování a 0 chyb |

Projekt nemá samostatný obecný formatter, JavaScript linter ani typovou kompilaci.

Nový nástroj této kategorie se zavede pouze tehdy, když pokryje konkrétní riziko lépe než současné kontroly.

## Testy

Strategie výběru testů je v [`../quality/testing.md`](../quality/testing.md).

| Úroveň | Přesný příkaz nebo scénář | Potřebné služby | Výstupní artefakty | Typická doba nebo rozsah |
|---|---|---|---|---|
| Rychlé chování | `npm run test:unit` | Lokální Git a obnovený `git-cliff` | Konzolový výstup jedenácti scénářů | Jednotky sekund bez obnovy nástrojů |
| Cílený test generátoru | `npm run docs:check` | Obnovený `git-cliff` a lokální Git | Konzolový seznam očekávaných změn při selhání | Sekundy, changelog a celý obsahový katalog |
| Automatizované testy | `npm test` | Žádné | Konzolový výstup | Sekundy, celý repozitář |
| Integrační sestavení | `npm run docs:build` | Obnovený lokální DocFX | `_site/`, `index.json` a `manifest.json` | Jednotky sekund |
| Vizuální scénáře | `npm run docs:serve`, poté kroky z reprezentativního smoke scénáře | Lokální HTTP port 8765 a prohlížeč | Viditelná stránka, volitelný screenshot a konzole | Úvod, hledání, detail a chybová cesta |
| Úplná lokální kontrola | Inicializace prostředí, `npm test` a `npm run docs:build` v tomto pořadí | npm a NuGet pouze při prázdné cache | Čistý Git diff a `_site/` | Desítky sekund bez prvního stahování |

## Changelog

Každé sestavení odvozuje ignorovaný `changelog.md` z úplné Git historie a zahrne jej do statického artefaktu.

Konfigurace v [`../../cliff.toml`](../../cliff.toml) zachovává nekonvenční commity, uvádí přesný zdrojový commit a celkový počet záznamů a seskupuje změny podle kalendářního roku v časovém pásmu `Europe/Prague`.

Rok nejnovějšího zahrnutého commitu je nejnovější otevřené období a uvádí vlastní počet změn; roky bez zahrnutých změn se nevykreslují a každý starší zobrazený rok je samostatný sbalený blok `<details>` se stejným údajem.

Uvnitř každého období zůstávají české kategorie, zvýrazněné breaking changes a sbalené technické typy; dosavadní stabilní kotva každé kategorie směřuje na její nejnovější výskyt a všechna období přidávají kotvy rozlišené rokem.

Release tagy historii nerozdělují a commity se zobrazují pouze krátkým neklikacím hashem.

Soubor není verzovaný a nevytváří samostatný commit.

| Účel | Přesný příkaz | Vedlejší účinek | Očekávaný výsledek |
|---|---|---|---|
| Náhled bez zápisu | `npm exec -- git-cliff --config cliff.toml` | Žádný soubor se nezmění | Úplný Markdown na standardním výstupu |
| Vytvoření vstupu pro sestavení | `npm run changelog:generate` | Přepíše pouze ignorovaný `changelog.md` | Úplný přehled s identitou zdroje, otevřeným nejnovějším obdobím, sdělením o vynechávání roků bez změn, sbalenými staršími roky, počty změn a kategoriemi |

`npm run docs:build` tento krok spouští automaticky před DocFX.

## Reprezentativní smoke scénář

| Požadavek | Příprava | Kroky nebo příkaz | Očekávaný technický důkaz | Úklid |
|---|---|---|---|---|
| `REQ-001`, `REQ-002` | `npm run docs:build` a `npm run docs:serve` | Otevři úvod, zvol `Jídlo` a otevři `Rajská omáčka s masovými koulemi` | Katalog, ingredience, očíslované kroky, tipy a varování jsou viditelné bez chyb konzole | Ukonči server přes `Ctrl+C` |
| `REQ-005` | Běžící lokální náhled | Postupně vyhledej `Rajská`, `rajska`, `PIZZA`, `French Press`, indexovaný termín cesty `coffee` a `bez-vysledku-xyz`, poté otevři odpovídající výsledky | České varianty najdou rajskou, anglické termíny najdou pizzu a French Press, poslední dotaz zobrazí český nulový stav a konzole zůstane bez chyb | Vymaž dotaz nebo zavři panel |
| `REQ-E003` | Běžící lokální náhled | Otevři `/neexistuje.html` | Server vrátí HTTP 404 a neexistující obsah nenahradí jinou stránkou | Vrať se na úvod |

## Shoda lokálního prostředí a CI

Ověřovací i publikační job používají `npm ci`, `dotnet tool restore`, `npm test` a `npm run docs:build` ze stejného repozitáře.

Workflow smí přidat Git checkout, cache, nasazení a oznámení, ale nesmí měnit zdrojovou historii ani skrývat alternativní generátor nebo sestavení.

## Pravidlo ověření

Příkaz se do tohoto dokumentu zapisuje až po skutečném spuštění v podporovaném prostředí.

Při změně skriptu, manifestu, verze nástroje nebo názvu cíle se tento dokument aktualizuje ve stejné změně.
