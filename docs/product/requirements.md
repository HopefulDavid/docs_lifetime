---
canonical_for: product-requirements
status: accepted
last_verified: 2026-09-21
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
- Automatická synchronizace mezi zařízeními, kalendářní plánování, výpočet výživových hodnot a správa zásob, ruční předání nákupu je součástí produktu.
- Plná dostupnost celého webu bez připojení, pro obchod bez připojení slouží kopie textového seznamu, PDF nebo tisk.
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
| `REQ-002` | Čtenář našel konkrétní položku | Otevře recept nebo nápoj a přepne do Uvařit | Detail nejprve nabídne ingredience a teprve část Uvařit zobrazí postup, jeho kroky a odpovídající obsah článku | Kritická | Vizuální detail, přepnutí sekcí a přímý odkaz na krok |
| `REQ-003` | Správce přidal, upravil nebo odstranil platný obsahový soubor | Spustí generování, sestavení nebo uloží změnu při vývojovém náhledu | Katalog, přehledy, navigace a klientská data se deterministicky obnoví bez ručních změn odvozených souborů, nepotřebné výstupy zmizí | Vysoká | Životní cyklus receptu v izolované fixture, čisté sestavení a vývojový náhled |
| `REQ-004` | Přijatá změna je na větvi `main` | Proběhne publikační workflow | Ověřený statický web je dostupný na kanonické adrese, oznámení se odešle až po nasazení nové revize `main` nejvýše jednou a changelog řadí úplnou historii od nejnovějších změn, odkazuje na dostupné změněné články, nejnovější rok nechává otevřený a starší roky balí | Vysoká | GitHub Actions, veřejný smoke a víceletý changelogový test |
| `REQ-005` | Čtenář hledá český nebo anglický termín obsažený v indexu | Odešle libovolnou kombinaci indexovaných slov bez ohledu na velikost písmen a diakritiku | Uvidí položky obsahující všechna stejná normalizovaná slova nebo jednoznačnou informaci, že výsledek nebyl nalezen | Střední | Automatické české i anglické názvy a slova z obsahu, poté vizuální smoke a dotaz bez shody |
| `REQ-006` | Čtenář vybírá jídla a nápoje | Hledá jídlo nebo pití podle názvu, filtruje katalog podle typu a vybere více položek | Karty ukazují stručný popis a postup, výběr je viditelný a dostupný v „Můj nákup“ | Vysoká | Mobilní katalog, filtr bez diakritiky a nulový stav |
| `REQ-007` | Čtenář má vybraná jídla | Změní násobek dávky, surovinovou alternativu nebo volitelnou část | Nákup obsahuje pouze zvolenou alternativu a zahrnuté části, uvedená čísla se přepočítají a chybějící množství zůstane přiznané | Kritická | Doménové testy a skutečné ovládání výběru |
| `REQ-008` | Čtenář nakupuje více jídel | Otevře nákup a označí připravené položky | Slučitelné suroviny jsou sečtené, uspořádané podle oddělení a mají dohledatelné zdrojové recepty, rozdílné jednotky se nemíchají | Kritická | Součet rajské a šunkofleků, koření, pomůcky a změna dávky |
| `REQ-009` | Čtenář jde do obchodu bez připojení | Kopíruje text, uloží PDF nebo vytiskne seznam | Export zachová suroviny, poznámky, zdrojová množství i odškrtnutí, samostatné stažení TXT se nenabízí | Vysoká | Test exportu a prohlížeč |
| `REQ-010` | Čtenář začíná vařit | Otevře režim po krocích, přepíná kroky a označuje hotové | Vidí celý aktuální krok včetně poznámek, může otevřít suroviny a po návratu pokračovat, poslední krok nepředstírá dokončení přeskočených kroků | Vysoká | Mobilní dialog, návrat a dokončení |
| `REQ-011` | Čtenář obnoví stránku | Prohlížeč má dostupné místní úložiště | Výběr, odškrtnutí a krok vaření se obnoví, změna nákupního požadavku zneplatní staré potvrzení dotčené položky | Vysoká | Obnova stavu, změna dávky a kontrola prohlížečem |
| `REQ-012` | Čtenář otevře obecný návod nebo úvod | Orientuje se v dokumentaci života | Obecný Úvod ukazuje dostupné oblasti, samostatná Kuchyně obsahuje katalog a podsekce Jídlo, Nápoje a Můj nákup, Úvod a obecné návody nemají receptové ovládání | Vysoká | Průchod hierarchií, obecný úvod a veřejný průvodce |
| `REQ-013` | Dva lidé mají své nákupy | První zvolí Export nákupu a předá odkaz nebo kód, druhý otevře odkaz nebo Import nákupu | Příjemce vidí náhled a zvolí sloučení nebo převzetí, výběr, dávky, varianty, části a platné hotové položky se přenesou až po potvrzení | Vysoká | Přenos mezi oddělenými nákupy, konflikty, obnova a vrácení změny |
| `REQ-014` | Autor upravil recept nebo slovník | Spustí kontrolu obsahu, generování nebo sestavení | Neplatné suroviny a tabulky zastaví zápis s konkrétním místem a nápravou, `neuvedeno` vypíše warning s řádkem, závěrečný souhrn webu uvede počet obsahových varování a sestavení nezablokuje | Vysoká | Negativní fixture, neblokující warning a obecná stránka bez receptového kontraktu |

