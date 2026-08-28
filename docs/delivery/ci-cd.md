---
canonical_for: ci-cd-and-delivery
status: accepted
last_verified: 2026-08-28
owner: delivery
---

# CI, vydávání a nasazení

Tento dokument je kanonickým popisem platformy, fází CI, vydávání a nasazení.

Přesná workflow konfigurace zůstává strojově kanonická v [`.github/workflows/main.yml`](../../.github/workflows/main.yml).

## Hosting a VCS

| Vlastnost | Ověřená hodnota | Důkaz |
|---|---|---|
| Hostingová platforma | GitHub | SSH remote `github.com:HopefulDavid/Docs_Lifetime.git` a adresář `.github/` |
| VCS | Git | `.git/`, lokální historie a remote `origin` |
| Výchozí větev hostingu | `main` | `origin/HEAD -> origin/main` |
| Vývojová větev | `develop` | [`../development/workflow.md`](../development/workflow.md) |
| Kanonická cesta CI | `.github/workflows/main.yml` | [Workflow](../../.github/workflows/main.yml) |
| Runner nebo executor | GitHub-hosted `ubuntu-latest` | Oba joby ve workflow |
| Veřejné prostředí | GitHub Pages | `https://hopefuldavid.github.io/docs_lifetime/` a publikační krok |

Veřejný web a reprezentativní nejnovější recept byly dne 2026-08-28 dostupné bez chyb konzole.

## Lokální ekvivalence

Každý ověřovací krok CI volá stejný projektový vstup jako lokální vývoj.

Přesné lokální příkazy jsou v [`../development/commands.md`](../development/commands.md).

| Fáze CI | Projektový příkaz | Platformní obal | Výstupní důkaz |
|---|---|---|---|
| Obnova JavaScript nástrojů | `npm ci --ignore-scripts --no-audit --no-fund` | Node.js z `actions/setup-node` a npm cache podle lockfilu | Úspěšná čistá instalace |
| Obnova DocFX | `dotnet tool restore` | .NET 8 z `actions/setup-dotnet` | Přesná verze z tool manifestu |
| Kontrola zdrojů | `npm test` | Čtecí checkout s úplnou historií | Hledací, negativní a changelogové testy, generované soubory a strukturální validace projdou |
| Sestavení | `npm run docs:build` | Varování DocFX jsou chybou | `_site/` z jednoho checkoutu |
| Changelog | `npm run changelog:generate` jako součást sestavení | Každý build s úplnou historií | Ignorovaný `changelog.md` zahrnutý do `_site/` |

Generátor vždy přepisuje changelog z celé dosažitelné historie a `tag_pattern = "^$"` záměrně vypíná release segmentaci, takže Git tag neodřízne starší záznamy.

Šablona používá projektové časové pásmo `Europe/Prague`, stejný commit proto dostane shodné datum bez ohledu na `TZ` lokálního procesu nebo GitHub runneru.

Konfigurace jednotně zobrazuje typy povolené vývojovým workflow, zachovává neznámé hlavičky, uvádí krátké neklikací hashe a nekompatibilní změnu označuje varovným symbolem.

## Názvy workflow a kroků

Zobrazované názvy workflow, jobů a kroků jsou v češtině a popisují prováděný výsledek.

Technické identifikátory `verify-docs` a `publish-docs` zůstávají stabilní pro diagnostiku a případné odkazy.

## Externí akce a knihovny

| Závislost | Účel | Aktuální odkaz | Oprávnění nebo tajemství | Známé omezení |
|---|---|---|---|---|
| `actions/checkout` | Načtení úplného repozitáře | Ověřený commit SHA s komentářem `v7` | Čtení obsahu, v publikačním jobu token zdědí jeho zápis | Aktualizace vyžaduje kontrolu nového SHA |
| `actions/setup-node` | Řízený Node.js 24 a npm cache | Ověřený commit SHA s komentářem `v6` | Bez publikačních tajemství | Aktualizace vyžaduje kontrolu nového SHA |
| `actions/setup-dotnet` | Řízené .NET SDK 8 | Ověřený commit SHA s komentářem `v5` | Bez publikačních tajemství | Aktualizace vyžaduje kontrolu nového SHA |
| `peaceiris/actions-gh-pages` | Push statického artefaktu do Pages větve | Ověřený commit SHA odpovídající `v4` | `GITHUB_TOKEN` s `contents: write` | Větev vzniká jako jediný orphan commit posledního nasazení |
| `dawidd6/action-send-mail` | Odeslání oznámení po nasazení | Ověřený commit SHA s komentářem `v17` | SMTP identita, heslo a příjemci | Krok je neblokující |

