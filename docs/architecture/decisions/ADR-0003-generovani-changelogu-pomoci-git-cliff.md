---
canonical_for: decision-0003-git-cliff-changelog
status: accepted
date: 2026-08-28
last_verified: 2026-08-28
owners:
  - engineering
  - delivery
supersedes: null
superseded_by: null
---

# ADR-0003: Generování changelogu pomocí git-cliff

## Kontext

Projekt generoval changelog pomocí `conventional-changelog-cli` 5.0.0, vlastní CommonJS transformace a pomocného čistícího skriptu.

Baseline integrační test ukázal, že CLI vlastní konfiguraci nepoužilo, vytvořilo výchozí anglický tagový formát a neoznačilo breaking change.

Cílem je obnovit spolehlivé generování při každém buildu stejným mechanismem jako v souvisejícím dokumentačním projektu, zachovat čitelné české kategorie a nezamlčet nekonvenční ani breaking commity.

Rozhodnutí podporuje `REQ-004` a `QLT-001` v [`../../product/requirements.md`](../../product/requirements.md) a build hranici popsanou v [`../overview.md`](../overview.md).

## Rozhodovací kritéria

- Nástroj musí zpracovat úplnou existující Git historii bez ručních změnových souborů a bez závislosti na release tazích.
- Stejná konfigurace musí fungovat na podporovaném Windows prostředí i linuxovém GitHub runneru s Node.js 24.
- Výstup musí být deterministický, český, kategorizovaný, uvádět krátký identifikátor zdrojového commitu bez odkazu a viditelně označit breaking change.
- Verze a integrita nástroje musí být uzamčené projektovým npm lockfilem.
- Generování nesmí potřebovat GitHub API token, síť za běhu ani vlastní dlouhodobě udržovaný parser historie.

## Výzkumné podklady

