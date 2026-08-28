---
canonical_for: operations-runbook
status: accepted
last_verified: 2026-08-28
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
| Kritičnost služby | Nízká, veřejná osobní kuchařka bez transakcí a uživatelských dat |
| Podporovaná prostředí | Lokální náhled a GitHub Pages podle [`../delivery/ci-cd.md`](../delivery/ci-cd.md) |
| Hlavní uživatelské scénáře | `REQ-001`, `REQ-002`, `REQ-004` |
| Cíle dostupnosti a obnovy | Projekt nemá smluvní SLA, RPO ani RTO a chrání především obnovitelnost z Git historie |

## Ověření zdraví

Kontroly prováděj v uvedeném pořadí od nejméně invazivní.

| Kontrola | Jak ji provést | Zdravý výsledek | Typické selhání | Další krok |
|---|---|---|---|---|
| Veřejný vstup | Otevři `https://hopefuldavid.github.io/docs_lifetime/` | HTTP úspěch, nadpis `Dokumentace ze života` a katalog | 404, 5xx, starý nebo prázdný obsah | Ověř detail a poslední workflow |
| Reprezentativní detail | Otevři známý recept z katalogu | Nadpis, ingredience a kroky se vykreslí bez chyb konzole | Odkaz 404, chybějící styly nebo prázdný článek | Porovnej zdroj, TOC a `_site/` |
| České a anglické hledání | Vyhledej `Rajská`, `rajska`, `PIZZA`, `French Press`, `coffee` a dotaz bez shody | Správné výsledky, český nulový stav a konzole bez chyb | Prázdný výsledek pro známé slovo, anglický stav nebo chyba workeru | Ověř vlastní assety, `index.json` a verzi DocFX |
| Changelog | Otevři stránku `Změny` z hlavní navigace | Zdrojový stav odpovídá `HEAD`, čtenářské kategorie mají stabilní kotvy a úplné technické záznamy jsou sbalené | Chybějící starší změny, zastaralý zdrojový stav, posunuté datum nebo neformátovaný podporovaný typ | Reprodukuj generátor podle diagnostického stromu |
| Lokální reprodukce | Spusť úplnou lokální kontrolu z [`../development/commands.md`](../development/commands.md) | `npm test` a build projdou bez varování | Zastaralý generovaný soubor, vadný odkaz nebo neobnovený nástroj | Oprav nejbližší potvrzenou příčinu |
| CI | Otevři běh workflow `Dokumentace` pro dotčený commit | `verify-docs` a u `main` také `publish-docs` jsou úspěšné | Registry, oprávnění, sestavení, Pages nebo SMTP | Postupuj podle názvu prvního selhaného kroku |

## Pozorovatelnost

| Signál | Kanonický zdroj | Co znamená | Retence | Citlivost |
|---|---|---|---|---|
| Build log | GitHub Actions a lokální terminál | Obnova nástrojů, validace, sestavení a nasazení | Podle nastavení GitHubu, lokálně pouze po dobu relace | Nesmí obsahovat hodnoty secrets |
| HTTP výsledek | Veřejná URL nebo lokální server | Dostupnost konkrétního statického souboru | Bez projektové retence | Veřejný údaj |
| Konzole prohlížeče | Vývojářské nástroje při smoke scénáři | Klientské chyby šablony, hledání nebo načítání zdrojů | Standardně se neuchovává | Veřejný obsah a technické URL |
| Git historie | Repozitář; `changelog.md` je její generovaná projekce | Zdrojový stav a posloupnost obsahových změn | Trvalá podle Git hostingu a klonů | Veřejná metadata commitů |
| Aplikační logy, metriky a trasování | Nepoužívá se | Web nemá vlastní runtime proces | Není relevantní | Není relevantní |

Projekt nemá serverový health endpoint, protože na Pages běží pouze statické soubory.

