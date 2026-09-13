---
canonical_for: product-requirements
status: accepted
last_verified: 2026-09-13
owner: product
---

# Produktový záměr a požadavky

Tento dokument je jediným kanonickým zdrojem produktového záměru, rozsahu a pozorovatelného chování.

Technické řešení patří do [`../architecture/overview.md`](../architecture/overview.md).

## Problém a očekávaný přínos

Praktické návody uložené v jednotlivých souborech se bez společné orientace obtížně hledají právě ve chvíli, kdy je člověk potřebuje.

Projekt poskytuje veřejnou českou dokumentaci pro běžný život.

Současnou obsahovou oblastí je jídlo a pití s výběrem receptů, nákupem a přípravou doma nebo jinde.

Další oblasti osobního života mohou přibývat jako samostatné návody, které nepotřebují ingredience ani režim vaření.

## Uživatelé a další aktéři

| Aktér | Potřeba | Kontext použití | Kritické omezení |
|---|---|---|---|
| Čtenář nebo kuchař | Rychle najít a přečíst recept | Veřejný web na počítači nebo telefonu, často během přípravy jídla | Obsah musí zůstat čitelný bez přihlášení |
| Správce obsahu | Přidat nebo opravit recept bez ruční údržby všech přehledů | Markdown, Git a lokální ověření | Zdrojová a generovaná část musí zůstat rozlišitelná |
| Správce publikování | Bezpečně ověřit a zveřejnit přijatou změnu | GitHub Actions a GitHub Pages | Tajemství nesmějí být ve zdrojovém kódu ani v artefaktu webu |

## Cíle

- Udržovat snadno prohledatelnou sbírku praktických návodů v češtině se společným úvodem a srozumitelnými oblastmi.
- Umožnit procházení od obecné sekce přes původ a typ až ke konkrétnímu postupu.
- Generovat katalog, navigaci a popisy z autoritativních obsahových souborů.
- Zpřístupnit ověřenou verzi jako statický veřejný web s historií změn.
- Podporovat výběr několika jídel, společný nákup podle oddělení obchodu a vaření krok za krokem.

## Mimo rozsah

- Uživatelské účty, soukromé kolekce, komentáře a editace přímo ve webu.
- Účty, synchronizace mezi zařízeními, kalendářní plánování, výpočet výživových hodnot a správa zásob.
- Plná dostupnost celého webu bez připojení; pro obchod bez připojení slouží stažení textového seznamu, PDF nebo tisk.
- Odborná garance alergenů, zdravotní vhodnosti nebo původnosti receptu.
- Obecné jazykové vyhledávání se skloňováním, stemmingem, automatickým překladem, synonymy nebo tolerancí překlepů.
- Programové API nebo databáze receptů pro jiné aplikace.

## Produktová omezení

- Primárním jazykem obsahu a rozhraní je čeština.
- Veřejné rozhraní nenabízí odkaz pro editaci stránky ani zobrazení zdrojového souboru.
- Publikovaný obsah je veřejný a neobsahuje soukromé poznámky ani tajemství.
- Zdrojový recept je Markdown soubor umístěný v přijaté adresářové struktuře.
- Vestavěné fulltextové vyhledávání je pomocná cesta a nenahrazuje úplný katalog ani hierarchickou navigaci.

## Kanonické scénáře chování

