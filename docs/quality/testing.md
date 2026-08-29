---
canonical_for: testing-strategy
status: accepted
last_verified: 2026-08-29
owner: quality
---

# Strategie testování

## Projektový testovací profil

Projekt kombinuje deterministickou kontrolu generovaných souborů, strukturální validaci repozitáře, integrační sestavení DocFX a několik reprezentativních vizuálních scénářů.

| Riziko nebo požadavek | Primární důkaz | Projektový vstup |
|---|---|---|
| Zastaralý katalog nebo TOC, `REQ-003` a `REQ-E002` | Generátor v režimu bez zápisu | `npm run docs:check` |
| Vadné odkazy, metadata nebo cache artefakty, `QLT-002` | Strukturální Node.js validátor | `npm run docs:validate` |
| Nekompatibilní Markdown, šablona nebo DocFX konfigurace, `QLT-001` | Sestavení s varováními jako chybami | `npm run docs:build` |
| České rozhraní bez editačních odkazů | Node test globálních metadat a tokenů, poté skutečný DocFX build | `npm run test:unit` a `npm run docs:build` |
| Neúplný, nečitelný nebo nedeterministický changelog, `REQ-004` | Skutečný `git-cliff` nad víceletou dočasnou historií s tagem, conventional, breaking i legacy commitem a přelomem roku ve dvou časových prostředích; kontroluje zdrojový commit, otevřené nejnovější období, sdělení o vynechávání prázdných roků, sbalené starší roky, jejich počty a kategorie i stabilní kotvy | `npm run test:unit` |
| Procházení katalogu a čitelnost detailu, `REQ-001`, `REQ-002`, `QLT-003` | Krokovatelný lokální scénář v prohlížeči | `npm run docs:serve` po sestavení |
| České a anglické vyhledání i nulový výsledek, `REQ-005` | Automatické termíny ze všech reprezentativních názvů, obsahu a cest, následované vizuálním smoke | `npm run test:unit` a lokální web |
| Vadná cesta nebo chybějící nadpis, `REQ-E001` | Izolované negativní obsahové fixture | `npm run test:unit` nad dočasnými kopiemi |
| Neexistující veřejná cesta, `REQ-E003` | HTTP 404 bez náhradního obsahu | Lokální server nebo GitHub Pages |
| Oprávnění, neměnné akce a publikační pořadí, `QLT-004` | Automatická strukturální kontrola workflow a review oddělených jobů | `npm run docs:validate` a `.github/workflows/main.yml` |

### Trvalá obsahová kontrola

Věcnou správnost ingrediencí, množství a kulinářského postupu potvrzuje člověk znalý receptu, protože ji technický build neumí spolehlivě odvodit.

Tato odpovědnost je provozní podmínka obsahové změny, nikoli technický úkol s nepravdivým stavem dokončení.

Přesné příkazy a smoke kroky jsou v [`../development/commands.md`](../development/commands.md).

## Cíl

Testy chrání důležité pozorovatelné chování, klíčové scénáře a reálná rizika.

Nevznikají kvůli formálnímu počtu, procentu pokrytí ani testování triviálních implementačních detailů.

Testovací strategie se odvozuje z produktových scénářů, architektury, historie závad a dopadu selhání.

## Volba typu testu

Nejprve určuj, co musí být pozorovatelné a jaké riziko test snižuje.

Teprve poté vybírej nástroj a úroveň.

| Potřeba nebo riziko | Preferovaný důkaz |
|---|---|
| Vizuální uživatelský tok | Krokovatelný scénář v reálném nebo věrohodném UI s viditelným výsledkem |
| Vzhled, rozložení nebo stav komponenty | Vizuální komponentový scénář a cílené porovnání stabilního výstupu |
| Integrace více částí systému | Integrační test přes skutečné hranice s kontrolovanými závislostmi |
| Veřejný protokol nebo kompatibilita | Kontraktní test proti kanonickému schématu |
| Doménové pravidlo bez UI | Rychlý automatizovaný test pozorovatelného výsledku |
| Mnoho kombinací vstupů a invariantů | Parametrizovaný nebo vlastnostní test |
| Souběh, opakování nebo idempotence | Cílený test selhání a opakovaného provedení |
| Výkonová hranice | Reprodukovatelný benchmark nebo zátěžový scénář |
| Bezpečnostní hranice | Negativní test a odpovídající bezpečnostní kontrola |
| Nasazení nebo obnova | Smoke test prostředí, rollback nebo řízené cvičení obnovy |

Jedna funkce může potřebovat více vrstev pouze tehdy, když každá chrání jiné důležité riziko.

Stejný scénář nekopíruj na všech úrovních bez odlišné hodnoty.

## Vizuálně sledovatelné scénáře

Vše, co lze smysluplně ověřit vizuálně, testuj tímto způsobem.

Vizuální test má umožnit sledovat kroky, stav aplikace a konečný výsledek.

Preferuj nástroj přirozený pro technologii projektu, například browser test s trace, komponentový scénář nebo řízený desktopový tok.

Vizuální scénář musí:

- odkazovat na produktový identifikátor `REQ-*`,
- začínat z deterministického a pochopitelného stavu,
- používat významné uživatelské kroky místo interních selektorových triků,
- zpřístupnit screenshot, trace, video nebo stav komponenty tam, kde pomůže diagnostice,
- ověřit viditelný výsledek a důležité vedlejší účinky,
- po sobě bezpečně uklidit data nebo používat izolovaný kontext,
- být krokovatelný lokálně bez závislosti pouze na CI.