Přesné revize zůstávají pouze ve workflow a kontroluje je `npm run docs:validate`.

## Oprávnění a tajemství

Workflow má výchozí oprávnění `contents: read`.

Pouze `publish-docs` po úspěšném ověření získává `contents: write`, které potřebuje pro nasazovací větev.

Pull requesty a větev `develop` nespouštějí job s publikačními tajemstvími.

| Tajemství nebo identita | Účel | Dostupné fáze | Vlastník | Rotace |
|---|---|---|---|---|
| `GITHUB_TOKEN` | Push statického webu do nasazovací větve | Pouze `publish-docs` | GitHub a maintainers | Krátkodobý token pro každý job spravuje GitHub |
| `MAIL_USERNAME` | Přihlášení k SMTP a adresa odesílatele | Pouze krok oznámení | Maintainers | Po podezření na únik nebo změně poštovní identity |
| `MAIL_PASSWORD` | Přihlášení k SMTP | Pouze krok oznámení | Maintainers | Po podezření na únik, změně účtu nebo podle politiky poskytovatele |
| `MAIL_RECIPIENTS` | Čárkami oddělený seznam příjemců | Pouze krok oznámení | Maintainers | Při změně distribučního seznamu nebo podezření na zveřejnění |

Hodnoty tajemství se nesmějí objevit v repozitáři, logu, changelogu ani statickém artefaktu.

## Reprodukovatelnost a dostupnost

Node.js používá řadu 24 z `package.json`, npm používá commitnutý lockfile a DocFX přesnou verzi z `.config/dotnet-tools.json`.

CI obnovuje npm a NuGet nástroje před ověřením a nespoléhá na globální náhodnou verzi DocFX.

Cache pouze urychluje obnovu a autoritativní identitu balíčků určují lockfile, integritní údaje a tool manifest.

Externí akce jsou připnuté na úplný commit SHA a čitelný hlavní tag zůstává pouze komentářem.

Statický artefakt se v publikačním jobu sestaví jednou a beze změny se odešle do GitHub Pages větve.

## Spouštěče a ochrany

| Událost | Workflow | Povinné kontroly | Oprávnění | Poznámka |
|---|---|---|---|---|
| Push do `develop` | `verify-docs` | Obnova, `npm test`, sestavení bez varování | `contents: read` | Nic se nepublikuje |
| Pull request do `develop` nebo `main` | `verify-docs` | Obnova, `npm test`, sestavení bez varování | `contents: read` | Tajemství publikování se nepoužijí |
| Push do `main` | `verify-docs` a po něm `publish-docs` | Stejné kontroly, changelog, sestavení, nasazení | Čtení, poté izolované `contents: write` | Jediný automatický publikační tok |
| Ruční spuštění na `main` | Ověření a publikování | Stejné jako push do `main` | Stejné jako push do `main` | Vhodné pro opakování po dočasném selhání platformy |
| Ruční spuštění na jiné větvi | Pouze `verify-docs` | Obnova, `npm test`, sestavení bez varování | `contents: read` | Podmínka jobu zabrání publikování |
| Tag nebo release | Žádný samostatný tok | — | — | Projekt nepoužívá verzované release artefakty |

Publikační job nikdy nezapisuje do `main`; changelog vzniká pouze v jeho dočasném workspace a nasazovací větev obsahuje jediný orphan commit posledního artefaktu.

### Ochrana větví

