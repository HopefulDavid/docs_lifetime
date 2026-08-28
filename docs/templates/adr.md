---
canonical_for: decision-<number>-<stable-key>
status: proposed
date: YYYY-MM-DD
last_verified: YYYY-MM-DD
owners:
  - <role-or-team>
supersedes: null
superseded_by: null
---

# ADR-<číslo>: Stručný název rozhodnutí

## Kontext

Popiš problém, jeho hranice a důvod, proč je rozhodnutí potřebné právě nyní.

Odkazuj na kanonické požadavky a architekturu místo jejich kopírování.

Rozliš ověřenou skutečnost, cílový záměr a případný přechodový stav.

## Rozhodovací kritéria

- `<požadovaný výsledek>`
- `<kvalitativní scénář>`
- `<omezení>`
- `<nepřijatelný důsledek>`

## Výzkumné podklady

| Tvrzení nebo kritérium | Zdroj a verze | Datum ověření | Co podklad ukazuje | Omezení |
|---|---|---|---|---|
| `<kritérium>` | `<primární, produkční nebo nezávislý zdroj>` | `YYYY-MM-DD` | `<závěr>` | `<kontext>` |

Výzkum musí splnit [`../governance/research.md`](../governance/research.md).

## Zvažované varianty

U každé varianty popiš hlavní výhodu, nevýhodu, riziko a možnost návratu.

### Varianta A: Název podle výsledku

`DOPLNIT`

### Varianta B: Název podle výsledku

`DOPLNIT`

## Rozhodnutí

Jednoznačně uveď přijatou variantu.

Vysvětli vazbu na rozhodovací kritéria.

Nezamlč hlavní kompromis.

## Důsledky

### Pozitivní

- `<důsledek>`

### Negativní

- `<důsledek>`

### Rizika a opatření

| Riziko | Pravděpodobnost nebo dopad | Opatření | Ověření |
|---|---|---|---|
| `<riziko>` | `<hodnocení>` | `<opatření>` | `<fitness function, test nebo provozní signál>` |

## Migrace a kompatibilita

Popiš pořadí přechodu, kompatibilitu, návrat a podmínku odstranění dočasných mechanismů.

Pokud migrace není potřebná, stručně uveď proč.

## Ověření rozhodnutí

Uveď průběžné mechanismy, které ukážou, že rozhodnutí stále plní svůj účel.

Může jít o architektonický test, metriku, rozpočet, kontraktní test nebo periodické přezkoumání.

Nevytvářej metriku pouze proto, že je snadno měřitelná.

## Stav a nahrazení

Stav a případné nahrazení spravuj výhradně podle [`../architecture/decisions/README.md`](../architecture/decisions/README.md).