Trace a obrazové artefakty se standardně uchovávají při selhání nebo podle projektové retenční politiky.

Citlivá data se do nich nesmějí dostat.

Vizuální snapshot se používá pouze pro stabilní zobrazení, u kterého změna pixelů představuje skutečné riziko.

Masivní snapshot celé aplikace není náhradou srozumitelných scénářů.

## Automatizované nevizuální testy

Chování, které vizuálně testovat nelze nebo by to nedávalo smysl, ověř automatizovaným testem na nejnižší úrovni, která zachovává důležitý kontrakt.

Nevaz test na soukromé pořadí volání, pokud toto pořadí není součástí chování.

Mock použij pro kontrolovanou hranici, nikoli jako kopii interní implementace.

Databázi, frontu nebo protokol nahrazuj pouze tehdy, když test neztrácí riziko, které má chránit.

Preferuj malou sadu rychlých testů pro čistá pravidla, dostatečné integrační testy pro hranice a několik reprezentativních end-to-end scénářů.

Projekt používá vestavěný Node.js test runner pro čisté vyhledávací funkce, spouští generátor nad dočasnou kopií obsahu pro negativní vstupy a ověřuje skutečný uzamčený `git-cliff` nad dočasnou Git historií bez změny pracovního stromu.

Přesný poměr není univerzální a vychází z architektury projektu.

Pomalý test bez jedinečné hodnoty odstraň nebo přesuň na vhodnější úroveň.

## Co netestovat

Nevytvářej test pouze pro:

- automatické gettery a settery bez chování,
- konstruktor, který pouze přiřazuje hodnoty,
- konstantu nebo mapování zaručené kompilátorem,
- soukromou metodu oddělenou od pozorovatelného výsledku,
- implementační detail, který lze libovolně refaktorovat,
- třetí stranu bez vlastní integrační hranice,
- generovaný kód,
- duplicitní pokrytí stejného triviálního případu.

Výjimka je přípustná, pokud zdánlivě triviální prvek chrání historickou regresi, kompatibilitu nebo bezpečnostní invariant.

Důvod musí být z testu zřejmý.

## Výběr scénářů podle rizika

Každý důležitý scénář posuzuj podle dopadu, pravděpodobnosti, zjistitelnosti a ceny opravy.

Prioritu mají zejména:

- ztráta nebo poškození dat,
- porušení bezpečnosti nebo oprávnění,
- nesprávná platba nebo jiný nevratný účinek,
- porušení veřejné kompatibility,
- nedostupnost hlavní uživatelské cesty,
- chyby v migraci, rollbacku nebo opakování,
- historicky častá regrese,
- složitá hranice mezi moduly nebo systémy.

Pokrytí řádků je diagnostická metrika.

Není cílem ani důkazem správnosti.

Nízké pokrytí kritického toku je problém, i když celkové procento vypadá dobře.

## Průběžné ověřování změny

Před změnou spusť baseline relevantní pro dotčenou oblast.

Během práce používej nejrychlejší test, který spolehlivě zachytí aktuální riziko.

Po dokončení spusť cílené scénáře a širší regresi odpovídající rozsahu změny.

Přesné příkazy patří do [`../development/commands.md`](../development/commands.md).

Doporučené pořadí je:

1. reprodukce problému nebo potvrzení výchozího scénáře,
2. nejbližší cílený automatizovaný nebo vizuální test,
3. statické kontroly a sestavení dotčené části,
4. integrační hranice,
5. reprezentativní smoke scénář,
6. širší projektová sada podle rizika.

Test, který před změnou prokazuje závadu, musí po opravě prokázat očekávané chování.

U nové funkce test vzniká z akceptačního scénáře, nikoli z hotové implementace.

## Důkazy a diagnostika

Pracovní záznam uvádí přesný příkaz, prostředí, výsledek a cestu k relevantnímu artefaktu.

Pouhé „testy prošly“ nestačí u dlouhého nebo rizikového úkolu.

Selhání musí být rozlišeno na existující baseline, regresi, nestabilitu prostředí nebo chybu testu.

Nestabilní test se neopakuje potichu, dokud náhodou neprojde.

Nejdříve se zjistí příčina.

Dočasné retry může být pouze přechod s vlastníkem a podmínkou odstranění.

## Testovací kód

Test je udržovaný kód.

Má používat doménově čitelné názvy, minimum skrytých helperů a jasnou přípravu, akci a ověření.

Sdílená testovací abstrakce vzniká až při skutečně stabilním společném významu.

Příliš chytrý testovací framework může skrýt chování stejně jako příliš chytrý produkční helper.

Veřejné prvky testovací infrastruktury vytvořené projektem podléhají stejným dokumentačním pravidlům jako ostatní vlastní kód.

Technická viditelnost vyžadovaná frameworkem nemění povinnost stručně popsat účel veřejného prvku.

## Změna strategie

Nový typ testu nebo nástroj se zavádí, pokud pokrývá důležité riziko lépe než existující prostředky.

Významná změna testovací architektury se prozkoumá a případně zaznamená v ADR.

Konkrétní nástroje, umístění testů a CI artefakty se po inicializaci doplní sem nebo do odkazovaných strojových konfigurací bez kopírování verzí.
