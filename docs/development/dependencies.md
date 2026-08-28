---
canonical_for: dependency-policy
status: accepted
last_verified: 2026-08-28
owner: engineering
---

# Závislosti a vlastní infrastrukturní kód

## Projektově významné závislosti

| Závislost | Úloha | Kanonická verze | Důvod a hranice |
|---|---|---|---|
| Node.js | Spouští generátor, validátor a changelog nástroj | Řada v [`../../package.json`](../../package.json) | Node.js 24 je k datu ověření LTS a projekt používá pouze jeho standardní knihovnu pro vlastní skripty |
| `git-cliff` | Odvozuje kategorizovaný veřejný changelog z Git historie | [`../../package.json`](../../package.json) a [`../../package-lock.json`](../../package-lock.json) | Přesně uzamčená vývojová závislost; běží offline a nevstupuje do publikovaného webu jako runtime kód |
| DocFX | Převádí produktový Markdown a YAML do statického webu | [`../../.config/dotnet-tools.json`](../../.config/dotnet-tools.json) | Lokální .NET tool manifest připíná stejný nástroj pro vývoj i CI |
| GitHub Actions | Připravují prostředí, nasazují Pages a odesílají oznámení | [Workflow](../../.github/workflows/main.yml) | Každá akce je připnutá na ověřený commit SHA a čitelný hlavní tag zůstává v komentáři |

