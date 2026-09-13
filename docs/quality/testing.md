---
canonical_for: testing-strategy
status: accepted
last_verified: 2026-09-13
owner: quality
---

# Strategie testování

## Projektový testovací profil

Testy používají vestavěný `node:test`; sdílené prostředí vlastní `tests/fixtures/`, zatímco konkrétní vstupy a očekávání zůstávají ve scénářích.

Fixture docsetu spouští skutečný generátor nad kopií ručních zdrojů, fixture changelogu skutečný `git-cliff` nad dočasnou historií a nákupní fixture připravuje nový katalog v paměti s kopiemi vyhledaných receptů.

Parser má samostatné scénáře v `tests/recipe-content.test.mjs`; chybné tabulky a přenosové payloady jsou pojmenované, aby výstup runneru určil selhávající variantu.

Dočasné adresáře uklízí kontext testu také po selhání; kontrola formátování přes připnutý Prettier je součástí `npm test`.

Projekt kombinuje deterministickou kontrolu generovaných souborů, strukturální validaci repozitáře, integrační sestavení DocFX a několik reprezentativních vizuálních scénářů.

| Riziko nebo požadavek | Primární důkaz | Projektový vstup |
|---|---|---|
| Zastaralý nebo chybějící docset, `REQ-003` a `REQ-E002` | Přidání, změna, přesun a odstranění receptu; samostatná kontrola bez zápisu včetně changelogu | `tests/generate-docs.test.mjs` a `npm run docs:check` |
| Vadné odkazy, metadata nebo cache artefakty, `QLT-002` | Strukturální Node.js validátor | `npm run docs:validate` |
| Nekompatibilní Markdown, šablona nebo DocFX konfigurace, `QLT-001` | Sestavení s varováními jako chybami | `npm run docs:build` |
| České rozhraní bez editačních odkazů | Node test globálních metadat a tokenů, poté skutečný DocFX build | `npm run test:unit` a `npm run docs:build` |
| Neúplný, nečitelný nebo nedeterministický changelog, `REQ-004` | Skutečný `git-cliff` nad víceletou dočasnou historií s tagem, conventional, breaking i legacy commitem a přelomem roku ve dvou časových prostředích; kontroluje zdrojový commit, otevřené nejnovější období, sdělení o vynechávání prázdných roků, sbalené starší roky, jejich počty a kategorie i stabilní kotvy | `npm run test:unit` |
| Procházení katalogu a čitelnost detailu, `REQ-001`, `REQ-002`, `QLT-003` | Krokovatelný lokální scénář v prohlížeči | `npm run docs:serve` po sestavení |
| České a anglické vyhledání i nulový výsledek, `REQ-005` | Automatické termíny ze všech reprezentativních názvů, obsahu a cest, následované vizuálním smoke | `npm run test:unit` a lokální web |
| Vadná cesta nebo chybějící nadpis, `REQ-E001` | Izolované negativní obsahové fixture | `npm run test:unit` nad dočasnými kopiemi |
| Neexistující veřejná cesta, `REQ-E003` | HTTP 404 bez náhradního obsahu | Lokální server nebo GitHub Pages |
| Chybný společný nákup, `REQ-007` až `REQ-009` | Součty skutečných receptů, alternativy, volitelné přílohy, neslučitelné jednotky a vlastní množství | `tests/kitchen-core.test.mjs` |
| Zastaralé odškrtnutí a poškozený místní stav, `REQ-011`, `REQ-E005` | Změna dávky a zdrojů, validace uložených dat, export | `tests/kitchen-core.test.mjs` |
| Návrat starého potvrzení nebo posunutý postup po aktualizaci, `REQ-011` | Změna dávky a návrat, shodná a neshodná revize, starší stav bez revize | `tests/kitchen-core.test.mjs` |
| Obecný návod zaměněný za recept, `REQ-012` | Izolovaný návod bez ingrediencí zůstane mimo JSON a beze změn; návštěva skutečného průvodce | `tests/generate-docs.test.mjs` a lokální web |
| Zapomenutá nebo vadná surovina a neblokující množství, `REQ-014` | Neznámý název, duplicita, neúplný řádek, chybějící hlavička, prázdná skupina, warning s řádkem a jeho odstranění po doplnění; obecný návod zůstává mimo kontrolu receptů | `tests/generate-docs.test.mjs` a `npm run docs:validate-content` |
| Vadný nebo rozporný přenos nákupu, `REQ-013` a `REQ-E007` | Gzip i prostý kód, revize, neplatné hodnoty a omezení rozbalení; sloučení, nahrazení, konflikty dávek i vlastních množství a platnost odškrtnutí | `tests/kitchen-transfer.test.mjs` a browser scénáře |
| Zápis při vadném vstupu | Neplatný recept, duplicitní surovina a neznámá taxonomie nesmějí přepsat zdroje ani katalog | `tests/generate-docs.test.mjs` |
| Výstupy chybí po klonování | Nákupní testy vytvářejí katalog ze zdrojů v paměti; generování vytvoří celý ignorovaný docset | `npm test` nad čistou kopií |
| HTML a JSON se rozcházejí nebo mají nefunkční odkazy | Kontrola veřejných stránek podle manifestu, shody katalogu, fulltextu, statických surovin a počtu kroků, interních odkazů a PDF assetů | `npm run docs:verify-site` automaticky na konci buildu |
| Mobilní nákup a vaření, `REQ-006` až `REQ-010` | Skutečné ovládání katalogu, nastavení, checklistu a dialogu | [Smoke scénáře](../development/commands.md#výběr-nákup-a-vaření) |
| Oprávnění, neměnné akce a publikační pořadí, `QLT-004` | Automatická strukturální kontrola workflow a review oddělených jobů | `npm run docs:validate` a `.github/workflows/main.yml` |

### Ověření SVG ikon, vaření a čitelnosti nástrojů, 2026-09-13

Po zavedení ikon prošlo 46 Node testů; závěrečná regrese po refaktoringu obsahuje 73 úspěšných testů a subtestů díky samostatnému pojmenování již kontrolovaných chybových variant.

Prošel celý `npm test` včetně formátování, generování, kontroly shody a strukturální validace; `git-cliff` potřeboval přístup mimo sandbox k dočasnému testovacímu repozitáři.

Sestavení a následná kontrola artefaktu ověřily 54 veřejných stránek, 27 receptů a čtyři TOC s nulovým počtem chyb a varování DocFX; 68 známých upozornění na neuvedené množství zůstalo beze změny.

| Oblast | Skutečný důkaz | Hranice ověření |
|---|---|---|
| Všechny stránky | Výchozí i finální snímky všech 54 URL; závěrečný průchod na 1440 × 1000 a 390 × 844 bez vodorovného přesahu a chybějícího SVG | Vizuální přehledy horní, střední a dolní části doplněné detailními snímky; nikoli všechny kombinace stavu každé stránky |
| Ikony | Vlajky s názvem země, katalog, nadpisy, asynchronní obsah navigace, prázdný nákup a oddělení skutečného seznamu jsou vykreslené | SVG jsou dekorativní, význam zůstává v textu; kontrolované jsou vybrané lokální ikony |
| Nákup a hledání | Nulový výsledek a zrušení filtrů, rajská se šunkofleky, součet cibule 2 ks a vajec 3 ks, odškrtnutí cibule a obnova po načtení | Jde o místní stav jednoho prohlížeče |
| Motiv a úzký displej | Nákup i vaření vizuálně na tmavém tabletu 768 × 1024; aktivní krok s dostupným hlavním tlačítkem také na 320 × 740 | Chromium v Codex; fyzické iOS/Android a jiné enginy nejsou zahrnuté |
| Refaktoring generátoru | Obsahový docset před a po rozdělení odpovědností byl shodný v názvech, pořadí i jednotlivých bytech | Následné úmyslné změny ikon a veřejného návodu mění vlastní výstupy |
| Vývojový server | `docs:dev` sestavil web, znovu sestavil po uložení zdroje a po Ctrl+C uvolnil port 8765 | Automatické obnovení stránky není součástí serveru |

Průběžné logy, inventura a snímky jsou v ignorovaném `private/ui-audit/`; trvalý důkaz představuje tento záznam a [opakovatelný smoke](../development/commands.md#výběr-nákup-a-vaření).

V prohlížeči Chromium byl ověřen mobilní dialog na 390 px a nízký displej 844 × 390, obnova druhého kroku, vrácení hotového kroku, přechod na poslední krok s návratem k nedokončenému a dokončení čtyř kroků tikka masaly bez volitelného naanu.

Zavření tlačítkem i Escape vrátilo fokus na spouštěcí tlačítko a odstranilo kotvu vaření; tento průchod nenahrazuje test fyzických mobilních zařízení ani úplný audit přístupnosti.

Zkušební nákup byl vymazán přes rozhraní a motiv vrácen na automatický.

### Trvalá obsahová kontrola

Jednotnou podobu receptů a otevřené obsahové otázky vlastní [formát receptu](../product/recipe-format.md).

Věcnou správnost ingrediencí, množství a kulinářského postupu potvrzuje člověk znalý receptu, protože ji technický build neumí spolehlivě odvodit.

Tato odpovědnost je provozní podmínka obsahové změny, nikoli technický úkol s nepravdivým stavem dokončení.

Přesné příkazy a smoke kroky jsou v [`../development/commands.md`](../development/commands.md).

### Ověření rozšíření o nákup a vaření, 2026-09-12

Ověření proběhlo na Windows s Node.js 24.13.0, npm 11.6.2, .NET SDK 10.0.401 a připnutým DocFX 2.78.5.

| Vrstva | Skutečný výsledek | Omezení důkazu |
|---|---|---|
| Automatické scénáře | Všech 21 testů prošlo, včetně changelog fixture, hledání, generátoru, nákupních součtů a obnovy stavu | `git-cliff` potřeboval spuštění mimo sandbox kvůli přístupu k dočasné Git fixture |
| Standardní `npm test` před obnovou Git | Testy prošly, následné generování changelogu skončilo chybou chybějícího repozitáře | Tehdejší kopie neměla `.git`; překážku odstranila [obnova propojení](../operations/runbook.md#obnova-lokálního-git-propojení) |
| Samostatné kontroly před obnovou Git | Generátor v režimu `--check`, strukturální validátor a DocFX sestavení s varováními jako chybami prošly | Tehdejší artefakt používal existující changelog bez ověřitelné shody s historií |
| Celá sbírka | Všech 27 receptů má ve skutečném mobilním prohlížeči vykreslené suroviny a postup bez vodorovného přesahu na šířce 390 px | Jde o kontrolu DOM a průchod stránek, nikoli pixelové snímky každé kombinace nastavení |
| Reprezentativní vizuální scénáře | Katalog, nákup a vaření byly ovládané a vizuálně zkontrolované na šířkách 320, 390 a 1440 px, včetně světlého a tmavého motivu | Nejde o úplný audit WCAG ani test všech prohlížečů |
| Nákup a místní stav | Součty cibule a vajec, změna dávky, alternativy, příloha, odškrtnutí, skrytí hotových, vlastní množství, obnovení po načtení a vrácení vymazaného výběru odpovídají scénářům | Souběžná práce v několika oknech není podporovaná |
| Vaření | Přechod kroků, zapamatování postupu, vynechaná příloha, kontrola přeskočených kroků, zavření klávesou Escape a přepočet po zavření dialogu fungují | Časy a množství uvnitř původního textu zůstávají beze změny |
| Export | Kopírovaný text obsahuje společné součty, původní údaje a vlastní množství | Vestavěný prohlížeč po stisku „Stáhnout“ nepotvrdil událost stažení; tiskový dialog nebyl vizuálně ověřen |
| Statický obsah a regrese | HTML všech receptů obsahuje tabulky i postup bez klientského rozšíření, katalog má náhradní odkazy a původní hledání funguje bez chyby konzole | Odmítnutí úložiště bylo zkontrolováno v kódu, nikoli simulováno v prohlížeči |

Zkušební výběr jídel byl po průchodu odstraněn přes rozhraní a motiv vrácen na automatický.

Po obnovení skutečné Git historie dne 2026-09-12 prošel celý `npm test`, včetně všech 21 testů, generování aktuálního changelogu, kontroly katalogu a strukturální validace.

Prošel také standardní `npm run docs:build` s nově odvozeným changelogem, čistým výstupním adresářem a nulovým počtem varování a chyb.

Trvalé obsahové nejistoty a odpovědnost za jejich doplnění vlastní [obsahová revize](../product/recipe-format.md#obsahová-revize).

### Navazující audit rozhraní a PDF, 2026-09-12 až 2026-09-13

Audit navazuje na commit `77a9ea9`, kterým byly nejprve uložené všechny předchozí změny podle zadání uživatele.

| Oblast | Skutečný důkaz | Hranice |
|---|---|---|
| Automatická regrese | `npm test` prošel se všemi 26 testy, kontrolou generovaných souborů a strukturální validací | Obsahové nejistoty nejsou dopočítávané testem |
| Rozvržení | Katalog, detail, nákup a vaření byly vizuálně zkontrolované v reprezentativních scénářích na 320, 390, 768 a 1440 px; opravena stlačená tabletová nabídka | Nejde o kompletní matici zařízení ani certifikaci WCAG |
| Nákup | Zachování rozepsaného množství při odškrtnutí, filtr neznámých množství, přesun fokusu po uložení a skrytí hotových potvrzené skutečným ovládáním | Více současně otevřených nákupních oken zůstává provozním omezením |
| Vaření | Nezvolený naan nezablokuje dokončení čtyř hlavních kroků; přeskočení poslední volitelné přílohy vrátí první nedokončený krok | Tlačítka zůstávají mimo posouvaný obsah; skutečný čas přípravy se neměří |
| PDF v rozhraní | Prohlížeč vytvořil datový odkaz PDF nákupu i receptu s 2× dávkou; náhled ukázal správný výběr bez naanu | Vestavěný prohlížeč nepotvrzuje uložení do systémové složky stažených souborů; nativní tiskový dialog nebyl ovládaný |
| PDF stránky | Stejný exportér a připnutý klientský engine vytvořily lokální kontrolní soubory; dvě stránky receptu a tři stránky nákupu byly vyrenderované Popplerem a vizuálně prohlédnuté | Receptový vstup byl převzat ze skutečného DOM náhledu, nákup sestaven ze stejných tří receptů a jejich konfigurace |
| PDF obsah a sazba | pypdf ověřil český text, původní údaje a konec postupu; kontrola PNG opravila osamocené nadpisy a odstupy | Opakované nadpisy oddělení a nedělitelné řádky zajišťuje tabulkový renderer knihovny |
| Úplnost sbírky | Nový závěrečný průchod všech 27 URL na 390 px potvrdil suroviny, vaření a PDF tlačítko bez vodorovného přesahu a chyb konzole | U všech položek je kontrolovaná struktura DOM; podrobné snímky patří reprezentativním scénářům |
| Přístupnost a úklid | Tab zobrazí „Přejít k obsahu“, Enter přesune fokus do obsahu, nabídku motivu lze otevřít klávesnicí a Escape vrátí fokus z PDF náhledu | Zkušební nákup byl vymazán, motiv vrácen na automatický a testovací rozměry prohlížeče zrušeny |
| Export při filtrování | Filtr osmi mléčných položek vyexportoval všech 44 surovin včetně vlastního údaje; French Press PDF obsahuje pomůcky | Stažení do systémové složky omezuje vestavěný náhled popsaný výše |

Při auditu byly použité principy [viditelného fokusu](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) a [shody viditelného a přístupného názvu](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html), ověřené v dokumentaci W3C dne 2026-09-12.

### Celková revize použitelnosti a dat, 2026-09-13

Revize vycházela z čistého `develop` na `9a5c13b` a zachovala původních 27 zdrojových receptů i jejich URL.

| Oblast | Skutečný důkaz | Hranice ověření |
|---|---|---|
| Celá sbírka | V prohlížeči prošlo všech 27 receptů, jejich suroviny, PDF tlačítka a přepnutí všech 100 kroků; žádný krok není prázdný ani vodorovně přetečený na 390 px | Struktura DOM celé sbírky doplněná snímky reprezentativních krátkých, dlouhých, nepovinných a nápojových kroků |
| Všechny přehledy | Všech 22 generovaných přehledů má funkční obsahové odkazy bez vodorovného přesahu na 320 px; průchod sekce → oblast → země → detail ověřen klikáním | Mobilní seznamy nahrazují původní tabulky se skrytými sloupci |
| Obecný obsah | Úvod, veřejný průvodce a changelog prošly vizuálně; průvodce a changelog nemají receptový editor ani nákupní lištu | Budoucí odborná témata nebyla vytvořena ani věcně posuzována |
| Reprezentativní rozměry | Vizuální kontrola na 320, 390, 768 a 1440 px, světlý a tmavý motiv, vaření na 844 × 390 | Prohlížeč Chromium v Codex; fyzické iOS/Android, další enginy a úplný audit WCAG nejsou zahrnuty |
| Hledání a klávesnice | Český dotaz bez diakritiky, anglický `coffee`, nulový výsledek, druhá stránka výsledků, úprava a zavření hledání, filtr obsahu sekce, Tab → přeskočení do obsahu | Ověřen viditelný výsledek i fokus; nikoli certifikace všech čteček obrazovky |
| Nákup | Součty dvou jídel, 2× dávka, ghí místo másla, zapnutí přílohy, vlastní množství, zachování rozepsaného textu při odškrtnutí a úplný export při filtru | Množství neuváděná zdrojem zůstávají přiznaná |
| Vaření | Obnova druhého kroku po načtení, popisek „Pokračovat ve vaření“, odstranění otevírací kotvy po zavření, přeskočení nezvolené přílohy a dokončení všech čtyř zahrnutých kroků | Zdrojové časy a teploty se nepřepočítávají |
| Selhání pomocných funkcí | Izolovaný zápis úložiště odmítnutý výjimkou ponechá funkční checklist a viditelné upozornění; HTTP 503 katalogu odkryje 27 náhradních odkazů; kopie úvodu bez skriptů zůstane čitelná | Chyba HTTP 503 je v konzoli poruchové fixture očekávaná |
| Skutečné PDF soubory | Datové PDF odkazy z náhledu receptu a nákupu byly uloženy lokálně, čtyři stránky A4 vyrenderovány Popplerem a vizuálně zkontrolovány | Uložení do systémové složky stažených souborů a nativní tiskový dialog nebyly potvrzeny |
| Automatická regrese | `npm test`: všech 29 testů, deterministická kontrola generátoru a validace dokumentace prošly; `npm run docs:build`: 0 varování a 0 chyb | `git-cliff` opět potřeboval přístup mimo sandbox; nástroje ani testy se kvůli tomu neoslabovaly |

Lokální diagnostické artefakty byly uložené v ignorovaném `private/ux-audit/`; trvalý důkaz scénářů představuje tento záznam a [krokovatelný smoke](../development/commands.md#výběr-nákup-a-vaření).

Finální průchod potvrdil vrácení vymazaného výběru a fokus na surovině po uložení množství; zkušební výběr byl následně vyčištěný a motiv vrácený na automatický.

Čisté sestavení odstranilo všechny poruchové fixture; v konzoli běžných stránek nebyla zaznamenána chyba.

Rozhodnutí pro responzivní přehledy a nativní dialog vychází z [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [minimálních dotykových cílů](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) a [dokumentace dialogu](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), ověřených 2026-09-13.

### Audit zdrojů a generování, 2026-09-13

Audit zachoval všech 27 ručních receptů a jejich obsah i veřejné URL.

| Oblast | Skutečný důkaz | Hranice |
|---|---|---|
| Výchozí verze | 29 testů a standardní build prošly před implementací | `git-cliff` vyžadoval přístup mimo sandbox |
| Zdrojové testy | 34 testů včetně nových slovníků, prázdné sbírky, ručního indexu, kontroly bez zápisu a odmítnutí mělké historie prošlo v čisté kopii | Obsahová fixture izoluje pouze changelog; samostatný test volá jeho skutečnou připnutou binárku |
| Rozsah testů | Runner vybírá projektové `tests/**/*.test.mjs`; přítomnost diagnostické kopie již nespouští její testy podruhé | Nové testovací soubory patří do `tests/` |
| Čerstvá kopie | Úplná skutečná historie, čisté `npm ci`, `npm test` a build vytvořily chybějící výstupy; všechny kontrolní součty ručních souborů zůstaly shodné | Kopie aktuálních pracovních zdrojů, nikoli nové publikování |
| Statický artefakt | 53 stránek, 27 receptů, úplný fulltext, všechny statické odkazy a PDF assety prošly automatickou kontrolou; dodatečně vložené staré HTML kontrola odmítla | Podmínky kontroly vlastní skript volaný buildem |
| Vývojový náhled | Uložení nového receptu vytvořilo 28. položku i nový přehled země, vadný vstup zachoval manifest a odstranění receptu vrátilo 27 položek a odstranilo staré soubory | Stránka se obnovuje ručně; build může krátce zpřístupňovat neúplný lokální výstup |
| Produkční podsložka | V prohlížeči pod `/docs_lifetime/` fungoval katalog, nákup rajské a šunkofleků, cibule 2 ks, vejce 3 ks, PDF datový odkaz a obnova druhého kroku vaření | Ověřen lokální produkční artefakt; GitHub Pages nebyly tímto auditem nasazené |
| Fulltext a konzole | Dotaz French Press našel odpovídající nápoj pod podsložkou, konzole běžných stránek neměla chyby ani varování | Chromium v Codex; nejde o novou úplnou matici prohlížečů |

Dočasný recept i zkušební nákup byly odstraněné a lokální diagnostické kopie a logy patří do ignorovaného `private/generation-audit/`.

### Ověření validace, Kuchyně a přenosu nákupu, 2026-09-13

Změna navazuje na čistý `develop` na `61efdea` a nemění původních 27 receptových souborů ani jejich URL.

| Oblast | Skutečný důkaz | Hranice |
|---|---|---|
| Automatická regrese | `npm test` prošel se všemi 45 testy, kontrolou determinismu a strukturální validací | Windows s Node.js 24.13.0, npm 11.6.2 a připnutými nástroji; `git-cliff` potřebuje přístup mimo sandbox |
| Obsahová kontrola | Samostatná kontrola i sestavení hlásí 68 neblokujících `RECIPE_QUANTITY_MISSING`; negativní fixture odmítají chybný obsah před zápisem a warning uvádí řádek i anotaci GitHub Actions | Množství se nevymýšlí a věcnou úplnost potvrzuje autor receptu |
| Produkční artefakt | `npm run docs:build` vytvořil 54 stránek, 27 receptů a 4 TOC; DocFX má 0 varování a 0 chyb a závěrečný verifier potvrzuje odkazy, fulltext, PDF assety a nezveřejnění interního reportu | Lokální sestavení, nikoli nové nasazení GitHub Pages |
| Přenos mezi nákupy | Skutečný export, vložení odkazu, sloučení hotových položek, úplné převzetí, vrácení importu a odmítnutí neplatného textu prošly ovládáním rozhraní | Jde o předání kopie; při sloučení se úmyslné zrušení odškrtnutí nedá odlišit od dosud nekoupené položky |
| Konflikty | Rozdílná dávka šunkofleků i vlastní údaj 1 versus 2 sklenice blokují potvrzení do výběru varianty; rozepsané množství vyžaduje uložení | Kulinářskou vhodnost zvoleného údaje neurčuje software |
| Produkční podsložka | Pod `/docs_lifetime/` odkaz automaticky otevřel náhled, odstranil fragment a zrušení ponechalo prázdný nákup; potvrzení přeneslo cibuli i vlastní množství okurek s odškrtnutím a po obnovení stránky je zachovalo | Ověřen samostatný místní origin; skutečná SMS ani systémový výběr příjemce nebyly odesílány |
| Mobilní import | Náhled ověřen snímky na 320 a 390 px, konflikt také při 844 × 390; posouvá se obsah a potvrzení i zavření zůstávají dostupné | Chromium v Codex; nejde o úplný audit přístupnosti ani fyzických telefonů |
| Navigace a regrese | Obecný úvod a Kuchyně prošly desktopovým a tabletovým náhledem; opraveno překrytí širokého katalogu novým bočním TOC, původní záložka katalogu přejde do Kuchyně, globální French Press najde nápoj a nákupní PDF vytvoří datový odkaz | PDF exportér se neměnil; systémové stažení a tisk nejsou novým důkazem tohoto auditu |

Zkušební nákupy byly odstraněné přes rozhraní; běžné stránky neměly chyby konzole a diagnostické logy i kopie produkční cesty zůstávají v ignorovaném `private/`.

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
