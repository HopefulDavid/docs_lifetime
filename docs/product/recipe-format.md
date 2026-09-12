---
canonical_for: recipe-content-format
status: accepted
last_verified: 2026-09-12
owner: content
---

# Jednotný zápis receptu

Tento dokument vlastní autorskou strukturu receptu a pravidla jeho použitelnosti při nákupu a vaření.

Chování rozhraní vlastní [produktové požadavky](requirements.md), technické odvození katalogu vlastní [architektura](../architecture/overview.md).

## Struktura

Recept zůstává jedním Markdown souborem na své dosavadní veřejné cestě.

Používá jeden hlavní nadpis, krátký věcný popis, sekci `## Ingredience`, případné `## Pomůcky` a `## Než začnete`, potom `## Postup` s nadpisy `### 1. Název kroku` pokračujícími bez mezer v číslování.

Úvod popisuje skutečné jídlo a jeho hlavní složky; neopakuje obecné pochvaly a neodvozuje dobu přípravy ani počet porcí.

Postup používá rozkazovací způsob v množném čísle, například „Nakrájejte“, „Promíchejte“ a „Podávejte“.

Každý bod popisuje srozumitelnou činnost, související tip či upozornění zůstává u příslušného kroku.

Dlouhé marinování, chlazení nebo uležení patří také do sekce „Než začnete“, aby čtenář zjistil čekání před zahájením vaření.

## Suroviny

Každá potravina má vlastní řádek tabulky se sloupci `Surovina`, `Množství` a `Upřesnění`.

Názvy surovin a jejich nákupní oddělení vlastní [`data/ingredients.json`](../../data/ingredients.json).

Stejná surovina používá stejný název ve všech receptech, ale neslučují se odlišné produkty, například smetana na vaření a smetana ke šlehání nebo celý a mletý pepř.

Značka, velikost balení, úprava a účel patří do upřesnění; prázdné upřesnění se zapisuje jako `—`.

```markdown
## Ingredience

Množství platí pro jednu původní dávku; počet porcí není uveden.

| Surovina | Množství | Upřesnění |
|---|---|---|
| Cibule | 2 ks | velké, nakrájené nadrobno |
| Máslo nebo Ghí | 60 g | na základ |
| Sůl | dle chuti | — |
| Smetana ke šlehání | neuvedeno | 33 % tuku |

### Příloha (volitelné)

| Surovina | Množství | Upřesnění |
|---|---|---|
| Chléb | neuvedeno | k podávání |
```

Alternativy odděluje přesně ` nebo ` a každý název musí existovat ve slovníku surovin.

Čtenář z alternativ vybírá jednu; seznam nepřikazuje koupit všechny.

Samostatná volitelná surovina používá upřesnění `volitelné`, celá volitelná skupina nadpis zakončený `(volitelné)`.

Pomůcky nejsou potraviny a patří mimo tabulky ingrediencí.

Pitná voda a led zůstávají dohledatelné v oddělení „Doma připravit“.

Hotový vývar a suroviny na jeho domácí výrobu se nesmějí automaticky započítat současně.

## Množství a nejistota

Přesné množství lze zapsat číslem a jednotkou, například `500 g`, `0,5 lžičky` nebo `2,5–3 l`.

Podporované převody vlastní [`kitchen-core.mjs`](../../templates/kitchen/public/kitchen-core.mjs); převádí pouze kg na g a l na ml, nikdy lžíce na gramy ani kusy na hmotnost.

`neuvedeno` znamená, že zdroj množství neobsahuje, zatímco `dle chuti` znamená skutečné dochucování podle receptu.

Chybějící hmotnost balení nebo objem hrnku se uvádí v upřesnění a neodhaduje se podle běžné obchodní velikosti.

Současná sbírka neuvádí spolehlivý počet porcí, proto se v rozhraní násobí původní dávka.

Přepočet surovin nemění časy, teploty ani číselné údaje uvnitř textu postupu a režim vaření na tuto hranici u změněné dávky upozorňuje.

Krok odpovídající celé volitelné skupině obsahuje za nadpisem komentář `<!-- recipe-group: Název skupiny -->`, aby režim vaření připomněl vynechanou přílohu.

## Obsahová revize

Množství již uvedené v postupu lze přenést do tabulky, aby nákup neztratil surovinu potřebnou při vaření.

Rozporné údaje se zachovají s viditelnou poznámkou pro čtenáře, dokud je nepotvrdí správce obsahu.

Věcné změny receptu vyžadují kontrolu člověkem znalým receptu podle [testovací strategie](../quality/testing.md#trvalá-obsahová-kontrola).

| Otevřená obsahová otázka | Místo | Vlastník a podmínka uzavření |
|---|---|---|
| Není jasné, zda 1 cibule a 150 g bílé cibule představují dvě různé dávky | [Kokosové kuře](../../food/asia/general/main-dishes/kokosove-kure.md) | Správce obsahu potvrdí správné množství a sjednotí tabulku |
| Chybí parametry tlakového hrnce, množství vody a potvrzení uvedených 5 hodin | [Hovězí vývar](../../food/europe/czech/soups/hovezi-vyvar.md) | Správce obsahu ověří postup pro konkrétní zařízení a opraví čas i objem |
| Řada receptů neuvádí množství hlavních potravin nebo velikost dávky | Řádky s `neuvedeno` v příslušném receptu | Správce obsahu doplní údaje při skutečné přípravě; do té doby zůstává nejistota viditelná |

Generátor zdrojové recepty neformátuje ani nepřepisuje; chybný vstup odmítne před zápisem odvozených souborů.