## Chybové a hraniční scénáře

| ID | Podmínka | Očekávané chování | Dopad při selhání | Způsob ověření |
|---|---|---|---|---|
| `REQ-E001` | Obsahový soubor nemá hlavní nadpis nebo jeho cesta neodpovídá podporované struktuře | Generátor skončí nenulovým kódem a vypíše konkrétní soubor a příčinu | Vadný obsah by mohl zmizet z navigace nebo poškodit katalog | Izolovaný negativní scénář generátoru |
| `REQ-E002` | Generované soubory neodpovídají zdrojovému obsahu | Samostatná kontrola skončí nenulovým kódem a vypíše všechny očekávané změny včetně changelogu a mazání bez zápisu | CI by jinak publikovalo zastaralou navigaci | `npm run docs:check` nad řízenou odchylkou |
| `REQ-E003` | Čtenář otevře neexistující veřejnou cestu | Hosting vrátí HTTP 404 a nezobrazí jiný recept jako náhradu | Čtenář musí rozpoznat neplatný nebo zastaralý odkaz | HTTP požadavek na neexistující cestu |
| `REQ-E004` | Odeslání informačního e-mailu selže po úspěšném nasazení | Workflow zachová úspěšně publikovaný web a označí oznámení jako neblokující selhání | Nedostupnost SMTP nesmí vrátit zveřejněný obsah | Kontrola podmínky `continue-on-error` a logu workflow |
| `REQ-E005` | Úložiště je poškozené nebo zápis není dostupný | Výběr funguje v aktuální stránce, rozhraní přizná omezení a nabídne export | Uživatel nesmí spoléhat na neprovedené uložení | Test obnovy a klientské chybové větve |
| `REQ-E006` | JavaScript nebo klientský katalog nejsou dostupné | Zdrojové recepty a statické odkazy zůstanou čitelné, společný nákup přizná nedostupnost | Obsah nesmí zmizet kvůli pomocné funkci | Statický HTML výstup a chybová větev |
| `REQ-E007` | Import je poškozený, příliš velký, obsahuje cizí ID nebo jinou revizi receptu | Import se odmítne před změnou nákupu a nabídne konkrétní nápravu | Cizí data nesmějí vytvořit neplatný nákup ani potvrdit jiné množství | Kontraktní testy, limit rozbalení a chybový dialog |

## Množství v nákupu

Množství určuje zdrojový recept, čtenář mění pouze dávku, varianty a zahrnuté části.

Rozhraní nenabízí vlastní zadání množství ani tlačítko nebo filtr chybějících množství.

Pokud autor množství dosud nedoplnil, recept a nákup zobrazí „Množství neuvedeno“ a export zachová původní údaj.

Platné vlastní údaje uložené ve starší verzi zůstanou označené pro čtení a přenos, aby aktualizace neztratila existující data.

Jejich zneplatnění změnou nákupu a řešení rozdílů při importu zachovávají dosavadní kontrakt.

