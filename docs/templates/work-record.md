---
task_id: WORK-<id>
status: active
started: YYYY-MM-DD
last_updated: YYYY-MM-DDTHH:MM:SSZ
owner: <agent-or-person>
branch: develop
scope:
  - <affected-area>
---

# WORK-<id>: Stručný název výsledku

> Tento soubor je dočasný.
>
> Stabilní projektová fakta nekopíruj a odkazuj na jejich kanonický zdroj.
>
> Po dokončení přenes trvalé informace a tento soubor odstraň.

## Požadovaný výsledek

Jednou až třemi větami popiš pozorovatelný konečný stav.

Každou větu napiš jako samostatný odstavec oddělený právě jedním prázdným řádkem podle [kanonického stylu Markdownu](../governance/documentation.md#styl-markdownu).

## Kanonické vstupy

- Produktové scénáře: [`../product/requirements.md#...`](../product/requirements.md)
- Architektura: [`../architecture/overview.md#...`](../architecture/overview.md)
- Relevantní ADR: [`../architecture/decisions/...`](../architecture/decisions/README.md)
- Projektové příkazy: [`../development/commands.md`](../development/commands.md)
- Issue nebo externí zadání: `<odkaz-nebo-identifikátor>`

## Akceptační kritéria

Kritéria formuluj pozorovatelně.

Neopisuj implementační kroky.

- [ ] `<výsledek nebo odkaz na REQ-*>`
- [ ] `<důležitá chybová nebo kompatibilní cesta>`
- [ ] `<požadovaný důkaz>`

## Omezení a mimo rozsah

### Omezení

- `<přijaté omezení nebo odkaz>`

### Mimo rozsah

- `<vědomě neřešená oblast a důvod>`

## Orientace v dotčené oblasti

Uveď pouze informace nutné k bezpečnému navázání.

Stabilní popis systému ponech v architektuře.

| Prvek | Úloha v tomto úkolu | Kanonický nebo zdrojový odkaz |
|---|---|---|
| `<soubor, modul nebo tok>` | `<proč je relevantní>` | `<relativní odkaz>` |

## Výchozí stav a baseline

| Datum a čas UTC | Prostředí | Příkaz nebo pozorování | Výsledek | Význam |
|---|---|---|---|---|
| `YYYY-MM-DDTHH:MM:SSZ` | `<prostředí>` | `<přesný příkaz>` | `<kód a stručný výstup>` | `<baseline, známá závada nebo omezení>` |

## Výzkumné podklady

Uváděj pouze podklady, které mohou ovlivnit tento úkol.

Trvalý důvod významného rozhodnutí přesuň do ADR.

| Tvrzení nebo otázka | Zdroj a verze | Datum ověření | Závěr pro úkol | Jistota nebo omezení |
|---|---|---|---|---|
| `<otázka>` | `<primární odkaz>` | `YYYY-MM-DD` | `<závěr>` | `<omezení>` |

## Rozhodnutí

### Přijatá rozhodnutí

| Datum UTC | Rozhodnutí | Rozhodl | Důvod pro tento úkol | Trvalý cíl |
|---|---|---|---|---|
| `YYYY-MM-DD` | `<volba>` | `AI nebo uživatel` | `<stručný důvod>` | `<ADR, požadavek nebo pouze tento záznam>` |

### Blokující rozhodnutí

| ID | Otázka | Stav | Rozhodovací karta | Co lze dělat bez odpovědi |
|---|---|---|---|---|
| `DEC-01` | `<otázka>` | `open` | `<odkaz nebo vložená karta>` | `<neblokovaná práce>` |

## Milníky a průběh

Tato tabulka je současně plánem i průběžným stavem.

Nevytvářej druhý checklist se stejnými kroky.

| ID | Ověřitelný výsledek | Stav | Důkaz dokončení | Poslední změna UTC |
|---|---|---|---|---|
| `M1` | `<samostatně ověřitelný výsledek>` | `pending` | — | `YYYY-MM-DDTHH:MM:SSZ` |
| `M2` | `<samostatně ověřitelný výsledek>` | `pending` | — | `YYYY-MM-DDTHH:MM:SSZ` |

Povolené stavy jsou `pending`, `in-progress`, `blocked`, `done` a `dropped`.

Stav `dropped` vyžaduje důvod v rozhodnutích.

Právě jeden milník má být `in-progress`, pokud úkol není blokovaný.

## Objevy, neúspěšné pokusy a rizika

Zapiš překvapení, které mění plán, brání opakování slepé cesty nebo musí znát další agent.

Běžný výpis každé editace sem nepatří.

| Datum UTC | Typ | Pozorování a důkaz | Dopad na další postup |
|---|---|---|---|
| `YYYY-MM-DDTHH:MM:SSZ` | `discovery, failed-attempt nebo risk` | `<stručný fakt>` | `<změna plánu nebo žádná>` |

## Ověření výsledku

| Akceptační kritérium nebo riziko | Přesný příkaz či scénář | Prostředí | Výsledek | Artefakt nebo důkaz |
|---|---|---|---|---|
| `<REQ nebo riziko>` | `<přesný postup>` | `<prostředí>` | `<pass, fail nebo blocked>` | `<cesta, commit nebo výstup>` |

## Dotčené soubory a necommitované změny

Tato sekce chrání před nechtěným zásahem do cizí práce.

Neslouží jako trvalý seznam architektury.

| Cesta nebo oblast | Vlastník změny | Stav | Poznámka |
|---|---|---|---|
| `<cesta>` | `tento úkol, uživatel nebo jiný úkol` | `<stav>` | `<riziko nebo žádné>` |

## Další bezpečný krok

Napiš právě jeden konkrétní krok, kterým může nový agent bezpečně pokračovat.

Uveď potřebný pracovní adresář, příkaz nebo soubor a očekávaný výsledek.

Nevkládej neurčité „pokračovat v implementaci“.

## Stav předání

- Poslední ověřený commit: `<hash-nebo-dosud-žádný>`
- Aktuální milník: `<M*>`
- Běžící procesy nebo dočasné prostředí: `<stav a bezpečné ukončení>`
- Známé cizí změny: `<odkaz na tabulku nebo žádné>`
- Poslední smoke ověření: `<čas a výsledek>`
- Blokace: `<DEC-* nebo žádné>`

## Kontrola přenosu trvalých znalostí

Tuto část vyplň před odstraněním souboru.

- [ ] Produktové změny jsou v kanonických požadavcích.
- [ ] Architektura, rizika a přechody jsou v architektonickém přehledu.
- [ ] Významná rozhodnutí jsou v ADR.
- [ ] Příkazy, testování, CI a provozní postupy jsou aktualizované.
- [ ] Akceptační kritéria mají důkaz.
- [ ] Zbývající rizika mají kanonického vlastníka.
- [ ] Soubor lze bezpečně odstranit.
