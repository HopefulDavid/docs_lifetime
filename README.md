# Dokumentace ze života

Statický web s praktickými návody pro domácnost. Zatím obsahuje hlavně recepty se společným nákupním seznamem a vařením krok za krokem. Slouží rodině autora, běží na [hopefuldavid.github.io/docs_lifetime](https://hopefuldavid.github.io/docs_lifetime/) a průběžně se doplňuje.

## Požadavky

| Program | Verze | K čemu |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | libovolná aktuální | Historie, ze které vzniká stránka Změny |
| [Bun](https://bun.com/docs/installation) | 1.4.3 | Generátor stránek, testy a náhled |
| [.NET SDK](https://dotnet.microsoft.com/download) | 10 | Spuštění generátoru webu DocFX 2.78.5, který se instaluje jako místní nástroj |

## Zprovoznění

Příkazy se spouštějí v PowerShellu v kořeni repozitáře.

```powershell
git clone https://github.com/HopefulDavid/docs_lifetime.git
cd docs_lifetime
bun ci
dotnet tool restore
bun run dev
```

`bun run dev` sestaví web a zpřístupní ho na `http://127.0.0.1:8765`. Po uložení receptu, dat nebo šablony web sestaví znovu, stačí obnovit stránku. Běží, dokud se neukončí klávesami Ctrl+C.

## Nový recept

1. Recept vznikne jako soubor `.md` v cestě `<food|drink>/<kontinent>/<země>/<typ>/<název>.md`, například `food/europe/czech/soups/zelnacka.md`. Kontinent, země a typ musí existovat v `data/taxonomy.json`, protože určují zařazení na webu.
2. Soubor má jeden hlavní nadpis s názvem receptu a pod ním krátký popis.
3. Sekce `## Ingredience` obsahuje tabulku se sloupci `Surovina`, `Množství` a `Upřesnění`. Každá surovina musí mít přesný název z `data/ingredients.json`, kde patří právě do jednoho nákupního oddělení.
4. Sekce `## Postup` obsahuje kroky `### 1. Název kroku`, `### 2. …` s odrážkami pod každým krokem.
5. Volitelná sekce `## Před přípravou` uvádí, co je potřeba udělat předem, a `## Video postup` odkazuje na vlastní kopii videa v `media/videos`.
6. Text receptu je neutrální, bez oslovení: `Cibule se nakrájí najemno.`, ne `Cibuli nakrájejte najemno.`
7. `bun run validate` ověří formát, testy i sestavený web.

Vzorem je například [zelnacka.md](food/europe/czech/soups/zelnacka.md). Chybu ve formátu receptu hlásí generátor se souborem a číslem řádku.

## Nová oblast života

Kromě kuchyně může web nést další oblasti, například domácnost nebo zahradu. Oblast s návody vznikne ve dvou krocích:

1. Do `data/areas.json` se přidá záznam s `type` `guides`, například `{ "id": "household", "type": "guides", "path": "domacnost", "title": "Domácnost", "intro": "Běžné práce v domácnosti.", "icon": "home" }`. `path` je začátek veřejné adresy a `icon` je klíč z `data/icons.json`. Cesty `food`, `drink`, `media`, `public` a `data` jsou vyhrazené, protože je ve výstupu už používají recepty, média, ikony a katalog.
2. Návody se uloží jako soubory `.md` do `guides/<id>`, například `guides/household/prani.md`. Každý začíná metadaty s `description` a hlavním nadpisem.

`bun run build` pak sestaví přehled oblasti, její navigaci, dlaždici na úvodní stránce i položku v horní liště. Oblast bez návodů se nezobrazí.

## Kontrola a publikování

| Příkaz | Co dělá |
| --- | --- |
| `bun run validate` | Zkontroluje formát kódu, spustí testy a sestaví a ověří celý web stejně jako GitHub Actions |
| `bun run check` | Zkontroluje formát kódu a dat Prettierem (`check:format`), nic nepřepisuje |
| `bun run test` | Spustí testy generátoru, obsahu a kuchyňského klienta |
| `bun run build` | Připraví stránky do `_generated`, sestaví web do `_site` a ověří odkazy a velikost médií, přepisuje obě složky |
| `bun run dev` | Průběžně sestavuje web a zpřístupní ho na `http://127.0.0.1:8765`, běží do Ctrl+C |
| `bun run fix` | Přeformátuje kód a data (Markdown zůstává beze změny), přepisuje soubory |

Push do větve `main` po úspěšné kontrole web zveřejní. Chybnou změnu vrátí `git revert` a další push.

Zprávy commitů se objeví na veřejné stránce [Změny](https://hopefuldavid.github.io/docs_lifetime/changelog.html). Kategorii určuje předpona podle Conventional Commits, například `feat(content):` pro nový recept.

## Data v prohlížeči

Výběr jídel, nákup a průběh vaření si web ukládá jen v prohlížeči daného zařízení. Na jiné zařízení se přenesou odkazem ke sdílení nebo exportem nákupu, postup popisuje [průvodce](pruvodce.md).

## Řešení potíží

| Hlášení | Příčina | Oprava |
| --- | --- | --- |
| `neznámá surovina '…' v data/ingredients.json` | Název suroviny v receptu chybí ve slovníku nebo se liší | Přesný název ze slovníku, nebo nová surovina v odpovídajícím oddělení `data/ingredients.json` |
| `cesta neodpovídá očekávané struktuře nebo data/taxonomy.json` | Složka receptu neodpovídá kontinentu, zemi nebo typu ze slovníku | Přesun souboru do správné cesty, nebo doplnění `data/taxonomy.json` |
| `postup musí obsahovat navazující očíslované kroky od 1` | Číslování kroků `### N.` vynechává nebo opakuje číslo | Oprava číslování kroků |
| Test `recepty nepoužívají oslovení` selže | Recept nebo průvodce oslovuje čtenáře, například `přidejte` | Přepis vypsaného řádku do neutrální podoby (`přidá se`) |
| Test `názvy testů jsou české` selže | Název testu ve vypsaném souboru a řádku je anglicky nebo bez diakritiky | Přepis názvu do češtiny s diakritikou v neutrálním stylu, potom znovu `bun run validate` |
| `[warn] Code style issues found` | Kód není naformátovaný | `bun run fix`, potom znovu `bun run validate` |
| `docfx` nejde spustit | Místní nástroj DocFX není obnovený | `dotnet tool restore` |