## Předání nákupu

Export obsahuje celý nákup bez ohledu na filtry.

Přenos nezahrnuje průběh vaření.

Sloučení zachová oba výběry bez zdvojení společného receptu a spojí hotové položky, pokud jejich složení a výsledné množství odpovídají.

Rozdílná nastavení společného receptu nebo různá platná vlastní množství vyžadují samostatnou volbu.

Nedořešený konflikt nelze potvrdit.

Při změně složení společné suroviny se její staré odškrtnutí a vlastní údaj nepřenesou a náhled vyžádá novou kontrolu.

Převzetí celého nákupu nahradí místní výběr, množství a odškrtnutí.

Poslední import lze v otevřené stránce vrátit.

Sloučení nepřenáší zrušení odškrtnutí jako pokyn druhému člověku.

K převzetí přesného stavu včetně zrušených potvrzení slouží převzetí celého nákupu.

Odkaz představuje jednorázovou kopii, ne automaticky synchronizovaný seznam.

Každý další stav vyžaduje nový export.

Dialog nabízí kopírování odkazu a dostupné systémové sdílení, přiznává délku zprávy i přístup kohokoli s odkazem a neodesílá nákup bez uživatelské akce.

Vysvětlující texty rozhraní oddělují jednotlivé věty do viditelných odstavců a nepoužívají středníky.

Průvodce vysvětluje stabilní principy výběru, nákupu, vaření a sdílené kopie bez přepisování každého názvu tlačítka.

## Ovládání a PDF

Popisek, příklady a nápověda katalogového hledání popisují hledání jídel a nápojů, jeho výsledkem jsou recepty.

Hledání samostatných surovin patří do nákupního seznamu.

Navigace Výběr → Nakoupit → Uvařit propojuje samostatná zobrazení a ukazuje právě otevřenou část.

V nákupu část Uvařit nabídne vybraná jídla s uloženou dávkou, průběhem, přímým vstupem do vaření po krocích a vedlejším odkazem na celý postup.

Spouštěcí akce na kartě i v detailu rozlišuje nové, rozpracované a dokončené vaření, uložený postup při otevření neresetuje.

Z vaření lze spodní lištou přejít zpět k vybraným jídlům v sekci Uvařit, karty nastavení ve části Nakoupit neobsahují tlačítko Vařit.

Detail v části Nakoupit ukazuje ingredience a nastavení, zatímco část Uvařit ukazuje celý postup a vstup do vaření po krocích.

Každá ingredience v detailu i nastavení vybraného jídla má checkbox „Mám připraveno“ se stejným stavem jako ve společném nákupu.

První potvrzení dosud nevybraného receptu jej přidá do nákupu s aktuální dávkou a variantami, na tento účinek upozorňuje text před ingrediencemi.

Pokud se surovina slučuje z více použití, detail výslovně uvádí celkové množství, které zaškrtnutí potvrzuje.

Změna potvrzení se projeví také v již rozbalených nastaveních ostatních jídel.

Zahrnutí volitelné suroviny má samostatnou akci „Zahrnout“ nebo „Vynechat“, u vynechané suroviny je potvrzení přípravy nedostupné.

Volitelná skupina má samostatně popsaný přepínač zahrnutí.

Platnost odškrtnutí se řídí `REQ-011`.

Pravý obsah článku odkazuje pouze na viditelné části.

Přepínání zachová nastavení, otevřené zdroje a filtry.

Historii prohlížeče a přímé odkazy na kroky lze použít i po obnovení stránky.

Bez klientského rozšíření zůstávají ingredience i celý postup čitelné ve statickém dokumentu.

Ikony doplňují textové popisky v navigaci, přehledech, nákupních akcích a receptech.

Jejich vykreslení nezávisí na systémovém emoji fontu.

Konkrétní země mají vedle názvu SVG vlajku.

Obecné oblasti používají symbol světa a nepředstírají konkrétní zemi.

- Katalog zachová hledání, typ a filtr vybraných jídel při návratu z receptu.
- Nákup nabídne režim pro obchod, hledání surovin bez diakritiky, filtr oddělení a skrytí hotových.
- Vaření zachová dostupné ovládání mimo posouvaný obsah a započítá pouze zahrnuté kroky.

