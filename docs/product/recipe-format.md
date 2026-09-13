---
canonical_for: recipe-content-format
status: accepted
last_verified: 2026-09-13
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

První odstavec této sekce je krátká samostatně srozumitelná věta, kterou generátor převezme do katalogové karty jako přípravu předem.

Každý očíslovaný krok patří přímo do `## Postup` a obsahuje vlastní činnost; prázdný krok nebo další hlavní nadpis generátor odmítne.

Obecné životní návody mimo receptové oblasti tento formát nepřebírají; jejich zařazení vlastní [hranice veřejného obsahu](../architecture/overview.md#obecné-návody-a-další-oblasti).

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

Názvy skupin musí zůstat jedinečné i po odstranění diakritiky a sjednocení velikosti písmen, protože z nich vznikají identifikátory uložených voleb.

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

## Přidání nového receptu

1. Vytvoř jeden ruční Markdown soubor v `food/<oblast>/<země>/<typ>/<nazev>.md` nebo `drink/<oblast>/<země>/<typ>/<nazev>.md`; jídlo bez konkrétního původu používá `food/universal/<typ>/<nazev>.md`.
2. Segmenty cesty piš malými písmeny bez diakritiky, slova odděluj pomlčkou a nepoužívej název `index.md`, který je vyhrazený odvozeným přehledům.
3. Oblast, zemi a typ vyber z [`data/taxonomy.json`](../../data/taxonomy.json); novou skutečnou kategorii doplň jednou sem včetně českého názvu a u země její oblasti.
4. Napiš název, popis, suroviny a postup podle [struktury](#struktura); množství, časy, přípravu předem, pomůcky a alternativy musí dodat autor podle skutečného receptu.
5. Použij názvy ze [slovníku surovin](../../data/ingredients.json); novou surovinu doplň právě jednou do správného oddělení, existující název do dalšího oddělení nekopíruj.
6. Spusť vývojový náhled nebo sestavení podle [projektových příkazů](../development/commands.md#spuštění), zkontroluj recept v katalogu, nákupu a režimu vaření a proveď úplnou kontrolu před commitem.
7. Commituj zdrojový recept, případnou změnu slovníku a související ruční dokumentaci podle [workflow](../development/workflow.md); výstupní adresáře se necommitují.

Pořadí oblastí a typů odpovídá pořadí klíčů v taxonomii, země a recepty se řadí podle českého názvu.

Nová země nebo typ nevyžaduje ruční založení přehledu ani úpravu navigace, konfigurace DocFX, klientského JSON nebo testovacích dat.

Přesný rozsah automaticky odvozovaných údajů a umístění výstupů vlastní [architektura dat](../architecture/overview.md#odvozená-data-a-rozsah-automatizace).

Při úpravě receptu měň stejný zdrojový soubor; odstranění posledního receptu automaticky odstraní také nepotřebný přehled a navigační položku při příštím generování a jeho HTML při čistém sestavení.

Přejmenování souboru změní veřejnou URL a identitu uloženého výběru, proto již publikované cesty měň pouze s promyšlenou [kompatibilitou a obnovou](../operations/runbook.md#rollback-a-bezpečné-pokračování).

### Nejmenší úplný autorský příklad

Následující ukázka demonstruje formát, nikoli nový recept určený k publikování.

```markdown
# Příprava cibule

Cibule připravená jako základ dalšího vaření.

## Ingredience

| Surovina | Množství | Upřesnění |
|---|---|---|
| Cibule | 2 ks | — |

## Postup

### 1. Krájení

- Cibuli oloupejte a nakrájejte nadrobno.
```

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

## Automatická kontrola obsahu

Kontrola receptů platí pouze pro `food/` a `drink/`, které tvoří podsekce Kuchyně; obecné návody ani budoucí negastronomické oblasti nepřebírají tabulky surovin a číslované vaření.

Slovník vyžaduje neprázdná a jednoznačná oddělení i názvy, odmítá duplicity také po sjednocení velikosti písmen a diakritiky a nedovoluje formátovací nebo řídicí znaky v názvech.

Každý název i každá alternativa v tabulce musí přesně odpovídat slovníku; diagnostika uvede soubor, řádek a opravu názvu nebo nutnost doplnění suroviny do oddělení.

Tabulka má přesnou hlavičku, oddělovací řádek a všechny tři buňky každé suroviny mezi krajními svislítky; volně připsaný seznam, opakované suroviny nebo neúplný řádek se nesmějí tiše vynechat.

Každá pojmenovaná skupina surovin, včetně volitelné přílohy, musí obsahovat vlastní neprázdnou tabulku.

Vysvětlující poznámku za tabulkou zapiš jako citaci `>`, případně ji vlož přímo do sloupce Upřesnění.

Každý řádek s přesnou hodnotou `neuvedeno`, včetně volitelné suroviny, vytváří neblokující upozornění `RECIPE_QUANTITY_MISSING` s původem a řádkem.

Upozornění žádá ověřené doplnění zdrojového množství; `dle chuti` se za chybějící množství nepovažuje a čísla se neodhadují.

Souhrnné diagnostiky jsou obnovitelným výstupem `_generated/content-report.json`; přesné spuštění bez zápisu vlastní [příkazy](../development/commands.md#statické-kontroly).

Validátor nepozná surovinu, kterou autor vůbec nezapsal, ani nezaručí kulinářskou správnost oddělení, množství a postupu; tuto hranici nadále vlastní [obsahová revize](#obsahová-revize).
