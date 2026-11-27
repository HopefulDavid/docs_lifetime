# Dokumentace ze života

Rodinný web s praktickými návody pro domácnost, zveřejněný na [hopefuldavid.github.io/docs_lifetime](https://hopefuldavid.github.io/docs_lifetime/). Zatím obsahuje hlavně recepty: z vybraných jídel sestaví společný nákupní seznam rozdělený podle oddělení obchodu a provede vařením krok za krokem, takže recept, nákup i postup jsou na jednom místě. Web používá rodina autora, obsah doplňuje správce repozitáře. Jde o osobní projekt v provozu, který se průběžně rozšiřuje o další recepty a oblasti.

Používání webu (výběr jídel, nákup, sdílení a vaření) popisuje [průvodce na webu](https://hopefuldavid.github.io/docs_lifetime/pruvodce.html). Tento soubor popisuje přidávání obsahu, sestavení a zveřejnění webu.

## Požadavky

| Program | Verze | K čemu |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | projekt verzi nepředepisuje, ověřeno s 2.55 | Historie, ze které vzniká stránka Změny |
| [Bun](https://bun.com/docs/installation) | 1.4.3 (`packageManager` v `package.json`) | Generátor stránek, testy a náhled |
| [.NET SDK](https://dotnet.microsoft.com/download/dotnet/10.0) | 10 | Spuštění generátoru webu [DocFX](https://dotnet.github.io/docfx/) 2.81.0, který se instaluje jako místní nástroj podle `.config/dotnet-tools.json` |

## Zprovoznění a náhled webu

Příkazy se spouštějí v PowerShellu. Kroky 1 a 2 stahují data z internetu.

1. Stažení repozitáře a přechod do jeho kořene:

   ```powershell
   git clone https://github.com/HopefulDavid/docs_lifetime.git
   Set-Location docs_lifetime
   ```

2. Instalace závislostí přesně podle `bun.lock` do složky `node_modules`:

   ```powershell
   bun ci
   ```

3. Obnovení místního nástroje DocFX:

   ```powershell
   dotnet tool restore
   ```

   Výsledek ověří `dotnet tool list`, který vypíše `docfx` ve verzi 2.81.0.

4. Spuštění náhledu:

   ```powershell
   bun run dev
   ```

   Po sestavení se v konzoli objeví `Náhled je aktuální: http://127.0.0.1:8765/` a web je dostupný na této adrese. Po uložení receptu, dat, médií nebo šablony se web sestaví znovu a stačí obnovit stránku. Náhled běží, dokud se neukončí klávesami Ctrl+C.

## Přidání receptu

Vzorem je například [zelnacka.md](food/europe/czech/soups/zelnacka.md). Chybu ve formátu receptu hlásí generátor se souborem a číslem řádku, u každého kroku je uvedené jeho hlášení.

1. Recept vznikne jako soubor `.md` v cestě `<food|drink>/<kontinent>/<země>/<typ>/<název>.md`, například `food/europe/czech/soups/zelnacka.md`. Kontinent, země a typ musí existovat v `data/taxonomy.json`, protože určují zařazení na webu. Název `index.md` je vyhrazený generovaným přehledům.
   Chybná cesta skončí hlášením `cesta neodpovídá očekávané struktuře nebo data/taxonomy.json`. Opraví ji přesun souboru do správné složky, nebo doplnění chybějícího klíče do `data/taxonomy.json`.
2. Soubor má jeden hlavní nadpis s názvem receptu a pod ním krátký popis.
3. Sekce `## Ingredience` obsahuje tabulku se sloupci `Surovina`, `Množství` a `Upřesnění`. Každá surovina musí mít přesný název z `data/ingredients.json`, kde patří právě do jednoho nákupního oddělení. Zaměnitelné suroviny se spojí slovem `nebo`, například `Voda nebo Vývar`.
   Neznámý název skončí hlášením `neznámá surovina '…' v data/ingredients.json`. Opraví ho přesný název ze slovníku, nebo nová surovina v odpovídajícím oddělení `data/ingredients.json`.
4. Sekce `## Postup` obsahuje kroky `### 1. Název kroku`, `### 2. …` s odrážkami pod každým krokem.
   Vynechané nebo opakované číslo skončí hlášením `postup musí obsahovat navazující očíslované kroky od 1`.
5. Volitelná sekce `## Před přípravou` uvádí, co je potřeba udělat předem. Volitelná sekce `## Video postup` obsahuje jedinou položku `- Soubor: [popis](../../../../media/videos/<název>.mp4)` s relativní cestou k vlastní kopii videa. Vedle videa leží úvodní snímek `<název>.jpg`, protože ho přehrávač načítá podle stejného názvu. Složka `media` přijímá jen soubory `.mp4` a `.jpg` do 4 MB, větší soubor skončí hlášením `soubor překračuje limit 4 MB`.
6. Text receptu je neutrální, bez oslovení: `Cibule se nakrájí najemno.`, ne `Cibuli nakrájejte najemno.`
   Oslovení zachytí test `recepty nepoužívají oslovení`, který vypíše soubor a řádek. Opraví ho přepis do neutrální podoby (`přidá se` místo `přidejte`).
7. Recept se zkontroluje v běžícím náhledu a příkazem `bun run validate`, který na konci vypíše `Web je ověřený.` s počtem stránek, receptů a médií.

## Přidání oblasti života

Kromě kuchyně může web nést další oblasti, například domácnost nebo zahradu. Oblast s návody vznikne ve dvou krocích:

1. Do `data/areas.json` se přidá záznam s `type` `guides`, například `{ "id": "household", "type": "guides", "path": "domacnost", "title": "Domácnost", "intro": "Běžné práce v domácnosti.", "icon": "home" }`. `id` a `path` obsahují jen malá písmena, číslice a pomlčky, `path` je začátek veřejné adresy a `icon` je klíč z `data/icons.json`. Cesty `food`, `drink`, `media`, `public` a `data` jsou vyhrazené, protože je ve výstupu už používají recepty, média, ikony a katalog.
2. Návody se uloží jako soubory `.md` do `guides/<id>`, například `guides/household/prani.md`. Každý začíná metadaty s `description` a hlavním nadpisem. Text je neutrální jako u receptů a kontroluje ho stejný test.

`bun run build` pak sestaví přehled oblasti, její navigaci, dlaždici na úvodní stránce i položku v horní liště. Oblast bez návodů se nezobrazí.

## Zveřejnění změn

Push do větve `main` po úspěšné kontrole web zveřejní a pošle e-mailové oznámení příjemcům nastaveným na GitHubu, proto se pushuje až hotová změna.

1. `bun run validate` skončí bez chyby.
2. Commit má českou zprávu podle Conventional Commits, například `feat(content): přidá recept na zelňačku`. Zpráva se objeví na veřejné stránce [Změny](https://hopefuldavid.github.io/docs_lifetime/changelog.html) a předpona (`feat`, `fix`, `docs` a další) určuje její kategorii.
3. Po pushi do `main` workflow `Dokumentace` v GitHub Actions web znovu ověří, sestaví a nahraje do větve `gh-pages`. Úspěšný běh je na kartě Actions zelený a web ukazuje novou verzi.

Chybnou změnu vrátí `git revert` a další push.

## Nastavení na GitHubu

Zveřejnění závisí na nastavení repozitáře na GitHubu, které v souborech repozitáře není.

| Nastavení | Hodnota | Účel |
| --- | --- | --- |
| Pages, zdroj | větev `gh-pages` | Workflow do ní při každém zveřejnění nahraje celý sestavený web |
| Secret `MAIL_USERNAME` | účet Gmail, ze kterého oznámení odchází | Odesílatel oznámení přes `smtp.gmail.com` |
| Secret `MAIL_PASSWORD` | heslo pro přihlášení k SMTP tohoto účtu | Přihlášení k odesílání |
| Secret `MAIL_RECIPIENTS` | adresy příjemců oddělené čárkou | Kdo oznámení dostane |

Secrets se upravují v nastavení repozitáře v části Secrets and variables, Actions. Selhání oznámení zveřejnění nezastaví.

## Data na zařízeních

Výběr jídel, nákup a průběh vaření si web ukládá jen v prohlížeči daného zařízení. Na jiné zařízení se přenesou odkazem ke sdílení nebo exportem nákupu podle [průvodce](https://hopefuldavid.github.io/docs_lifetime/pruvodce.html). Smazání dat prohlížeče je odstraní, jinou zálohu web nemá. Zveřejněný web vlastní data nemá, celý vzniká z repozitáře.

## Řešení potíží

| Hlášení | Příčina | Oprava | Ověření |
| --- | --- | --- | --- |
| `[warn] Code style issues found` | Kód nebo data nejsou naformátované | `bun run fix` | `bun run check` projde |
| Test `názvy testů jsou české` selže | Název testu ve vypsaném souboru a řádku je anglicky nebo bez diakritiky | Přepis názvu do češtiny s diakritikou v neutrálním stylu | `bun run test` projde |
| `dotnet docfx` nenajde nástroj | Místní nástroj DocFX není obnovený | `dotnet tool restore` | `dotnet tool list` vypíše `docfx` 2.81.0 |

## Vývoj

Generátor je v `scripts/`, šablona webu a kuchyňský klient v `templates/life/` a testy v `tests/`. Příkazy se spouštějí v kořeni repozitáře.

| Příkaz | Co dělá |
| --- | --- |
| `bun run validate` | Zkontroluje formát kódu, spustí testy a sestaví a ověří celý web stejně jako GitHub Actions, přepisuje `_generated` a `_site` |
| `bun run check` | Zkontroluje formát kódu a dat Prettierem (`check:format`), nic nepřepisuje |
| `bun run test` | Spustí testy generátoru, obsahu a kuchyňského klienta |
| `bun run build` | Připraví stránky do `_generated`, sestaví web do `_site` a ověří odkazy a velikost médií, přepisuje obě složky |
| `bun run dev` | Průběžně sestavuje web a zpřístupní ho na `http://127.0.0.1:8765`, běží do Ctrl+C |
| `bun run fix` | Přeformátuje kód a data (Markdown zůstává beze změny), přepisuje soubory |

Testy kuchyňského klienta neběží v prohlížeči. Po změně v `templates/life/` se proto v náhledu `bun run dev` zkontroluje nákupní seznam, vaření krok za krokem, sdílení a náhled tisku.
