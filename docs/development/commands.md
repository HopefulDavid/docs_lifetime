---
canonical_for: project-commands
status: accepted
last_verified: 2026-09-21
owner: engineering
---

# Projektové příkazy

Tento dokument je kanonickým lidským rozhraním pro lokální generování, kontrolu, sestavení a spuštění projektu.

Skripty, manifesty a build konfigurace zůstávají kanonické pro prováděnou strojovou logiku.

## Požadované prostředí

| Nástroj nebo služba | Podporovaná verze | Kanonický zdroj verze | Lokální nebo řízená dostupnost | Ověření |
|---|---|---|---|---|
| Node.js | Řada 24 LTS | [`../../package.json`](../../package.json) | Lokální instalace a `actions/setup-node` | `node --version` |
| pnpm | 12.4.0 | [`../../package.json`](../../package.json) a [`../../pnpm-lock.yaml`](../../pnpm-lock.yaml) | Lokální instalace a `pnpm/action-setup` v CI | `pnpm --version` |
| .NET SDK | 8.0 nebo vyšší, lokálně ověřeno s 10.0.401 | [Workflow](../../.github/workflows/main.yml) a požadavek DocFX | Lokální instalace a `actions/setup-dotnet` | `dotnet --version` |
| DocFX | Přesná verze z manifestu, ověřeno s 2.78.5 | [`../../.config/dotnet-tools.json`](../../.config/dotnet-tools.json) | Lokální .NET tool cache nebo NuGet.org | `dotnet tool run docfx --version` |
| Git | Verze podporující běžné checkout a log operace | Systémová instalace | Lokální prostředí a GitHub Actions | `git --version` |

Generování changelogu vyžaduje úplnou Git historii, nikoli mělký checkout.

### Ověření Git a SSH

| Kontrola | Přesný příkaz | Očekávaný výsledek |
|---|---|---|
| Přihlášení existujícím SSH klíčem | `ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 git@github.com` | GitHub potvrdí účet `HopefulDavid`, návratový kód 1 je u tohoto testu normální, protože GitHub neposkytuje shell |
| Adresa vzdáleného repozitáře | `git remote -v` | `origin` používá `git@github.com:HopefulDavid/docs_lifetime.git` pro fetch i push |
| Vývojová větev a sledování | `git branch -vv` | Aktivní `develop` sleduje `origin/develop` a `main` sleduje `origin/main` |
| Ověření přístupu pro zápis bez publikování | `git push --dry-run origin develop` | Kód 0 a přehled zamýšlené operace, žádné commity se neodešlou |
| Úplnost stažené historie | `git rev-parse --is-shallow-repository` | `false` |
| Integrita Git objektů | `git fsck --full` | Kód 0 bez chyb |