| ID | Aktér a výchozí stav | Spouštěcí akce | Pozorovatelný výsledek | Priorita | Způsob ověření |
|---|---|---|---|---|---|
| `REQ-001` | Čtenář otevřel úvodní stránku | Zvolí sekci, oblast, zemi nebo typ | Uvidí odpovídající přehled se jmény, původem, typem a stručnými popisy dostupného obsahu | Kritická | Vizuální tok úvod → sekce → oblast |
| `REQ-002` | Čtenář našel konkrétní položku | Otevře odkaz receptu nebo nápoje | Uvidí název, úvod, ingredience, očíslované kroky a relevantní tipy či varování | Kritická | Vizuální detail reprezentativního receptu a nápoje |
| `REQ-003` | Správce přidal, upravil nebo odstranil platný obsahový soubor | Spustí generování, sestavení nebo uloží změnu při vývojovém náhledu | Katalog, přehledy, navigace a klientská data se deterministicky obnoví bez ručních změn odvozených souborů; nepotřebné výstupy zmizí | Vysoká | Životní cyklus receptu v izolované fixture, čisté sestavení a vývojový náhled |
| `REQ-004` | Přijatá změna je na větvi `main` | Proběhne publikační workflow | Ověřený statický web je dostupný na kanonické adrese a changelog zachovává úplnou historii, nejnovější rok změn nechává otevřený, roky bez změn vynechává a starší zobrazené roky balí | Vysoká | GitHub Actions, veřejný smoke a víceletý changelogový test |
| `REQ-005` | Čtenář hledá český nebo anglický termín obsažený v indexu | Odešle libovolnou kombinaci indexovaných slov bez ohledu na velikost písmen a diakritiku | Uvidí položky obsahující všechna stejná normalizovaná slova nebo jednoznačnou informaci, že výsledek nebyl nalezen | Střední | Automatické české i anglické názvy a slova z obsahu, poté vizuální smoke a dotaz bez shody |
| `REQ-006` | Čtenář vybírá jídla | Filtruje katalog podle názvu, suroviny nebo typu a vybere více položek | Karty ukazují stručný popis a postup, výběr je viditelný a dostupný v „Můj nákup“ | Vysoká | Mobilní katalog, filtr bez diakritiky a nulový stav |
| `REQ-007` | Čtenář má vybraná jídla | Změní násobek dávky, surovinovou alternativu nebo volitelnou část | Nákup obsahuje pouze zvolenou alternativu a zahrnuté části, uvedená čísla se přepočítají a chybějící množství zůstane přiznané | Kritická | Doménové testy a skutečné ovládání výběru |
| `REQ-008` | Čtenář nakupuje více jídel | Otevře nákup a označí připravené položky | Slučitelné suroviny jsou sečtené, uspořádané podle oddělení a mají dohledatelné zdrojové recepty; rozdílné jednotky se nemíchají | Kritická | Součet rajské a šunkofleků, koření, pomůcky a změna dávky |
| `REQ-009` | Čtenář má neúplné množství nebo jde do obchodu bez připojení | Doplní vlastní množství, kopíruje, stáhne nebo vytiskne seznam | Vlastní údaj je označený, textový export zachová suroviny, poznámky, původní nejistotu i odškrtnutí | Vysoká | Test exportu a prohlížeč |
| `REQ-010` | Čtenář začíná vařit | Otevře režim po krocích, přepíná kroky a označuje hotové | Vidí celý aktuální krok včetně poznámek, může otevřít suroviny a po návratu pokračovat; poslední krok nepředstírá dokončení přeskočených kroků | Vysoká | Mobilní dialog, návrat a dokončení |
| `REQ-011` | Čtenář obnoví stránku | Prohlížeč má dostupné místní úložiště | Výběr, vlastní množství, odškrtnutí a krok vaření se obnoví; změna nákupního požadavku zneplatní staré potvrzení dotčené položky | Vysoká | Obnova stavu, změna dávky a kontrola prohlížečem |
| `REQ-012` | Čtenář otevře obecný návod nebo úvod | Orientuje se v dokumentaci života | Úvod ukazuje dostupné oblasti a rychlé cesty; obecný návod nemá suroviny, vaření ani nákupní lištu | Vysoká | Úvod a veřejný průvodce bez kuchařských ovládacích prvků |

## Chybové a hraniční scénáře

| ID | Podmínka | Očekávané chování | Dopad při selhání | Způsob ověření |
|---|---|---|---|---|
| `REQ-E001` | Obsahový soubor nemá hlavní nadpis nebo jeho cesta neodpovídá podporované struktuře | Generátor skončí nenulovým kódem a vypíše konkrétní soubor a příčinu | Vadný obsah by mohl zmizet z navigace nebo poškodit katalog | Izolovaný negativní scénář generátoru |
| `REQ-E002` | Generované soubory neodpovídají zdrojovému obsahu | Samostatná kontrola skončí nenulovým kódem a vypíše všechny očekávané změny včetně changelogu a mazání bez zápisu | CI by jinak publikovalo zastaralou navigaci | `npm run docs:check` nad řízenou odchylkou |
| `REQ-E003` | Čtenář otevře neexistující veřejnou cestu | Hosting vrátí HTTP 404 a nezobrazí jiný recept jako náhradu | Čtenář musí rozpoznat neplatný nebo zastaralý odkaz | HTTP požadavek na neexistující cestu |
| `REQ-E004` | Odeslání informačního e-mailu selže po úspěšném nasazení | Workflow zachová úspěšně publikovaný web a označí oznámení jako neblokující selhání | Nedostupnost SMTP nesmí vrátit zveřejněný obsah | Kontrola podmínky `continue-on-error` a logu workflow |
| `REQ-E005` | Úložiště je poškozené nebo zápis není dostupný | Výběr funguje v aktuální stránce, rozhraní přizná omezení a nabídne export | Uživatel nesmí spoléhat na neprovedené uložení | Test obnovy a klientské chybové větve |
| `REQ-E006` | JavaScript nebo klientský katalog nejsou dostupné | Zdrojové recepty a statické odkazy zůstanou čitelné, společný nákup přizná nedostupnost | Obsah nesmí zmizet kvůli pomocné funkci | Statický HTML výstup a chybová větev |

