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

Zemi původu určuje cesta receptu a `data/taxonomy.json`.

Volitelné pole `flag` země označuje ikonu v připnuté sadě Circle Flags podle [ADR-0008](../architecture/decisions/ADR-0008-lokalni-svg-ikony.md).

Emoji v původním názvu není zdrojem vlajky ani ovládací ikony.

Používá jeden hlavní nadpis, krátký věcný popis, případné [`## Video postup`](#video-postup), sekci `## Ingredience`, případné `## Pomůcky` a `## Než začnete`, potom `## Postup` s nadpisy `### 1. Název kroku` pokračujícími bez mezer v číslování.

Úvod popisuje skutečné jídlo a jeho hlavní složky.

Neopakuje obecné pochvaly a neodvozuje dobu přípravy ani počet porcí.

Postup používá rozkazovací způsob v množném čísle, například „Nakrájejte“, „Promíchejte“ a „Podávejte“.

Každý bod popisuje srozumitelnou činnost, související tip či upozornění zůstává u příslušného kroku.

Dlouhé marinování, chlazení nebo uležení patří také do sekce „Než začnete“, aby čtenář zjistil čekání před zahájením vaření.

První odstavec této sekce je krátká samostatně srozumitelná věta, kterou generátor převezme do katalogové karty jako přípravu předem.

Každý očíslovaný krok patří přímo do `## Postup` a obsahuje vlastní činnost.

Prázdný krok nebo další hlavní nadpis generátor odmítne.

Obecné životní návody mimo receptové oblasti tento formát nepřebírají.

Jejich zařazení vlastní [hranice veřejného obsahu](../architecture/overview.md#obecné-návody-a-další-oblasti).

## Video postup

Sekce je volitelná a slouží pouze pro vlastní lokální kopii videa uloženou v `media/`.

Obsahuje jedinou položku:

```markdown
- Soubor: [Název videa](../../../../media/videos/video.mp4)
```

Externí video služby ani další položky se v receptu nepoužívají.

## Suroviny

Každá potravina má vlastní řádek tabulky se sloupci `Surovina`, `Množství` a `Upřesnění`.

Názvy surovin a jejich nákupní oddělení vlastní [`data/ingredients.json`](../../data/ingredients.json).

Stejná surovina používá stejný název ve všech receptech, ale neslučují se odlišné produkty, například smetana na vaření a smetana ke šlehání nebo celý a mletý pepř.

Značka, velikost balení, úprava a účel patří do upřesnění.

Prázdné upřesnění se zapisuje jako `—`.

```markdown
## Ingredience

Množství platí pro jednu původní dávku.

Počet porcí není uveden.

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

Čtenář z alternativ vybírá jednu.

Seznam nepřikazuje koupit všechny.

Samostatná volitelná surovina používá upřesnění `volitelné`, celá volitelná skupina nadpis zakončený `(volitelné)`.

Další upřesnění odděl čárkou, například `volitelné, kostky ledu`.

Parser přijímá i starší oddělení středníkem kvůli kompatibilitě.

Názvy skupin musí zůstat jedinečné i po odstranění diakritiky a sjednocení velikosti písmen, protože z nich vznikají identifikátory uložených voleb.

Pomůcky nejsou potraviny a patří mimo tabulky ingrediencí.

Pitná voda a led zůstávají dohledatelné v oddělení „Doma připravit“.

Hotový vývar a suroviny na jeho domácí výrobu se nesmějí automaticky započítat současně.

## Množství a nejistota

Přesné množství lze zapsat číslem a jednotkou, například `500 g`, `0,5 lžičky` nebo `2,5–3 l`.

Mezi číslem a jednotkou je mezera, desetinná čísla používají čárku a rozmezí pomlčku, například `1–2 ks`.

Jednotka musí odpovídat způsobu odměření suroviny.

| Typ údaje | Vhodný zápis | Upřesnění |
|---|---|---|
| Hmotnost | `500 g`, `1 kg` | Maso, mouka nebo surovina odvážená autorem |
| Objem | `100 ml`, `1,5–2 l` | Voda, mléko nebo jiná surovina odměřená objemově |
| Počet kusů | `2 ks` | Zelenina, vejce nebo celé koření, tvar koření patří do upřesnění |
| Kuchařská míra | `1 lžíce`, `0,5 lžičky`, `2 stroužky`, `1 hrst`, `1–2 snítky`, `1 svazek` | Zachovat skutečnou autorskou míru bez odhadu gramů |
| Obal nebo porce | `1 balení`, `2 sáčky`, `1 kelímek`, `1 porce` | Uvést známou hmotnost či objem v upřesnění, jinak výslovně přiznat chybějící velikost |

Podporované převody vlastní [`kitchen-core.mjs`](../../templates/life/public/kitchen-core.mjs).

Převádí pouze kg na g a l na ml, nikdy lžíce na gramy ani kusy na hmotnost.

Počty balení, sáčků, snítek, svazků a porcí se násobí dávkou, aniž by tím byla určená jejich hmotnost.

Autor uvede ověřené množství každé suroviny přímo ve zdrojovém receptu.

Pokud správce požaduje doplnění podle jiného receptu, doporučenou dávku označ a připoj odkaz na konkrétní zdroj do samostatné sekce `## Zdroje množství` mezi ingrediencemi a postupem.

Samostatná sekce zachová zdroje viditelné také při nahrazení původní tabulky interaktivním seznamem.

Převzatý doplněk se nesmí vydávat za původní autorské množství a tabulka i postup musejí uvádět stejnou hodnotu.

`neuvedeno` označuje chybějící autorský údaj, zatímco `dle chuti` znamená skutečné dochucování podle receptu.

Pokud množství není známé, zapiš do celého pole Množství přesně `neuvedeno`, nikoli prázdnou buňku, nulu, otazník nebo náhradní `dle chuti`.

Chybějící údaj se opravuje v receptu, nikoli vlastním nastavením v nákupním rozhraní.

Chybějící hmotnost balení nebo objem hrnku se uvádí v upřesnění a neodhaduje se podle běžné obchodní velikosti.

Současná sbírka neuvádí spolehlivý počet porcí, proto se v rozhraní násobí původní dávka.

Přepočet surovin nemění časy, teploty ani číselné údaje uvnitř textu postupu a režim vaření na tuto hranici u změněné dávky upozorňuje.

Krok odpovídající celé volitelné skupině obsahuje za nadpisem komentář `<!-- recipe-group: Název skupiny -->`, aby režim vaření připomněl vynechanou přílohu.

## Přidání nového receptu

1. Vytvoř jeden ruční Markdown soubor v `food/<oblast>/<země>/<typ>/<nazev>.md` nebo `drink/<oblast>/<země>/<typ>/<nazev>.md`, jídlo bez konkrétního původu používá `food/universal/<typ>/<nazev>.md`.
2. Segmenty cesty piš malými písmeny bez diakritiky, slova odděluj pomlčkou a nepoužívej název `index.md`, který je vyhrazený odvozeným přehledům.
3. Oblast, zemi a typ vyber z [`data/taxonomy.json`](../../data/taxonomy.json), novou skutečnou kategorii doplň jednou sem včetně českého názvu a u země její oblasti.
4. Napiš název, popis, suroviny a postup podle [struktury](#struktura), množství, časy, přípravu předem, pomůcky a alternativy musí dodat autor podle skutečného receptu.
5. Použij názvy ze [slovníku surovin](../../data/ingredients.json), novou surovinu doplň právě jednou do správného oddělení, existující název do dalšího oddělení nekopíruj.
6. Spusť vývojový náhled nebo sestavení podle [projektových příkazů](../development/commands.md#spuštění), zkontroluj recept v katalogu, nákupu a režimu vaření a proveď úplnou kontrolu před commitem.
7. Commituj zdrojový recept, případnou změnu slovníku a související ruční dokumentaci podle [workflow](../development/workflow.md), výstupní adresáře se necommitují.

Pořadí oblastí a typů odpovídá pořadí klíčů v taxonomii, země a recepty se řadí podle českého názvu.

Nová země nebo typ nevyžaduje ruční založení přehledu ani úpravu navigace, konfigurace DocFX, klientského JSON nebo testovacích dat.

Přesný rozsah automaticky odvozovaných údajů a umístění výstupů vlastní [architektura dat](../architecture/overview.md#odvozená-data-a-rozsah-automatizace).

Při úpravě receptu měň stejný zdrojový soubor.

Odstranění posledního receptu automaticky odstraní také nepotřebný přehled a navigační položku při příštím generování a jeho HTML při čistém sestavení.

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

Při revizi porovnej všechny výslovné počty a jednotky v ingrediencích s postupem.

Orientační doporučení k dochucení lze převzít do tabulky pouze s označením, že se upravuje podle chuti.

Pokud se stejná surovina používá ve více krocích, tabulka uvádí celkové množství a postup vysvětlí jeho rozdělení bez dvojího započítání.

Potvrzená novější oprava autora má přednost před zastaralým údajem a musí se promítnout do tabulky i postupu.

Rozporné údaje se zachovají s viditelnou poznámkou pro čtenáře, dokud je nepotvrdí správce obsahu.

Věcné změny receptu vyžadují kontrolu člověkem znalým receptu podle [testovací strategie](../quality/testing.md#trvalá-obsahová-kontrola).

| Otevřená obsahová otázka | Místo | Vlastník a podmínka uzavření |
|---|---|---|
| Chybí parametry tlakového hrnce a potvrzení uvedených 5 hodin | [Hovězí vývar](../../food/europe/czech/soups/hovezi-vyvar.md) | Správce obsahu ověří dobu a režim pro konkrétní zařízení, množství vody již doplnil |
| Doporučené dávky nápojů potřebují ověření při vlastní přípravě | Zdrojové poznámky u French Pressu, vietnamské kávy a Pumpkin Spice | Správce obsahu případně upraví doložené výchozí dávky podle své přípravy |
| U části balení, hrnků, kusů a porcí chybí velikost | Upřesnění příslušných ingrediencí | Správce obsahu doplní skutečnou hmotnost nebo objem, nelze je odvodit z běžného obchodního balení |

Generátor zdrojové recepty neformátuje ani nepřepisuje.

Chybný vstup odmítne před zápisem odvozených souborů.

## Automatická kontrola obsahu

Kontrola receptů platí pouze pro `food/` a `drink/`, které tvoří podsekce Kuchyně.

Obecné návody ani budoucí negastronomické oblasti nepřebírají tabulky surovin a číslované vaření.

Slovník vyžaduje neprázdná a jednoznačná oddělení i názvy, odmítá duplicity také po sjednocení velikosti písmen a diakritiky a nedovoluje formátovací nebo řídicí znaky v názvech.

Každý název i každá alternativa v tabulce musí přesně odpovídat slovníku.

Diagnostika uvede soubor, řádek a opravu názvu nebo nutnost doplnění suroviny do oddělení.

Tabulka má přesnou hlavičku, oddělovací řádek a všechny tři buňky každé suroviny mezi krajními svislítky.

Volně připsaný seznam, opakované suroviny nebo neúplný řádek se nesmějí tiše vynechat.

Každá pojmenovaná skupina surovin, včetně volitelné přílohy, musí obsahovat vlastní neprázdnou tabulku.

Vysvětlující poznámku za tabulkou zapiš jako citaci `>`, případně ji vlož přímo do sloupce Upřesnění.

Každý řádek s přesnou hodnotou `neuvedeno`, včetně volitelné suroviny, vytváří neblokující upozornění `RECIPE_QUANTITY_MISSING` s původem a řádkem.

Upozornění žádá ověřené doplnění zdrojového množství.

`dle chuti` se za chybějící množství nepovažuje a čísla se neodhadují.

Souhrnné diagnostiky jsou obnovitelným výstupem `_generated/content-report.json`.

Přesné spuštění bez zápisu vlastní [příkazy](../development/commands.md#statické-kontroly).

Validátor nepozná surovinu, kterou autor vůbec nezapsal, ani nezaručí kulinářskou správnost oddělení, množství a postupu.

Tuto hranici nadále vlastní [obsahová revize](#obsahová-revize).