| Tvrzení nebo kritérium | Zdroj a verze | Datum ověření | Co podklad ukazuje | Omezení |
|---|---|---|---|---|
| Současná integrační hranice je rozbitá | Projektový baseline: `npm test` s `conventional-changelog-cli` 5.0.0 | 2026-08-28 | 13/14 testů prošlo, ale skutečné CLI ignorovalo vlastní formát a breaking marker | Pozorování platí pro výchozí lockfile a Node.js 24 |
| Podporovaná npm a konfigurační cesta | [git-cliff: instalace z npm](https://git-cliff.org/docs/installation/npm/) a [konfigurace](https://git-cliff.org/docs/configuration/) pro verzi 2.13.1 | 2026-08-28 | Nástroj podporuje projektovou devDependency, Node.js 24, Windows a Linux a preferuje verzovaný TOML soubor | Npm balíček spouští platformní binárku |
| Schopnosti nad Git historií | [git-cliff: Git konfigurace](https://git-cliff.org/docs/configuration/git/) a [šablony changelogu](https://git-cliff.org/docs/configuration/changelog/) | 2026-08-28 | Nástroj parsuje Conventional Commits, zachová nekonvenční záznamy a umožní vlastní skupiny i Tera šablonu | Přesný výstup je odpovědností projektového `cliff.toml` |
| Původní ekosystém zůstává aktivní, ale zachovává transformační vrstvu | [Conventional Changelog](https://github.com/conventional-changelog/conventional-changelog) | 2026-08-28 | Původní projekt je udržovaný a umí generovat z Git metadat | Pokračování by zachovalo vlastní JavaScript transformace a rozdílný tok obou repozitářů |
| Changesets řeší jiný životní cyklus | [Changesets](https://github.com/changesets/changesets) | 2026-08-28 | Nástroj spojuje ruční changesety s verzováním a publikováním balíčků | Projekty nemají balíčkové release ani požadavek na ruční změnová metadata |
| Zvolená cesta funguje v projektových podmínkách | Lokální fixture experiment s `git-cliff` 2.13.1, tagem, conventional i legacy commitem a dvěma hodnotami `TZ` | 2026-08-28 | Výstup obsahoval celou historii, shodný text v obou prostředích, breaking marker, scope a krátké identifikátory bez commit URL | Linux potvrzuje průběžně stejný integrační test v CI |

Výzkum splňuje [`../../governance/research.md`](../../governance/research.md) kombinací projektových důkazů, primárních zdrojů a lokálního experimentu.

## Zvažované varianty

### Varianta A: Pokračovat s Conventional Changelog

Aktualizace původního CLI by měla nejmenší pojmovou změnu, ale ponechala by vlastní JavaScript transformace, Handlebars šablonu a historicky rozdílné zapojení obou projektů.

Návrat je snadný, avšak varianta neodstraňuje hlavní zdroj složitosti.

### Varianta B: Zavést ruční změnová metadata

Changesets poskytují kvalitní release workflow a promyšlené verzování více balíčků.

Pro průběžně publikované dokumentační weby by však přidaly nový povinný artefakt ke každé změně a neuměly by bez migrace nahradit úplnou existující historii.

### Varianta C: Generovat pomocí git-cliff

`git-cliff` přímo čte Git historii, používá deklarativní TOML a dovoluje stejnou kategorizaci, šablonu a test v obou projektech.

Npm distribuce odpovídá současnému Node toolchainu, ale přidává platformní binární balíčky do vývojových závislostí.

### Varianta D: Napsat vlastní Node.js generátor

Vlastní skript by odstranil externí changelog knihovnu, ale projekt by převzal parser Conventional Commits, práci s tagy, šablonování, platformní rozdíly Gitu a jejich budoucí údržbu.

Tato odpovědnost nemá proti udržované knihovně jedinečnou hodnotu.

## Rozhodnutí

Přijímáme variantu C a přesně uzamykáme `git-cliff` 2.13.1 v `package.json` a `package-lock.json`.

Oba dokumentační projekty používají shodnou šablonu, parsery, pořadí skupin, časové pásmo `Europe/Prague`, integrační test a npm příkaz.

`tag_pattern = "^$"` vyjadřuje průběžný nevydávaný model a spojuje celou dosažitelnou historii do jednoho kategorizovaného přehledu.

Generování běží v offline režimu a nepotřebuje konfiguraci vzdáleného repozitáře; zdroj i položky zobrazují krátký hash jako neklikací kód.

Výstup uvádí zdrojový commit a počet zahrnutých commitů, čtenářské kategorie zobrazuje přímo a technické typy zachovává ve sbaleném bloku se stabilními kotvami.

Aktivní `changelog.md` je ignorovaný build vstup a při každém sestavení se celý přepíše.

## Důsledky

### Pozitivní

- Oba projekty mají jeden reprodukovatelný a testovaný způsob generování.
- Deklarativní konfigurace nahrazuje vlastní transformační JavaScript a pomocné čistící skripty.
- Každý záznam ukazuje kategorii, scope, projektové datum, breaking stav a krátký neklikací hash commitu.
- Čtenář ihned pozná zdrojový stav výstupu, zatímco technické commity nezatěžují hlavní přehled a přesto zůstávají dostupné.
- Tag ani nekonvenční historická zpráva tiše neodříznou starší změny.

### Negativní

- Čistá instalace stahuje npm obal a platformní binárku `git-cliff`.
- Údržba šablony vyžaduje znalost TOML a Tera syntaxe.
- Datum je normalizované do projektového časového pásma, nikoli zobrazené v původním offsetu autora.

### Rizika a opatření

| Riziko | Pravděpodobnost nebo dopad | Opatření | Ověření |
|---|---|---|---|
| Mělký checkout vynechá historii | Vysoký dopad | CI používá `fetch-depth: 0` | Review workflow a fixture test přes tag |
| Nový typ commitu zmizí | Nízká pravděpodobnost, střední dopad | Poslední parser zachová každý nekonvenční nebo neznámý záznam v kategorii Ostatní | Integrační test legacy commitu |
| Breaking change nebude patrná | Vysoký dopad pro čtenáře | Šablona kontroluje strukturovaný příznak `breaking` | Integrační fixture s `feat(scope)!` |
| Platformní npm balíček nebude dostupný | Nízká pravděpodobnost, střední dopad | Přesný lockfile, npm cache a podporované platformy projektu | `npm ci`, Windows regrese a linuxové CI |

## Migrace a kompatibilita

Nejdříve se přidá uzamčená závislost, `cliff.toml` a integrační test skutečné binárky.

Poté build dál generuje ignorovaný `changelog.md` před DocFX a překonaná JavaScript konfigurace i čistící skript se odstraní.

Existující Git historie zůstává jediným autoritativním vstupem a změna formátu neodstraňuje žádný dosažitelný commit.

Návrat vyžaduje obnovení předchozí konfigurace, závislosti a testu v jednom commitu; žádná data ani vzdálený stav se nemigrují.

## Ověření rozhodnutí

- `npm run changelog:generate` vždy přepíše ignorovaný výstup z dosažitelné historie.
- `tests/changelog.test.mjs` ověřuje tag, conventional i legacy commit, zdrojový stav, stabilní kotvy, sbalené technické změny, breaking marker, krátké hashe, nepřítomnost commit URL a shodu mezi dvěma prostředími.
- Úplný projektový profil ověřuje, že DocFX zahrne stejný výstup do statického webu.
- Při upgradu se znovu ověří oficiální platformní podpora, lockfile, fixture a oba projektové buildy.

## Stav a nahrazení

Rozhodnutí je přijaté a dosud nebylo nahrazené.