## Ovládání a PDF

- Katalog zachová hledání, typ a filtr vybraných jídel při návratu z receptu.
- Nákup nabídne režim pro obchod, hledání surovin bez diakritiky, filtr oddělení, skrytí hotových a filtr množství k doplnění.
- Odškrtnutí nesmí zahodit rozepsané vlastní množství; změna dávky zneplatní údaj podle původního kontraktu.
- Vaření zachová dostupné ovládání mimo posouvaný obsah a započítá pouze zahrnuté kroky.
- Recept i celý nákup nabídnou čitelný náhled, přímé stažení PDF a samostatný tisk.
- Receptové PDF respektuje zvolenou dávku, alternativy a přílohy, obsahuje přípravné poznámky a pomůcky.
- Nákupní PDF a text obsahují i skryté a hotové položky; rozhraní to při aktivním filtru vysvětlí.
- Přehledy zachovají všechny názvy a popisy i na šířce 320 px bez skrytých sloupců.
- Katalog předem ukáže přípravnou poznámku ze zdroje, například nutnost marinování.
- Mobilní nabídka má viditelný popisek „Menu“; odeslání hledání odkryje výsledky a umožní dotaz upravit nebo hledání zavřít.
- Výsledky fulltextu otevírají obsah ve stejném panelu a zachovávají srozumitelnou cestu zpět.
- Vaření na nízké obrazovce při otevření a přechodu zobrazí aktuální krok nad trvale dostupným ovládáním.
- Uložení vlastního množství přesune fokus na příslušnou položku, případně na další výsledek při filtru neúplných množství.
- Změna zdrojového receptu obnoví jeho rozvařený postup od začátku a oznámí to; zachová výběr jídel.
- Návrat ke staré dávce neobnoví dříve zneplatněné odškrtnutí ani vlastní množství.
- Selhání zápisu místního nákupu zůstane viditelné v nákupní liště a nabídnuté exporty zůstanou dostupné.

Tyto scénáře rozvíjejí `REQ-006`, `REQ-008`, `REQ-009`, `REQ-010` a `QLT-003` podle upřesnění uživatele, který zdůraznil celkový design a zachování PDF.

## Obsahový kontrakt receptů

Jednotný zápis surovin, dávky, alternativ a postupu vlastní [formát receptu](recipe-format.md).

Výběr jídel a nákupní seznam jsou přijatým rozšířením na základě zadání uživatele ze dne 2026-09-12, které nahrazuje jejich původní vyloučení z rozsahu.

## Kvalitativní očekávání

| ID | Oblast | Scénář | Měřítko nebo hranice | Priorita |
|---|---|---|---|---|
| `QLT-001` | Reprodukovatelnost | Nezměněný checkout projde obnovou, kontrolou a sestavením | Uzamčené npm a DocFX nástroje, automatické vytvoření chybějících výstupů, následný nulový rozdíl generátoru a sestavení bez varování | Kritická |
| `QLT-002` | Konzistence | Změna kanonického nebo obsahového Markdownu vstoupí do CI | Platné interní odkazy, jedinečné `canonical_for`, platná metadata a žádné generované cache artefakty | Vysoká |
| `QLT-003` | Použitelnost | Čtenář otevře úvod a detail na běžném desktopovém a mobilním viewportu | Hlavní obsah a navigace zůstanou čitelné bez horizontální ztráty kroků receptu | Vysoká |
| `QLT-004` | Bezpečnost | CI sestavuje nedůvěryhodnou změnu nebo publikuje `main` | Ověření používá pouze čtecí token a publikační tajemství jsou dostupná jen zapisovacímu jobu | Vysoká |

## Slovník produktových pojmů

| Termín | Kanonický význam |
|---|---|
| Obsahová položka | Veřejný praktický návod; recepty a nápoje mají zvláštní obsahový kontrakt pod `food/` a `drink/` |
| Přehled | Generovaná stránka seskupující obsah podle sekce, oblasti, země nebo typu |
| Katalog receptů | Úplný generovaný seznam jídel a nápojů v části úvodní stránky |
| Publikovaný web | Statický výstup dostupný na kanonické adrese GitHub Pages |

## Pravidla změn požadavků

Akceptační kritérium se nesmí měnit pouze proto, aby prošla existující implementace nebo test.

Změna významného chování musí vzniknout z přijatého produktového rozhodnutí a současně aktualizovat scénář, testy, architekturu a veřejné rozhraní, pokud jsou dotčené.

Odstraněný požadavek se z historie změn nemaže bez vysvětlení v odpovídajícím rozhodnutí nebo změnovém záznamu projektu.
