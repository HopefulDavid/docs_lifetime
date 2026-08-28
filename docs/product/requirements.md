---
canonical_for: product-requirements
status: accepted
last_verified: 2026-08-28
owner: product
---

# Produktový záměr a požadavky

Tento dokument je jediným kanonickým zdrojem produktového záměru, rozsahu a pozorovatelného chování.

Technické řešení patří do [`../architecture/overview.md`](../architecture/overview.md).

## Problém a očekávaný přínos

Osobní recepty uložené v jednotlivých souborech se bez společného katalogu obtížně procházejí a při vaření se pomalu dohledávají.

Projekt poskytuje veřejnou českou kuchařku, ve které čtenář najde jídlo nebo nápoj podle sekce, původu, typu či názvu a otevře srozumitelný postup na jednom místě.

## Uživatelé a další aktéři

| Aktér | Potřeba | Kontext použití | Kritické omezení |
|---|---|---|---|
| Čtenář nebo kuchař | Rychle najít a přečíst recept | Veřejný web na počítači nebo telefonu, často během přípravy jídla | Obsah musí zůstat čitelný bez přihlášení |
| Správce obsahu | Přidat nebo opravit recept bez ruční údržby všech přehledů | Markdown, Git a lokální ověření | Zdrojová a generovaná část musí zůstat rozlišitelná |
| Správce publikování | Bezpečně ověřit a zveřejnit přijatou změnu | GitHub Actions a GitHub Pages | Tajemství nesmějí být ve zdrojovém kódu ani v artefaktu webu |

## Cíle

- Udržovat jednu snadno prohledatelnou sbírku jídel a nápojů v češtině.
- Umožnit procházení od obecné sekce přes původ a typ až ke konkrétnímu postupu.
- Generovat katalog, navigaci a popisy z autoritativních obsahových souborů.
- Zpřístupnit ověřenou verzi jako statický veřejný web s historií změn.

## Mimo rozsah

- Uživatelské účty, soukromé kolekce, komentáře a editace přímo ve webu.
- Nákupní seznamy, plánování jídel, výpočet výživových hodnot a správa zásob.
- Odborná garance alergenů, zdravotní vhodnosti nebo původnosti receptu.
- Obecné jazykové vyhledávání s českým skloňováním, stemmingem a zaručenou normalizací diakritiky.
- Programové API nebo databáze receptů pro jiné aplikace.

## Produktová omezení

- Primárním jazykem obsahu a rozhraní je čeština.
- Publikovaný obsah je veřejný a neobsahuje soukromé poznámky ani tajemství.
- Zdrojový recept je Markdown soubor umístěný v přijaté adresářové struktuře.
- Vestavěné fulltextové vyhledávání je pomocná cesta a nenahrazuje úplný katalog ani hierarchickou navigaci.

## Kanonické scénáře chování

| ID | Aktér a výchozí stav | Spouštěcí akce | Pozorovatelný výsledek | Priorita | Způsob ověření |
|---|---|---|---|---|---|
| `REQ-001` | Čtenář otevřel úvodní stránku | Zvolí sekci, oblast, zemi nebo typ | Uvidí odpovídající přehled se jmény, původem, typem a stručnými popisy dostupného obsahu | Kritická | Vizuální tok úvod → sekce → oblast |
| `REQ-002` | Čtenář našel konkrétní položku | Otevře odkaz receptu nebo nápoje | Uvidí název, úvod, ingredience, očíslované kroky a relevantní tipy či varování | Kritická | Vizuální detail reprezentativního receptu a nápoje |
| `REQ-003` | Správce přidal nebo upravil platný obsahový soubor | Spustí generování | Generované přehledy a navigace se deterministicky sjednotí se zdrojovým obsahem | Vysoká | `npm run docs:generate` a následné `npm run docs:check` |
| `REQ-004` | Přijatá změna je na větvi `main` | Proběhne publikační workflow | Ověřený statický web je dostupný na kanonické adrese a changelog popisuje změny | Vysoká | GitHub Actions, veřejný smoke a kontrola changelogu |
| `REQ-005` | Čtenář hledá výraz obsažený v indexu | Odešle dotaz ve vestavěném vyhledávání | Uvidí odpovídající výsledky nebo jednoznačnou informaci, že výsledek nebyl nalezen | Střední | Vizuální dotaz `pizza` a dotaz bez shody |

