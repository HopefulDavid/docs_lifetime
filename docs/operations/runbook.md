---
canonical_for: operations-runbook
status: accepted
last_verified: 2026-09-21
owner: operations
---

# Provozní runbook

Tento dokument je kanonickým vstupem pro bezpečnou diagnostiku, obnovu a předání veřejného statického webu.

Architektura je v [`../architecture/overview.md`](../architecture/overview.md) a nasazení v [`../delivery/ci-cd.md`](../delivery/ci-cd.md).

## Odpovědnost a kritičnost

| Vlastnost | Hodnota |
|---|---|
| Provozní vlastník | Maintainers repozitáře |
| Eskalační kontakt nebo kanál | Správce repozitáře prostřednictvím používaného interního kontaktu, neveřejné údaje zůstávají mimo Git |
| Kritičnost služby | Nízká, veřejné životní návody bez transakcí a serverových uživatelských dat |
| Podporovaná prostředí | Lokální náhled a GitHub Pages podle [`../delivery/ci-cd.md`](../delivery/ci-cd.md) |
| Hlavní uživatelské scénáře | `REQ-001`, `REQ-002`, `REQ-004`, `REQ-006` až `REQ-014` |
| Cíle dostupnosti a obnovy | Projekt nemá smluvní SLA, RPO ani RTO a chrání především obnovitelnost z Git historie |

## Ověření zdraví

Kontroly prováděj v uvedeném pořadí od nejméně invazivní.

| Kontrola | Jak ji provést | Zdravý výsledek | Typické selhání | Další krok |
|---|---|---|---|---|
| Veřejný vstup | Otevři `https://hopefuldavid.github.io/docs_lifetime/` | HTTP úspěch, obecný nadpis `Dokumentace ze života` a odkaz na Kuchyni | 404, 5xx, starý nebo prázdný obsah | Ověř Kuchyni, detail a poslední workflow |
| Reprezentativní detail | Otevři známý recept z katalogu | Nadpis, ingredience a kroky se vykreslí, ovládací texty jsou české a editační odkaz chybí | Odkaz 404, anglický token, editační odkaz, chybějící styly nebo prázdný článek | Porovnej zdroj, TOC, `docfx.json`, tokeny šablony a `_site/` |
| České a anglické hledání | Vyhledej `Rajská`, `rajska`, `PIZZA`, `French Press`, `coffee` a dotaz bez shody | Správné výsledky, český nulový stav a konzole bez chyb | Prázdný výsledek pro známé slovo, anglický stav nebo chyba workeru | Ověř vlastní assety, `index.json` a verzi DocFX |
| Changelog | Otevři stránku `Změny` z hlavní navigace | Zdrojový stav odpovídá `HEAD`, nejnovější rok je otevřený, roky bez změn nejsou zobrazené a každý starší zobrazený rok je sbalený s vlastním počtem a uvnitř zůstávají kategorie i technické záznamy | Chybějící starší změny, chybný roční přechod, zastaralý zdrojový stav, posunuté datum nebo neformátovaný podporovaný typ | Reprodukuj generátor podle diagnostického stromu |
| Lokální reprodukce | Spusť úplnou lokální kontrolu z [`../development/commands.md`](../development/commands.md) | `npm test` a build projdou, obsahová upozornění nezastaví výsledek | Zastaralý generovaný soubor, vadný odkaz nebo neobnovený nástroj | Oprav nejbližší potvrzenou příčinu |
| CI | Otevři běh workflow `Dokumentace` pro dotčený commit | `verify-docs` a u `main` také `publish-docs` jsou úspěšné | Registry, oprávnění, sestavení, Pages nebo SMTP | Postupuj podle názvu prvního selhaného kroku |

## Pozorovatelnost

| Signál | Kanonický zdroj | Co znamená | Retence | Citlivost |
|---|---|---|---|---|
| Build log | GitHub Actions a lokální terminál | Obnova nástrojů, validace, sestavení a nasazení | Podle nastavení GitHubu, lokálně pouze po dobu relace | Nesmí obsahovat hodnoty secrets |
| HTTP výsledek | Veřejná URL nebo lokální server | Dostupnost konkrétního statického souboru | Bez projektové retence | Veřejný údaj |
| Konzole prohlížeče | Vývojářské nástroje při smoke scénáři | Klientské chyby šablony, hledání nebo načítání zdrojů | Standardně se neuchovává | Veřejný obsah a technické URL |
| Git historie | Repozitář, `_generated/changelog.md` je její generovaná projekce | Zdrojový stav a posloupnost obsahových změn | Trvalá podle Git hostingu a klonů | Veřejná metadata commitů |
| Aplikační logy, metriky a trasování | Nepoužívá se | Web nemá vlastní runtime proces | Není relevantní | Není relevantní |