- Dokončení kroku má jedinou hlavní akci, která zároveň pokračuje postupem, hotový krok lze vrátit mezi nedokončené.

- Přehled kroků rozlišuje aktuální, hotové, čekající a vynechané kroky, závěrečný souhrn vznikne teprve po dokončení všech zahrnutých kroků.
- Recept i celý nákup nabídnou čitelný náhled, přímé stažení PDF a samostatný tisk.
- Receptové PDF respektuje zvolenou dávku, alternativy a přílohy, obsahuje přípravné poznámky a pomůcky.
- Nákupní PDF a text obsahují i skryté a hotové položky, rozhraní to při aktivním filtru vysvětlí.
- Přehledy zachovají všechny názvy a popisy i na šířce 320 px bez skrytých sloupců.
- Katalog předem ukáže přípravnou poznámku ze zdroje, například nutnost marinování.
- Mobilní nabídka má viditelný popisek „Menu“, odeslání hledání odkryje výsledky a umožní dotaz upravit nebo hledání zavřít.
- Výsledky fulltextu otevírají obsah ve stejném panelu a zachovávají srozumitelnou cestu zpět.
- Vaření na nízké obrazovce při otevření a přechodu zobrazí aktuální krok nad trvale dostupným ovládáním.
- Změna zdrojového receptu obnoví jeho rozvařený postup od začátku a oznámí to, zachová výběr jídel.
- Návrat ke staré dávce neobnoví dříve zneplatněné odškrtnutí ani vlastní množství.
- Selhání zápisu místního nákupu zůstane viditelné v nákupní liště a nabídnuté exporty zůstanou dostupné.

Tyto scénáře rozvíjejí `REQ-006`, `REQ-008`, `REQ-009`, `REQ-010` a `QLT-003`.

## Obsahový kontrakt receptů

Jednotný zápis surovin, dávky, alternativ a postupu vlastní [formát receptu](recipe-format.md).

## Kvalitativní očekávání

| ID | Oblast | Scénář | Měřítko nebo hranice | Priorita |
|---|---|---|---|---|
| `QLT-001` | Reprodukovatelnost | Nezměněný checkout projde obnovou, kontrolou a sestavením | Uzamčené nástroje, automatická příprava, nulový rozdíl generátoru a DocFX bez varování, obsahová upozornění podle `REQ-014` jsou neblokující | Kritická |
| `QLT-002` | Konzistence | Změna kanonického nebo obsahového Markdownu vstoupí do CI | Platné interní odkazy, jedinečné `canonical_for`, platná metadata a žádné generované cache artefakty | Vysoká |
| `QLT-003` | Použitelnost | Čtenář otevře úvod a detail na běžném desktopovém a mobilním viewportu | Hlavní obsah a navigace zůstanou čitelné bez horizontální ztráty kroků receptu | Vysoká |
| `QLT-004` | Bezpečnost | CI sestavuje nedůvěryhodnou změnu nebo publikuje `main` | Ověření používá pouze čtecí token a publikační tajemství jsou dostupná jen zapisovacímu jobu | Vysoká |

## Slovník produktových pojmů

| Termín | Kanonický význam |
|---|---|
| Obsahová položka | Veřejný praktický návod, recepty a nápoje mají zvláštní obsahový kontrakt pod `food/` a `drink/` |
| Přehled | Generovaná stránka seskupující obsah podle sekce, oblasti, země nebo typu |
| Katalog receptů | Úplný generovaný seznam jídel a nápojů na vstupní stránce Kuchyně |
| Publikovaný web | Statický výstup dostupný na kanonické adrese GitHub Pages |

## Pravidla změn požadavků

Akceptační kritérium se nesmí měnit pouze proto, aby prošla existující implementace nebo test.

Změna významného chování musí vzniknout z přijatého produktového rozhodnutí a současně aktualizovat scénář, testy, architekturu a veřejné rozhraní, pokud jsou dotčené.

Odstraněný požadavek se z historie změn nemaže bez vysvětlení v odpovídajícím rozhodnutí nebo změnovém záznamu projektu.