## Chybové a hraniční scénáře

| ID | Podmínka | Očekávané chování | Dopad při selhání | Způsob ověření |
|---|---|---|---|---|
| `REQ-E001` | Obsahový soubor nemá hlavní nadpis nebo jeho cesta neodpovídá podporované struktuře | Generátor skončí nenulovým kódem a vypíše konkrétní soubor a příčinu | Vadný obsah by mohl zmizet z navigace nebo poškodit katalog | Izolovaný negativní scénář generátoru |
| `REQ-E002` | Generované soubory neodpovídají zdrojovému obsahu | Kontrola skončí nenulovým kódem a vypíše všechny očekávané změny bez jejich zápisu | CI by jinak publikovalo zastaralou navigaci | `npm run docs:check` nad řízenou odchylkou |
| `REQ-E003` | Čtenář otevře neexistující veřejnou cestu | Hosting vrátí HTTP 404 a nezobrazí jiný recept jako náhradu | Čtenář musí rozpoznat neplatný nebo zastaralý odkaz | HTTP požadavek na neexistující cestu |
| `REQ-E004` | Odeslání informačního e-mailu selže po úspěšném nasazení | Workflow zachová úspěšně publikovaný web a označí oznámení jako neblokující selhání | Nedostupnost SMTP nesmí vrátit zveřejněný obsah | Kontrola podmínky `continue-on-error` a logu workflow |

## Kvalitativní očekávání

| ID | Oblast | Scénář | Měřítko nebo hranice | Priorita |
|---|---|---|---|---|
| `QLT-001` | Reprodukovatelnost | Nezměněný checkout projde obnovou, kontrolou a sestavením | Uzamčené npm a DocFX nástroje, nulový rozdíl generátoru, sestavení bez varování | Kritická |
| `QLT-002` | Konzistence | Změna kanonického nebo obsahového Markdownu vstoupí do CI | Platné interní odkazy, jedinečné `canonical_for`, platná metadata a žádné generované cache artefakty | Vysoká |
| `QLT-003` | Použitelnost | Čtenář otevře úvod a detail na běžném desktopovém a mobilním viewportu | Hlavní obsah a navigace zůstanou čitelné bez horizontální ztráty kroků receptu | Vysoká |
| `QLT-004` | Bezpečnost | CI sestavuje nedůvěryhodnou změnu nebo publikuje `main` | Ověření používá pouze čtecí token a publikační tajemství jsou dostupná jen zapisovacímu jobu | Vysoká |

## Slovník produktových pojmů

| Termín | Kanonický význam |
|---|---|
| Obsahová položka | Ručně udržovaný recept nebo nápoj v podporované cestě pod `food/` nebo `drink/` |
| Přehled | Generovaná stránka seskupující obsah podle sekce, oblasti, země nebo typu |
| Katalog | Úplný generovaný seznam všech obsahových položek na úvodní stránce |
| Publikovaný web | Statický výstup dostupný na kanonické adrese GitHub Pages |

## Pravidla změn požadavků

Akceptační kritérium se nesmí měnit pouze proto, aby prošla existující implementace nebo test.

Změna významného chování musí vzniknout z přijatého produktového rozhodnutí a současně aktualizovat scénář, testy, architekturu a veřejné rozhraní, pokud jsou dotčené.

Odstraněný požadavek se z historie změn nemaže bez vysvětlení v odpovídajícím rozhodnutí nebo změnovém záznamu projektu.