Projekt nemá serverový health endpoint, protože na Pages běží pouze statické soubory.

## Nejčastější diagnostické stromy

### Symptom: nákup nebo rozpracovaný krok chybí

1. Ověř stejný prohlížeč a stejnou adresu webu, protože lokální náhled, GitHub Pages a jiný profil nesdílejí úložiště.
2. Zkontroluj viditelnou informaci o uložení a dostupnost `data/recipes.json` i vlastních modulů šablony.
3. Před vymazáním dat prohlížeče použij Export nákupu, pokud je stav stále dostupný v otevřené stránce.
4. Je-li soubor katalogu nedostupný, proveď čisté sestavení a ověř resource glob v `docfx.json`.
5. Rozdílné úpravy ve více současně otevřených oknech mohou přepsat dřívější stav, proto pro jeden nákup používej jedno okno.

**Hranice obnovy:** Bez dostupného úložiště nebo staženého exportu neexistuje serverová záloha nákupního stavu.

**Očekávané zrušení odškrtnutí:** Po změně jídel, dávky, alternativy nebo poznámek se dotčená surovina musí znovu ověřit.

### Symptom: veřejný web je nedostupný nebo vrací chybný obsah

1. Ověř úvodní URL a jeden konkrétní detail v anonymním nebo čistém kontextu prohlížeče.
2. Najdi první selhaný krok posledního workflow pro `main` a potvrď, zda selhalo ověření, sestavení nebo nasazení.
3. Checkoutni stejný zdrojový commit bezpečným projektovým postupem a spusť `npm test` a `npm run docs:build`.
4. Pokud lokální artefakt funguje, porovnej commit nasazení a Pages větev s očekávaným zdrojem bez jejich přepisování.
5. Oprav potvrzenou příčinu na `develop`, proveď smoke a publikuj běžným workflow.

**Potvrzení příčiny:** Stejný symptom je reprodukovaný v konkrétním kroku, artefaktu nebo nasazeném commitu.

**Bezpečná náprava:** Nový ověřený commit nebo řízené opakování workflow po dočasném výpadku služby.

**Eskalace:** Pokud lokální build prochází a GitHub Pages nebo Actions zůstávají nedostupné, ověř stav GitHubu a předej správci repozitáře URL a identifikátor běhu bez tajemství.

### Symptom: recept v katalogu chybí nebo odkaz vrací 404

1. Ověř, že zdrojový soubor existuje v podporované cestě a má právě jeden hlavní nadpis.
2. Spusť `npm run docs:generate` a zkontroluj očekávaný záznam v `_generated/data/recipes.json`, příslušném přehledu a TOC uvnitř `_generated/`.
3. Spusť `npm test` a `npm run docs:build`.
4. Otevři odpovídající HTML v lokálním náhledu a porovnej URL s publikovaným odkazem.

**Potvrzení příčiny:** Cesta zdroje, generovaný odkaz nebo nasazený artefakt se liší od pravidel v architektuře.

**Bezpečná náprava:** Oprav autoritativní zdroj nebo generátor a nech odvozené soubory znovu vytvořit.

**Eskalace:** Změna již publikované stabilní URL vyžaduje rozhodnutí o kompatibilitě a případném přesměrování.

### Symptom: změna receptu se neprojevila v lokálním náhledu