## Nejčastější diagnostické stromy

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
2. Spusť `npm run docs:generate` a zkontroluj očekávaný záznam v příslušném `index.md` a `toc.yml`.
3. Spusť `npm test` a `npm run docs:build`.
4. Otevři odpovídající HTML v lokálním náhledu a porovnej URL s publikovaným odkazem.

**Potvrzení příčiny:** Cesta zdroje, generovaný odkaz nebo nasazený artefakt se liší od pravidel v architektuře.

**Bezpečná náprava:** Oprav autoritativní zdroj nebo generátor a nech odvozené soubory znovu vytvořit.

**Eskalace:** Změna již publikované stabilní URL vyžaduje rozhodnutí o kompatibilitě a případném přesměrování.

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

1. Spusť `npm run test:unit` a potvrď scénáře typů commitů, časových pásem a historie oddělené Git tagem.
2. Spusť `npm run changelog:generate`, porovnej hlavičku s `git rev-parse HEAD` a ignorovaný `changelog.md` s `git log` bez ruční úpravy výstupu.
3. Ověř úplný checkout a hodnotu `tag_pattern = "^$"` v kanonickém `cliff.toml`.
4. Spusť `npm run docs:build` a potvrď, že `_site/changelog.html` obsahuje stejnou historii, stabilní kotvy a sbalenou technickou sekci.
5. V CI ověř `fetch-depth: 0` a první selhaný krok `verify-docs` nebo `publish-docs`.

**Potvrzení příčiny:** Konkrétní commit chybí nebo má jinou skupinu v reprodukovaném CLI výstupu nad stejnou Git historií.

**Bezpečná náprava:** Oprav zdrojovou commit zprávu pouze novým commitem, nebo kompatibilně oprav generátor a znovu sestav artefakt; vygenerovaný soubor necommituj.

**Eskalace:** Přepis publikované Git historie, změna verzovacího modelu nebo ruční udržování changelogu vyžaduje samostatné rozhodnutí maintainera.

### Symptom: web je nasazený, ale oznámení nepřišlo

1. Potvrď úspěšný krok `Publikuje GitHub Pages` a veřejný smoke.
2. Zkontroluj výsledek kroku `Odešle oznámení o změnách` bez zobrazení hodnot tajemství.
3. Rozliš chybějící secret, odmítnuté přihlášení, limit poskytovatele a neplatného příjemce.
4. Po nápravě spusť řízený ruční běh na `main` pouze tehdy, když opakované oznámení nezpůsobí nežádoucí duplicitu.

**Potvrzení příčiny:** SMTP krok obsahuje konkrétní neúspěch a veřejný web je současně zdravý.

**Bezpečná náprava:** Oprava řízeného tajemství nebo konfigurace poskytovatele bez změny již publikovaného artefaktu.

**Eskalace:** Správce poštovní identity nebo vlastník GitHub Secrets.

## Zálohování a obnova

| Datová oblast | Způsob zálohy | Frekvence | Retence | Šifrování | Poslední ověřená obnova |
|---|---|---|---|---|---|
| Zdrojový obsah a konfigurace | Git remote a existující lokální klony | Každý push | Git historie podle hostingu a klonů | Přenos přes SSH nebo HTTPS, veřejný obsah není šifrovaný v repozitáři | 2026-08-28 lokální checkout sestavil úplný web |
| Generované přehledy | Znovuvytvoření z verzovaného zdroje | Při každém buildu | Samostatná záloha není nutná | Není relevantní | 2026-08-28 `npm run docs:generate` a kontrola prošly |
| Statický web | Nové sestavení a nasazení z vybraného zdrojového commitu | Každý publish | Pages větev a Git historie nasazení | Veřejný artefakt | 2026-08-28 veřejný smoke prošel |
| GitHub Secrets | Řízená správa GitHubu a poskytovatele identity | Mimo repozitář | Podle správce účtu | Spravuje platforma | Obnovu hodnot nelze z repozitáře ověřit |

Samostatná databázová záloha není použitelná, protože projekt žádnou databázi ani uživatelská data nemá.

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