GitHub dne 2026-08-28 vynucuje dva aktivní repozitářové rulesety pro zdrojové větve.

| Větev | Cílení rulesetu | Vynucené podmínky | Povolený tok |
|---|---|---|---|
| `main` | [`Ochrana main`](https://api.github.com/repos/HopefulDavid/Docs_Lifetime/rulesets/21745379) na výchozí větev | Pull request, vyřešené konverzace, aktuální větev a úspěšná kontrola `Ověření dokumentace` z GitHub Actions, zákaz smazání a force pushe | Merge commit bez povinného schválení |
| `develop` | [`Ochrana develop`](https://api.github.com/repos/HopefulDavid/Docs_Lifetime/rulesets/21745490) přesně na `refs/heads/develop` | Zákaz smazání a force pushe | Přímý push, po kterém běží `verify-docs` |
| `gh-pages` | Bez rulesetu | Žádná ochrana větve | Publikační job přepisuje větev pomocí `force_orphan` |

Oba zdrojové rulesety mají prázdný bypass seznam a nejsou doplněné klasickou branch protection.

Nechráněná nasazovací větev `gh-pages` je záměrná, protože její ochrana proti non-fast-forward aktualizaci by blokovala současný publikační mechanismus.

## Prostředí a propagace

| Prostředí | Účel | Zdroj artefaktu | Schválení | Ověření po nasazení | Rollback |
|---|---|---|---|---|---|
| Lokální `_site/` | Vývojový náhled a vizuální kontrola | Aktuální checkout | Žádné | Reprezentativní smoke v prohlížeči | Odstranit a znovu sestavit |
| GitHub Actions | Ověření a vytvoření artefaktu | Commit události | `main` vyžaduje pull request a úspěšné `Ověření dokumentace`; `develop` povoluje přímý push | Log sestavení a obsah `_site/` | Opravit nebo revertovat zdrojovou změnu |
| GitHub Pages | Veřejné čtení | `_site/` z `publish-docs` | Úspěšný `verify-docs` a větev `main` | Veřejná úvodní stránka a reprezentativní recept | [`../operations/runbook.md`](../operations/runbook.md#rollback-a-bezpečné-pokračování) |

Projekt nemá staging prostředí ani runtime datovou migraci.

## Release

Projekt používá průběžné vydávání z větve `main` bez samostatného čísla verze nebo tagu.

| Krok | Spouštěč | Kanonický nástroj nebo soubor | Ověření |
|---|---|---|---|
| Ověření zdroje | Push nebo ruční běh na `main` | `npm test` a `npm run docs:build` | Job `verify-docs` projde |
| Vytvoření historie změn | Sestavení artefaktu | `cliff.toml`, uzamčený `git-cliff` a `npm run changelog:generate` | Ignorovaný changelog odpovídá úplné dosažitelné historii bez ohledu na tag a časové pásmo procesu |
| Sestavení artefaktu | Ověřený checkout publikačního jobu | `npm run docs:build` | DocFX skončí bez varování a chyb |
| Publikování | Úspěšné sestavení | `peaceiris/actions-gh-pages` | Veřejný smoke GitHub Pages |
| Oznámení | Úspěšné nasazení | `dawidd6/action-send-mail` | Výsledek kroku v logu, selhání je neblokující |

## Selhání a diagnostika

Neúspěšný `verify-docs` se reprodukuje stejnými příkazy z [`../development/commands.md`](../development/commands.md).

Neúspěšný build nesmí pokračovat do publikačního jobu.

Selhání generování changelogu nebo nasazení se diagnostikuje podle checkoutu, úplnosti historie, tokenových oprávnění a logu nasazovací akce.

Selhání e-mailu se řeší až po potvrzení, že web byl nasazený, a nesmí vyvolat návrat funkčního webu.

Přesný provozní postup je v [`../operations/runbook.md`](../operations/runbook.md).

## Aktualizace dokumentu

Tento dokument se aktualizuje ve stejné změně jako hosting, workflow, runner, oprávnění, prostředí, release, deployment nebo rollback.