1. Ověř zvolený [režim náhledu](../development/commands.md#spuštění), jednorázové spuštění nesleduje další změny.
2. V průběžném režimu počkej na úspěšné dokončení sestavení v terminálu a ručně obnov stránku prohlížeče.
3. Pokud generování odmítlo zdroj, oprav uvedený recept nebo slovník, další uložení spustí nové ověření.
4. Při chybě sledovače jej ukonči, spusť úplný build a náhled znovu, při plném disku nejprve uvolni místo pro obnovitelné výstupy.

**Potvrzení příčiny:** Terminál rozliší neplatný zdroj, nedokončené sestavení a selhaný sledovač.

Porovnej výsledek s jednorázovým buildem.

**Bezpečná náprava:** Oprav zdroj nebo prostředí a regeneruj.

Ruční zásah do `_generated/` nebo `_site/` příčinu neřeší.

**Eskalace:** Opakovaně ztracené změny při úspěšném jednorázovém buildu předej engineeringu s operačním systémem, typem disku a konkrétní cestou.

### Symptom: známý český nebo anglický termín nemá výsledek nebo hledání hlásí klientskou chybu

1. Spusť `npm test` a potvrď cílené scénáře normalizace i nulového výsledku.
2. Sestav web a ověř, že `_site/public/search-worker.min.js` a `_site/public/search-core.mjs` odpovídají souborům vlastní šablony.
3. Ověř, že hledaná položka existuje v `_site/index.json` a stránka má `lang="cs"` i český popisek hledání.
4. Spusť lokální náhled a zopakuj celý scénář z [`../development/commands.md`](../development/commands.md#reprezentativní-smoke-scénář) s otevřenou konzolí.
5. Pokud závada vznikla po upgradu DocFX, porovnej workerový kontrakt s [`ADR-0002`](../architecture/decisions/ADR-0002-vyhledavani-nad-docfx-indexem.md) a oprav kompatibilní integrační hranici.

**Potvrzení příčiny:** Konkrétní rozdíl je reprodukovaný v čisté funkci, statickém assetu, indexu nebo zprávě mezi stránkou a workerem.

**Bezpečná náprava:** Kompatibilní oprava vlastní šablony s automatickými testy, čistým buildem a skutečným smoke scénářem.

**Eskalace:** Změna rozsahu hledání, přidání jazykové knihovny nebo odstranění fulltextu vyžaduje nové produktové či architektonické rozhodnutí.

### Symptom: changelog chybí, je neúplný nebo se liší mezi prostředími

1. Spusť `npm run test:unit` a potvrď víceletou fixture, počty období, typy commitů, časová pásma a historii oddělenou Git tagem.
2. Spusť `npm run docs:generate`, porovnej hlavičku s `git rev-parse HEAD` a `_generated/changelog.md` s `git log` bez ruční úpravy výstupu.
3. Ověř úplný checkout a hodnotu `tag_pattern = "^$"` v kanonickém `cliff.toml`.
4. Spusť `npm run docs:build` a potvrď, že `_site/changelog.html` obsahuje historii od nejnovějších záznamů, otevřené nejnovější období, sbalené starší roky, české štítky, odkazy na dostupné články a stabilní kotvy.
5. V CI ověř `fetch-depth: 0` a první selhaný krok `verify-docs` nebo `publish-docs`.

**Potvrzení příčiny:** Konkrétní commit chybí nebo má jinou skupinu v reprodukovaném CLI výstupu nad stejnou Git historií.

**Bezpečná náprava:** Oprav zdrojovou commit zprávu pouze novým commitem, nebo kompatibilně oprav generátor a znovu sestav artefakt.

Vygenerovaný soubor necommituj.

**Eskalace:** Přepis publikované Git historie, změna verzovacího modelu nebo ruční udržování changelogu vyžaduje samostatné rozhodnutí maintainera.

### Symptom: Windows blokuje spuštění git-cliff

**Historická překážka k 2026-09-16:** Generování a test changelogu končily na `spawn UNKNOWN`, přímé spuštění `git-cliff.exe --version` hlásilo blokaci zásadou řízení aplikací Windows.

Stejný stav nastal také mimo sandbox, samotné opakování s vyšším oprávněním jej nevyřešilo.

K 2026-09-21 prošly `npm test` a `npm run docs:build` v ověřeném prostředí.

Při nové chybě nejprve rozliš dostupnost binárky od oprávnění k dočasnému testovacímu repozitáři.

Při této chybě rozliš systémové odmítnutí spuštění od chybějící Git historie nebo oprávnění k testovacímu repozitáři.

Generátor se nenahrazuje náhradním changelogem a starý artefakt není důkazem nového sestavení.

**Vlastník a uzavření:** Správce prostředí vyřeší dostupnost nástroje podle místní politiky a opravu potvrdí úspěšný `npm test` a `npm run docs:build` podle [projektových příkazů](../development/commands.md).

### Symptom: web je nasazený, ale oznámení nepřišlo

1. Potvrď úspěšný krok `Publikuje GitHub Pages` a veřejný smoke.
2. Zkontroluj výsledek kroku `Odešle oznámení o změnách` bez zobrazení hodnot tajemství.
3. Rozliš chybějící secret, odmítnuté přihlášení, limit poskytovatele a neplatného příjemce.
4. Po nápravě ověř, zda poslední publikovaný commit `gh-pages` nese značku `docs-source` pro aktuální revizi `main`; opakování stejné revize oznámení záměrně neodešle.

**Potvrzení příčiny:** SMTP krok obsahuje konkrétní neúspěch a veřejný web je současně zdravý.

**Bezpečná náprava:** Oprav řízené tajemství nebo konfiguraci poskytovatele; další nová revize `main` odešle další oznámení až po svém nasazení.

**Eskalace:** Správce poštovní identity nebo vlastník GitHub Secrets.

## Zálohování a obnova

### Obnova lokálního Git propojení

Při chybějícím `.git` obnov skutečnou historii z kanonického repozitáře v [hostingu a VCS](../delivery/ci-cd.md#hosting-a-vcs).

1. Zajisti kopii pracovních souborů a jejich kontrolní součty, poté ověř remote a přístup.
2. Z úplné historie zjisti odpovídající výchozí revizi a vztah větví `main` a `develop`, jejich shodu nepředpokládej.
3. Obnov metadata a index bez přepsání pracovních souborů, větve a sledování nastav podle [Git workflow](../development/workflow.md).
4. Porovnej kontrolní součty a stav pracovního stromu, potvrď zachování místních změn, úplnost historie a integritu Git objektů.

Obnova nepotřebuje smyšlené commity, změnu SSH klíčů ani automatické publikování.

Přesné diagnostické příkazy vlastní [ověření Git a SSH](../development/commands.md#ověření-git-a-ssh).

### Oblasti záloh

| Datová oblast | Způsob zálohy | Frekvence | Retence | Šifrování | Poslední ověřená obnova |
|---|---|---|---|---|---|
| Zdrojový obsah a konfigurace | Git remote a existující lokální klony | Každý push | Git historie podle hostingu a klonů | Přenos přes SSH nebo HTTPS, veřejný obsah není šifrovaný v repozitáři | 2026-08-28 lokální checkout sestavil úplný web |
| Generované přehledy | Znovuvytvoření z verzovaného zdroje | Při každém buildu | Samostatná záloha není nutná | Není relevantní | 2026-08-28 `npm run docs:generate` a kontrola prošly |
| Statický web | Nové sestavení a nasazení z vybraného zdrojového commitu | Každý publish | Pages větev a Git historie nasazení | Veřejný artefakt | 2026-08-28 veřejný smoke prošel |
| GitHub Secrets | Řízená správa GitHubu a poskytovatele identity | Mimo repozitář | Podle správce účtu | Spravuje platforma | Obnovu hodnot nelze z repozitáře ověřit |

Samostatná databázová záloha není použitelná, protože projekt nemá serverovou databázi.

Místní nákupní data chrání uživatel exportem přenositelného odkazu.

Vymazání dat prohlížeče není obnovitelné z Gitu.

Při oznámeném selhání ukládání nejprve exportuj aktuální nákup a teprve potom obnovuj stránku nebo opravuj oprávnění úložiště.

Průběh vaření se při změně zdrojové revize receptu obnoví od začátku.

Totéž nastane jednou u staršího uloženého postupu bez revize.

Jde o ochranu proti potvrzení jiných kroků po aktualizaci, nikoli o důvod vracet starý klientský stav ruční úpravou úložiště.

Při nečekané ztrátě odškrtnutí ověř změnu dávky, varianty, přílohy nebo zdrojového množství podle [datového životního cyklu](../architecture/overview.md#odvozená-data-a-rozsah-automatizace).

PDF nebo běžný textový seznam slouží ke čtení mimo web.

Editovatelný stav obnoví pouze platný Export nákupu ze stejné revize receptů.

### Symptom: import nákupu je odmítnutý nebo ukazuje rozdíly

1. Ověř, že příjemce vložil celý odkaz nebo kód z Exportu nákupu, nikoli PDF či čitelný seznam.
2. Při rozdílné revizi obnov oba weby a připrav nový export, při chybějícím receptu ověř shodnou verzi a adresu webu.
3. Při rozdílných dávkách nebo vlastních množstvích vyřeš každou nabídnutou volbu podle skutečného zamýšleného nákupu.
4. Při poškození nebo překročení limitu předávej nový úplný odkaz, případně menší nákup, nepřepisuj ručně jeho kód.

**Bezpečná náprava:** Odmítnutý import původní nákup nezmění.

Potvrzený import lze v otevřené stránce vrátit tlačítkem „Vrátit poslední změnu“.

**Eskalace:** Reprodukovatelný rozpor platné kopie předej engineeringu s neosobní fixture a verzí webu.

Cizí nákupní odkazy nepatří do veřejných logů.

### Symptom: sestavení vypisuje chybějící množství

1. Zkontroluj závěrečný počet obsahových warnings za kontrolou hotového webu, nulové počítadlo DocFX se vztahuje pouze na jeho fázi.
2. Rozliš obsahový warning `RECIPE_QUANTITY_MISSING` od chyby slovníku, tabulky nebo samotného DocFX.
3. Zkontroluj konkrétní soubor a řádek z výpisu nebo z `_generated/content-report.json` a doplň množství podle skutečného receptu.
4. Zopakuj [samostatnou kontrolu obsahu](../development/commands.md#statické-kontroly), po doplnění warning daného řádku zmizí.

**Hranice:** Obsahové warnings neblokují sestavení a nesmějí vést k odhadu dávky nebo oslabení strukturálních kontrol.

Při selhání PDF otevři náhled znovu nebo použij jeho tlačítko „Tisk“ a systémovou volbu uložení PDF.

Při diagnostice ověř po `npm ci` a čistém sestavení dostupnost `public/kitchen-pdf.mjs`, `public/pdfmake.min.js` a `public/vfs_fonts.js`.

Jejich cesty musí fungovat i pod podsložkou GitHub Pages.

## Rollback a bezpečné pokračování

Preferovaným návratem je nový revert commit přes běžný vývojový workflow, nikoli force push nebo ruční přepis Pages větve.

| Situace | Preferovaná akce | Datové omezení | Ověření | Eskalace |
|---|---|---|---|---|
| Vadný recept bez změny URL | Oprav nebo revertuj obsah na `develop` a znovu publikuj | Git historie zachová obě změny | Cílený detail a úplný build | Správce obsahu při nejasné věcné správnosti |
| Vadná navigace nebo generátor | Revertuj poslední příčinný commit nebo dodej kompatibilní opravu | Zdrojové recepty nemaž kvůli odvozené chybě | `npm test`, build a průchod katalogem | Engineering při nejasné migraci cest |
| Selhané nasazení bez změny zdroje | Opakuj ruční workflow na `main` po potvrzení dočasné příčiny | Nevytvářej zbytečný obsahový commit | Veřejný smoke a log nasazení | GitHub při platformním výpadku |
| Chybná změna veřejných URL | Preferuj roll-forward s obnovenou cestou nebo přesměrováním | Staré odkazy jsou veřejný kompatibilní závazek | Starý i nový odkaz podle přijatého rozhodnutí | Uživatel při volbě migrační strategie |

## Incident

Při incidentu nejprve chraň dostupný veřejný obsah, Git historii a tajemství.

Zaznamenej čas, dotčený commit, URL, ID workflow a provedené zásahy bez kopírování secrets nebo osobních údajů.

| Fáze | Povinný výstup |
|---|---|
| Detekce | Symptom, čas, rozsah a zdroj signálu |
| Omezení dopadu | Provedený bezpečný krok a jeho výsledek |
| Diagnostika | Potvrzená nebo pracovní hypotéza s důkazy |
| Obnova | Stav veřejného webu, zdroje a uživatelských scénářů |
| Následná práce | Příčina, preventivní opatření, vlastník a ověření |

## Údržba runbooku

Každý incident, změna hostingu, publikačního workflow nebo pozorovatelnosti musí posoudit aktuálnost tohoto runbooku.

Postup, který při skutečném použití nefungoval, se opraví ve stejné změně jako nápravné opatření.