Node.js 24 byl dne 2026-08-28 ověřený jako podporovaná LTS řada podle [oficiálního přehledu vydání](https://nodejs.org/en/about/previous-releases).

DocFX 2.78.5 byl dne 2026-08-28 přijat po ověření [oficiálního vydání](https://github.com/dotnet/docfx/releases/tag/v2.78.5), sestavení bez varování a klientských hledacích scénářů.

Vestavěný worker DocFX nepodporuje češtinu, a proto jej vlastní jazykově nezávislá šablona nahrazuje podle [`ADR-0002`](../architecture/decisions/ADR-0002-vyhledavani-nad-docfx-indexem.md).

Lokální manifest a `dotnet tool restore` odpovídají [podporovanému modelu .NET nástrojů](https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools).

Vlastní generátor, validátor, testy a klientské hledání záměrně nepřidávají runtime knihovnu, protože jejich současné potřeby pokrývají standardní API Node.js a prohlížeče.

Volbu changelog nástroje a její migrační hranice přijímá [`ADR-0003`](../architecture/decisions/ADR-0003-generovani-changelogu-pomoci-git-cliff.md).

Nepoužívaná přímá závislost `argparse` byla při inicializaci odstraněná z manifestu i lockfilu.

## Základní pořadí

Před vytvořením vlastního pomocného řešení postupuj v tomto pořadí.

1. Ověř, zda potřeba nezmizí čistší změnou návrhu.
2. Ověř standardní knihovnu jazyka a podporované prostředky frameworku.
3. Ověř již přijaté závislosti projektu.
4. Prozkoumej vhodné udržované knihovny.
5. Vytvoř vlastní řešení pouze tehdy, když předchozí možnosti nejsou čisté, spolehlivé nebo vhodné pro projekt.

Vlastní infrastruktura je dlouhodobý produktový závazek.

Její zdánlivě malý počáteční rozsah nezahrnuje budoucí bezpečnost, kompatibilitu, dokumentaci, testování a údržbu.

## Hodnocení knihovny

Významnou novou závislost posuzuj podle [`../governance/research.md`](../governance/research.md).

Minimálně ověř:

- zda řeší skutečný problém bez rozsáhlého obcházení návrhu,
- podporované verze jazyka, runtime a platformy,
- stav údržby a rychlost řešení bezpečnostních problémů,
- kvalitu oficiální dokumentace a migračních poznámek,
- licenci a podmínky distribuce,
- tranzitivní závislosti a velikost provozního dopadu,
- stabilitu veřejného API,
- testovatelnost a možnost izolace,
- provoz bez nečekané externí služby,
- možnost reprodukovatelného obnovení,
- náklady na budoucí odstranění nebo výměnu.

Popularita je pouze pomocný signál.

Není náhradou kompatibility, bezpečnosti ani vhodnosti architektury.

## Kanonické verze

Manifest a lockfile jsou kanonické pro přesnou verzi závislosti.

Dokumentace vysvětluje důvod a omezení pouze u architektonicky významných závislostí.

Stejnou verzi nekopíruj do Markdownu, pokud ji lze získat z manifestu.

Všechny podporované ekosystémy používají uzamčení verzí nebo rovnocenný reprodukovatelný mechanismus.

Lockfile se commitne, pokud jej daný typ projektu určuje pro aplikace nebo reprodukovatelné sestavení.

Aktualizace manifestu a lockfilu patří do stejné změny.

## Lokální a řízená dostupnost

Build, testy a běh projektu nemají zbytečně záviset na náhodné dostupnosti internetu.

Preferuj řízené prostředí, které odpovídá ekosystému projektu.

Vhodné mechanismy zahrnují:

- lockfily a manifesty verzí nástrojů,
- lokální nebo organizační cache balíčků,
- řízený mirror nebo proxy registr,
- předpřipravený build image s doloženým původem,
- lokálně dostupné SDK podle verzovacího souboru,
- hermetické nebo reprodukovatelné sestavení, pokud přínos odpovídá složitosti,
- kontrolované stažení s integritní kontrolou a jasným fallbackem.

Třetí strany nevkládej do repozitáře automaticky.

Vendoring je vhodný pouze tehdy, když řeší konkrétní dostupnost, audit, patchování nebo distribuční omezení a projekt zvládne bezpečně udržovat aktualizace.

Vendored obsah musí mít původ, licenci, verzi, integritní údaj a postup aktualizace.

Síťová závislost, kterou nelze odstranit, musí být uvedená u příslušného příkazu a v CI dokumentaci.

Runtime závislost na externí službě patří do architektonického kontextu.

## Závislosti CI

Před vlastním skriptem preferuj udržovanou oficiální nebo zavedenou akci, pokud řeší úkol čistě a je kompatibilní s hostingovou platformou.

Nezaměňuj syntaktickou podobnost Forgejo Actions, Gitea Actions a GitHub Actions za úplnou kompatibilitu.

Použití vždy ověř proti dokumentaci konkrétní platformy.

Externí akci připni na neměnnou revizi, pokud to platforma podporuje.

Čitelnou verzi uveď v komentáři nebo řízeném aktualizačním nástroji, aniž by se z ní stal aktivní neuzamčený odkaz.

Omez oprávnění tokenu a přístup k tajemstvím na minimum.

Akce spuštěná z nedůvěryhodného příspěvku nesmí získat privilegované tajemství.

Vlastní CI implementace je přípustná, pokud:

- vhodná akce neexistuje,
- existující akce není udržovaná nebo důvěryhodná,
- není kompatibilní s platformou,
- zavádí nepřiměřené oprávnění nebo síťovou závislost,
- projekt potřebuje stejný lokálně spustitelný skript i mimo CI.

Vlastní skript má žít u projektového build systému, ne jako skrytá logika pouze ve workflow.

## Aktualizace a odstranění

Aktualizace závislosti se hodnotí podle změnových poznámek, kompatibility a rizika.

Automatizovaný update nevstupuje do `main` bez projektových kontrol.

Bezpečnostní aktualizace má prioritu odpovídající skutečnému dopadu a dosažitelnosti zranitelnosti.

Nepoužívanou závislost odstraň včetně konfigurace, lockfile záznamů, cache a dokumentace.

Nahrazená knihovna nemá zůstat jako neurčitá záloha.

Dočasné souběžné použití musí být označené jako přechod s podmínkou ukončení.

## Rozhodnutí vytvořit vlastní řešení

Významná vlastní infrastruktura vyžaduje ADR.

ADR musí vysvětlit, proč standardní prostředky a vhodné knihovny nebyly použitelné.

Musí určit veřejný rozsah, vlastníka, testovací strategii, bezpečnostní odpovědnost a podmínku případné náhrady.