Postup obnovy chybějících metadat se zachováním pracovních souborů vlastní [runbook](../operations/runbook.md#obnova-lokálního-git-propojení).

## Inicializace prostředí

Spusť příkazy z kořene repozitáře v uvedeném pořadí.

| Účel | Pracovní adresář | Přesný příkaz | Očekávaný výsledek | Síťové požadavky |
|---|---|---|---|---|
| Obnovení pnpm závislostí | Kořen repozitáře | `pnpm install --frozen-lockfile --ignore-scripts` | Přesné balíčky z lockfilu a kód 0 | npm registry při prázdné cache |
| Obnovení DocFX | Kořen repozitáře | `dotnet tool restore` | DocFX z lokálního manifestu a kód 0 | NuGet.org při prázdné cache |
| Kontrola instalovaných balíčků | Kořen repozitáře | `pnpm list --depth=0` | Pouze deklarované přímé balíčky | Žádné po obnově |

`pnpm install --frozen-lockfile --ignore-scripts` znovu vytvoří ignorovaný adresář `node_modules/` a nesmí měnit `pnpm-lock.yaml`.

## Generování a sestavení

Pro kontrolu stylu skriptů a testů použij `pnpm run format:check`.

Pro jejich automatické formátování použij `pnpm run format:write`.

Oba příkazy používají lokální připnutý Prettier a nevyžadují síť po obnově závislostí.

Kontrola vrátí kód 0 při shodě nebo 1 při odlišném formátování a je prvním krokem `pnpm test`.

Rozsah tvoří JavaScript v `scripts/` a `tests/`.

Markdown se řídí vlastním [kanonickým stylem](../governance/documentation.md#styl-markdownu).

Pro vyžádané formátování zdrojových receptů použij `pnpm exec prettier --ignore-path .gitignore --write --prose-wrap preserve "food/**/*.md" "drink/**/*.md"`.

Kontrolní varianta nahrazuje `--write` přepínačem `--check` a zachování odstavců zajišťuje `--prose-wrap preserve`.

Výslovný `--ignore-path .gitignore` umožní tento cílený průchod receptů, protože běžný `.prettierignore` omezuje formátování na skripty a testy.

Generované adresáře se tímto příkazem neupravují.

| Varianta | Pracovní adresář | Přesný příkaz | Výstup | Úspěch znamená |
|---|---|---|---|---|
| Příprava celého docsetu | Kořen repozitáře | `pnpm run docs:generate` | Ignorovaný `_generated/` včetně changelogu a manifestu původu | Generátor ověří vstupy, obnoví výstupy, odstraní nadbytečné soubory a vypíše změněné cesty nebo aktuální stav |
| Vyčištění statického výstupu | Kořen repozitáře | `pnpm run docs:clean` | Odstraněný ignorovaný adresář `_site/` | Staré stránky nemohou zůstat v následujícím artefaktu |
| Vývojové sestavení | Kořen repozitáře | `pnpm run docs:build` | Ignorované `_generated/` a `_site/` | Automatická příprava, validace, připnutý DocFX a kontrola hotového webu projdou, obsahová upozornění nezablokují build |
| Produkční sestavení | Kořen repozitáře | `pnpm run docs:build` | Stejné `_generated/` a `_site/` | Vznikne tentýž typ artefaktu, který publikuje CI |

Vývojové a produkční sestavení se liší pouze prostředím spuštění, nikoli projektovým vstupem.

## Spuštění

Oba náhledové příkazy nejprve automaticky provedou společné sestavení, takže fungují i bez předchozích výstupů.

| Scénář | Pracovní adresář | Přesný příkaz | Adresa nebo rozhraní | Bezpečné zastavení |
|---|---|---|---|---|
| Jednorázový lokální náhled | Kořen repozitáře | `pnpm run docs:serve` | `http://127.0.0.1:8765/` | `Ctrl+C` v běžícím terminálu |
| Průběžné ladění obsahu a šablony | Kořen repozitáře | `pnpm run docs:dev` | Stejná adresa, změna zdroje automaticky spustí nové sestavení | `Ctrl+C` ukončí sledování i vlastní podprocesy |

`docs:dev` zachytí přidání, změnu a odstranění zdrojových souborů i nové adresáře.

Ignoruje vlastní výstupy a řadí sestavení za sebou, aby se nepřepisovala souběžně.

Při chybě vypíše konkrétní příčinu a po dalším uložení zkusí sestavení znovu.

Úspěch oznámí textem „Náhled je aktuální“.

Prohlížeč po oznámeném úspěchu obnov ručně, protože projekt nevkládá klientský hot reload.

Během sestavení může být místní výstup krátce neúplný, stránku proto kontroluj až po jeho úspěšném dokončení.

`docs:serve` provede sestavení jednou při spuštění.

Při dalších úpravách použij průběžný náhled nebo znovu spusť sestavení.

Na stejném portu spouštěj pouze jeden náhled a během průběžného náhledu nespouštěj další build ve stejném checkoutu.

## Statické kontroly

| Kontrola | Přesný příkaz | Rozsah | Oprava formátu | Očekávaný výsledek |
|---|---|---|---|---|
| Cílené automatické testy | `pnpm run test:unit` | Hledání, obsahový kontrakt, nákup, obnova stavu, chybové vstupy generátoru a changelog v dočasném Git repozitáři | Ruční oprava příslušného modulu nebo konfigurace | Všechny scénáře projdou a dočasné kopie se odstraní |
| Obsah bez generování | `pnpm run docs:validate-content` | Slovník, receptové tabulky, struktura a upozornění na `neuvedeno`, bez zápisu a bez potřeby Git historie | Oprava ručního zdroje podle [receptového kontraktu](../product/recipe-format.md#automatická-kontrola-obsahu) | Kód 0 i s warnings, vadná surovina nebo struktura vrací kód 1 |
| Konzistence generovaných souborů | `pnpm run docs:check` | Bez zápisu porovná celý `_generated/` včetně changelogu, kopií zdrojů, manifestu a nepotřebných souborů | `pnpm run docs:generate` | `Dokumentace je aktuální.` a kód 0 |
| Struktura dokumentace | `pnpm run docs:validate` | Interní odkazy, kanonická metadata, adaptéry, pracovní záznamy a zakázané artefakty | Ruční oprava zdroje | Souhrn platných Markdown souborů a kód 0 |
| Úplná rychlá kontrola | `pnpm test` | Testy nad aktuálními zdroji, automatické generování, kontrola opakovatelnosti a strukturální validace | Podle konkrétního výstupu | Všechny vrstvy projdou i v čerstvém checkoutu |
| Kontrola hotového webu | `pnpm run docs:verify-site` | Shoda HTML, JSON a fulltextu, odkazy, PDF assety, lokální zdrojová videa a velikost mediálních souborů | Oprava zdrojů a nový build | Souhrn ověřených stránek, receptů a médií, běží automaticky na konci buildu |
| DocFX s varováními jako chybami | `pnpm run docs:build` | Produktový docset a vlastní šablona | Ruční oprava zdroje nebo konfigurace | `Build succeeded`, 0 varování a 0 chyb |

Projekt nemá samostatný obecný formatter, JavaScript linter ani typovou kompilaci.

Obsahové warnings se zobrazí také při generování, kontrolním režimu, testech a buildu.

Příprava docsetu uloží jejich aktuální seznam do `_generated/content-report.json` a GitHub Actions přidají anotace řádků.

Na konci `docs:verify-site` a společného buildu následuje souhrn obsahových varování podle tohoto reportu.

Při nenulovém počtu vypíše `WARNING: N obsahových varování (warnings).`, při nulovém `Obsahová kontrola: 0 varování (warnings).`.

Nulové počítadlo samotného DocFX popisuje pouze jeho vlastní fázi a neznamená nulový počet obsahových upozornění.

Varování samotného DocFX nadále platí jako chyby.

Neblokující obsahová nejistota tento mechanismus nevypíná.

Rozlišení bylo ověřené 2026-09-13 na DocFX 2.78.5 podle [oficiálního CLI](https://dotnet.github.io/docfx/reference/docfx-cli-reference/docfx-build.html) a skutečného sestavení.

Volba `--log` zapisuje diagnostiku DocFX do souboru a neslouží jako vstup externího reportu.

Předání obsahových upozornění pluginem do počítadla DocFX by rozšířilo sestavovací infrastrukturu a při `--warningsAsErrors` změnilo jejich neblokující význam.

Proto jejich souhrn vypisuje stávající závěrečná kontrola webu a CI zachovává [podporované anotace GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-a-warning-message).

Nový nástroj této kategorie se zavede pouze tehdy, když pokryje konkrétní riziko lépe než současné kontroly.

## Testy

Strategie výběru testů je v [`../quality/testing.md`](../quality/testing.md).

| Úroveň | Přesný příkaz nebo scénář | Potřebné služby | Výstupní artefakty | Typická doba nebo rozsah |
|---|---|---|---|---|
| Rychlé chování | `pnpm run test:unit` | Lokální Git a obnovený `git-cliff` | Konzolový výstup všech scénářů | Jednotky sekund bez obnovy nástrojů |
| Cílený test generátoru | `pnpm run docs:check` | Obnovený `git-cliff`, úplný lokální Git a připravený docset | Konzolový seznam očekávaných změn při selhání, nic neopravuje | Sekundy, celý docset |
| Automatizované testy | `pnpm test` | Lokální Git historie a obnovený `git-cliff` | Konzolový výstup | Sekundy, celý repozitář |
| Integrační sestavení | `pnpm run docs:build` | Obnovený lokální DocFX | `_site/`, `index.json` a `manifest.json` | Jednotky sekund |
| Vizuální scénáře | `pnpm run docs:serve`, poté kroky z reprezentativního smoke scénáře | Lokální HTTP port 8765 a prohlížeč | Viditelná stránka, volitelný screenshot a konzole | Úvod, hledání, detail a chybová cesta |
| Úplná lokální kontrola | Inicializace prostředí, `pnpm test` a `pnpm run docs:build` v tomto pořadí | npm registry a NuGet.org pouze při prázdné cache | Čistý Git diff a `_site/` | Desítky sekund bez prvního stahování |

## Changelog

Každé sestavení odvozuje `_generated/changelog.md` z úplné Git historie a zahrne jej do statického artefaktu.

Konfigurace v [`../../cliff.toml`](../../cliff.toml) zachovává nekonvenční commity, uvádí krátký identifikátor zdrojového commitu a celkový počet záznamů a řadí změny od nejnovější po nejstarší podle kalendářního roku v časovém pásmu `Europe/Prague`.

Rok nejnovějšího zahrnutého commitu je nejnovější otevřené období a uvádí vlastní počet změn.

Roky bez zahrnutých změn se nevykreslují a každý starší zobrazený rok je samostatný sbalený blok `<details>` se stejným údajem.

Každá položka má český štítek typu změny a případná nekompatibilní změna je zvýrazněná.

Upravený recept, nápoj nebo obecný návod, který stále existuje na stejné cestě, dostane přímý odkaz na veřejný článek.

Dosavadní stabilní kotva každé kategorie směřuje na její nejnovější výskyt a všechna období přidávají kotvy rozlišené rokem.

Release tagy historii nerozdělují a commity se zobrazují pouze krátkým neklikacím hashem.

Soubor není verzovaný a nevytváří samostatný commit.

| Účel | Přesný příkaz | Vedlejší účinek | Očekávaný výsledek |
|---|---|---|---|
| Náhled bez zápisu | `pnpm exec git-cliff --config cliff.toml` | Žádný soubor se nezmění | Úplný Markdown na standardním výstupu |
| Samostatný náhled changelogu | `pnpm run changelog:generate` | Přepíše pouze `_generated/changelog.md`, úplný manifest obnovuje `docs:generate` | Úplná časová osa s identitou zdroje, odkazy na dostupné články, otevřeným nejnovějším rokem a sbalenými staršími roky |

`pnpm run docs:build` používá stejné odvození changelogu prostřednictvím celkového generování před DocFX.

Chybějící Git metadata nebo mělká historie zastaví generování.

Nástroj nevytváří náhradní changelog ani nepoužije starý soubor.

## Reprezentativní smoke scénář

### Výběr, nákup a vaření

Po sestavení ověř obecný Úvod, katalog v Kuchyni, nákup a detail na šířkách 320, 390, 768 a 1440 px, včetně klávesnice a mobilního dialogu.

| Požadavek | Kroky | Očekávaný výsledek |
|---|---|---|
| `REQ-006`, `REQ-008` | Vyhledej `rajska` a `sunkofleky`, oba recepty přidej a otevři „Můj nákup“ | Cibule 2 ks a vejce 3 ks, máslo v gramech a lžících zůstává oddělené |
| `REQ-007`, `REQ-011` | Odškrtni cibuli a změň šunkofleky na 2× dávku | Cibule 3 ks a vejce 5 ks, dotčené odškrtnutí se zruší |
| `REQ-007` | U rajské zvol ghí a zapni přílohu, u kari zvol broskev | Nákup obsahuje zvolené varianty, nikoli zároveň jejich náhrady |
| `REQ-009` | V izolované fixture nastav množství na `neuvedeno`, rozbal zdroje, zkopíruj text nebo otevři PDF | Údaj je přiznaný bez editace a filtru množství, export obsahuje původní údaj i poznámky |
| `REQ-002`, `REQ-010` | V nákupu přepni Nakoupit → Uvařit, otevři postup jídla a vrať se do Nakoupit, použij historii a obnov stránku | Viditelná je jediná sekce, nákupní karty nemají Vařit a detail skrývá postup i jeho obsah až do přepnutí |
| `REQ-002` | Otevři přímou kotvu konkrétního kroku i starý odkaz `#vareni` | Kotva odkryje postup, starý odkaz otevře dialog a po zavření ponechá sekci Uvařit |
| `REQ-010`, `REQ-011` | Na kartě vybraného jídla v Uvařit spusť vaření po krocích, zavři je a spodní lištou se vrať k jídlům | Dialog se otevře přímo s uloženým průběhem, celý postup má vedlejší odkaz a dokončený recept nenabízí pokračování jako rozvařený |
| `REQ-010`, `REQ-011` | U šunkofleků otevři Uvařit a „Vařit krok za krokem“, dokonči první krok, zavři a otevři dialog znovu | Zobrazí se druhý krok a první zůstává označený |
| `REQ-010` | V „Přehledu kroků“ přeskoč na poslední krok a dokonči jej | Celé vaření není označené jako hotové, pokud zbývají neoznačené kroky, hlavní tlačítko nabídne návrat k nedokončenému |
| `REQ-010` | Otevři již hotový krok a zvol „Vrátit mezi nedokončené“ | Průběh se sníží a jedinou hlavní akcí je opět dokončení kroku |
| `REQ-006` | Vyhledej `tikka`, otevři recept a vrať se zpět | Katalog zachová hledání a odpovídající výsledek |
| `REQ-008` | Zvol „Začít nakupovat“, filtruj oddělení i název a skryj hotové | Výběr jídel ustoupí surovinám, prázdný výsledek nabídne zrušení filtrů |
| `REQ-008`, `REQ-011` | V detailu dosud nevybrané vietnamské kávy potvrď kávu, zahrň led, obnov stránku a otevři nákup | Recept se přidá s aktuálním nastavením, potvrzení se zachová a volitelnost ledu má samostatné ovládání |
| `REQ-008`, `REQ-011` | Nech otevřené nastavení jídla v nákupu, přepni potvrzení v seznamu i editoru, potom změň dávku a vrať ji | Obě místa ukazují stejný stav a dříve zneplatněné potvrzení se nevrátí |
| `REQ-009` | Rozbal původ suroviny a odškrtni jinou surovinu | Zdroje zůstanou otevřené a součty se nezmění |
| `REQ-009` | V receptu nastav 2× dávku a otevři „PDF / tisk receptu“, totéž proveď v nákupu | Náhled nabídne „Stáhnout PDF“, zachová češtinu, zdroje a skutečný výběr i při aktivním filtru |
| `REQ-010` | V tikka masale nech naan vypnutý, přeskoč na jeho krok a potom dokonči zahrnuté kroky | Přílohu lze přeskočit a celý recept dokončit po čtyřech zahrnutých krocích |
| `REQ-E006` | Ověř statické HTML před klientským rozšířením | Obsahuje tabulky a celý postup, katalog má základní odkazy |
| `REQ-001`, `REQ-012` | Z úvodu otevři oblast i „Jak dokumentaci používat“ na 320 px | Přehledy neztrácejí sloupce, obecný průvodce neobsahuje nákupní lištu ani receptový editor |
| `REQ-005` | V mobilním Menu odešli `maslo`, otevři druhou stránku výsledků a „Upravit hledání“, pak hledání zavři | Výsledky mají čitelný název a stručný úryvek, fokus se vrátí do vstupu a po zavření do obsahu |
| `REQ-010` | V rozměru 844 × 390 otevři tikka masalu a přejdi na další krok | Nadpis a začátek aktuální činnosti jsou viditelné, navigace zůstává mimo posouvaný obsah |
| `REQ-011` | Po zneplatnění cibule změnou dávky vrať původní dávku | Staré odškrtnutí se nevrátí, totéž platí pro dříve zneplatněné vlastní množství |
| `REQ-E005` | V izolované kopii sestavené stránky simuluj odmítnutí zápisu klíče `kitchen-plan-v1:` a odškrtni položku | Aktuální stránka funguje a lišta trvale ukazuje neprovedené uložení, export zůstává dostupný |
| `REQ-013` | Exportuj nákup s hotovou cibulí, v druhém nákupu označ vejce a importuj odkaz | Náhled sloučení zachová obě hotové položky, převzetí použije pouze stav exportu a změnu lze vrátit |
| `REQ-013`, `REQ-E007` | Změň dávku a importuj odlišný stav, následně vlož neplatný kód | Konflikt vyžaduje volbu, poškozený vstup nesmí měnit nákup a potvrzovací tlačítko zůstane zakázané |
| `REQ-013` | Otevři sdílený odkaz pod podsložkou webu v jiném místním nákupu | Náhled se otevře automaticky, kód zmizí z adresy a příjemce může import potvrdit i v původně prázdném nákupu |
| `REQ-014` | Spusť kontrolu obsahu a v izolované fixture změň `neuvedeno` na známé množství, poté přidej neznámou surovinu | První změna odstraní warning, druhá odmítne generování ještě před zápisem |

Poruchové fixture patří pouze do ignorovaného lokálního výstupu a následující `pnpm run docs:build` je odstraní čistým sestavením.

Nesimuluj poruchy v nasazeném webu ani nad skutečným osobním nákupem.

### Zdrojová kopie bez Git metadat

Úplné generování, kontrola i sestavení vyžadují skutečný Git repozitář a úplnou historii.

Postup [obnovy Git propojení](../operations/runbook.md#obnova-lokálního-git-propojení) nesmí nahradit smyšlené commity.

Samostatný `pnpm run test:unit` připravuje nákupní katalog přímo z ručních zdrojů v paměti a používá vlastní dočasnou historii pro changelogové testy.

Test runner objevuje soubory `tests/**/*.test.mjs`.

Ignorované diagnostické kopie mimo `tests/` se do projektových kontrol nezahrnují.

Při chybě spuštění `git-cliff` ve Windows použij [diagnostiku v runbooku](../operations/runbook.md#symptom-windows-blokuje-spuštění-git-cliff).

### Původní katalog a hledání

| Požadavek | Příprava | Kroky nebo příkaz | Očekávaný technický důkaz | Úklid |
|---|---|---|---|---|
| `REQ-001`, `REQ-002` | `pnpm run docs:build` a `pnpm run docs:serve` | Otevři Úvod, zvol Kuchyni, Jídlo a `Rajská omáčka s masovými koulemi` | Katalog, ingredience, očíslované kroky, tipy a varování jsou viditelné bez chyb konzole | Ukonči server přes `Ctrl+C` |
| `REQ-005` | Běžící lokální náhled | Postupně vyhledej `Rajská`, `rajska`, `PIZZA`, `French Press`, indexovaný termín cesty `coffee` a `bez-vysledku-xyz`, poté otevři odpovídající výsledky | České varianty najdou rajskou, anglické termíny najdou pizzu a French Press, poslední dotaz zobrazí český nulový stav a konzole zůstane bez chyb | Vymaž dotaz nebo zavři panel |
| `REQ-E003` | Běžící lokální náhled | Otevři `/neexistuje.html` | Server vrátí HTTP 404 a neexistující obsah nenahradí jinou stránkou | Vrať se na úvod |

## Shoda lokálního prostředí a CI

Ověřovací i publikační job používají `pnpm install --frozen-lockfile --ignore-scripts`, `dotnet tool restore`, `pnpm test` a `pnpm run docs:build` ze stejného repozitáře.

Workflow smí přidat Git checkout, cache, nasazení a oznámení, ale nesmí měnit zdrojovou historii ani skrývat alternativní generátor nebo sestavení.

## Pravidlo ověření

Příkaz se do tohoto dokumentu zapisuje až po skutečném spuštění v podporovaném prostředí.

Při změně skriptu, manifestu, verze nástroje nebo názvu cíle se tento dokument aktualizuje ve stejné změně.
