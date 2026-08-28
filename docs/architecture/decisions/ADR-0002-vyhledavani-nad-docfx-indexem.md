---
canonical_for: decision-0002-search-over-docfx-index
status: accepted
date: 2026-08-28
last_verified: 2026-08-28
owners:
  - engineering
supersedes: null
superseded_by: null
---

# ADR-0002: Vyhledávání nad indexem DocFX

## Kontext

Produkt vyžaduje pomocné hledání libovolného českého nebo anglického termínu obsaženého v indexu podle [`REQ-005`](../../product/requirements.md#kanonické-scénáře-chování) a současně zachovává statickou architekturu popsanou v [`../overview.md`](../overview.md).

Vestavěný worker DocFX používal anglickou pipeline Lunr, nenašel název `Rajská omáčka` a jeho seznam jazykových modulů ve verzi 2.78.5 češtinu neobsahoval.

Stejný upgrade DocFX navíc v dřívějším experimentu způsobil klientskou chybu vestavěného hledání, takže projekt potřeboval stabilní integrační hranici nezávislou na interní pipeline Lunr.

## Rozhodovací kritéria

- Libovolný český nebo anglický termín obsažený v názvu či indexovaném obsahu je dohledatelný bez závislosti na pevném seznamu slov.
- Velikost písmen a diakritika nemění shodu stejného normalizovaného termínu.
- Hledání zůstane čistě klientské nad statickým artefaktem bez databáze a aplikačního serveru.
- Řešení nepřidá runtime službu ani knihovnu neúměrnou současnému katalogu.
- Upgrade DocFX zachová veřejné URL, výsledkový panel a stávající uživatelský tok.
- Chování bude chráněné rychlým automatickým testem a skutečným smoke scénářem v prohlížeči.

## Výzkumné podklady

| Tvrzení nebo kritérium | Zdroj a verze | Datum ověření | Co podklad ukazuje | Omezení |
|---|---|---|---|---|
| Aktuální stabilní DocFX | [Oficiální vydání DocFX 2.78.5](https://github.com/dotnet/docfx/releases/tag/v2.78.5) a [NuGet balíček](https://www.nuget.org/packages/docfx/2.78.5) | 2026-08-28 | Verze 2.78.5 je stabilní vydání podporující .NET 8 a vyšší | Vydání samo negarantuje kompatibilitu šablony projektu |
| Jazyková podpora hledání | [Worker moderní šablony DocFX 2.78.5](https://github.com/dotnet/docfx/blob/v2.78.5/templates/modern/src/search-worker.ts) a source map obnoveného balíčku | 2026-08-28 | Worker používá Lunr a mapu jazyků bez `cs` | Seznam se může v budoucí verzi DocFX změnit |
| Podporovaná integrační hranice | [Oficiální dokumentace vlastních šablon DocFX](https://dotnet.github.io/docfx/docs/template.html) | 2026-08-28 | Pozdější vlastní šablona může přepsat kolidující veřejný asset | Upgrade vyžaduje znovu ověřit kontrakt workeru |
| Normalizace textu | [ECMAScript `String.prototype.normalize`](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.normalize) | 2026-08-28 | Standardní runtime umí kanonický Unicode rozklad bez nové knihovny | Normalizace není stemming ani jazyková analýza |
| Velikost katalogu | Lokální `_site/index.json` vytvořený DocFX 2.78.5 | 2026-08-28 | Index obsahoval 51 položek s českými i anglickými termíny | Měření platí pro aktuální obsah |

## Zvažované varianty

### Varianta A: Odstranit fulltextové hledání

Varianta by odstranila chybnou klientskou cestu a zachovala pouze úplný katalog, ale nesplnila by přijatý scénář `REQ-005`.

### Varianta B: Použít vestavěnou jazykovou pipeline DocFX

Varianta by měla nejnižší vlastní údržbu, ale DocFX 2.78.5 nemá český modul a reprodukovanou závadu proto neřeší.

### Varianta C: Přidat obecnou vyhledávací knihovnu

Varianta by nabídla pokročilé skórování a případné stemmingové pluginy, ale přidala by distribuovanou závislost a větší provozní plochu pro malý statický katalog.

### Varianta D: Přepsat pouze worker nad indexem DocFX

Varianta zachová generování `index.json` i výsledkové rozhraní DocFX a nahradí pouze tokenizaci a řazení malým projektovým modulem.

## Rozhodnutí

Přijímáme variantu D a vlastní šablona přepisuje `public/search-worker.min.js` modulem nad nezměněným `index.json` DocFX.

Čisté vyhledávací funkce normalizují Unicode, odstraňují diakritická znaménka, vyžadují shodu všech slov a řadí přesnou shodu v názvu před shodou v obsahu.

Podporované chování zahrnuje normalizované přesné slovo a prefix od tří znaků v libovolném jazyce indexu, ale nezahrnuje skloňování, stemming, překlad ani synonymní analýzu.

České tokeny šablony a metadata `_lang` doplňují stejné rozhraní bez změny veřejných cest.

## Důsledky

### Pozitivní

- České i anglické dotazy používají stejný datově řízený mechanismus bez klientské závislosti na Lunr nebo pevném slovníku.
- Projekt může používat ověřený DocFX 2.78.5 a přebírat jeho novější opravy mimo nahrazený worker.
- Vlastní logika používá pouze standardní webové a Node.js API a sdílí stejný modul s automatickými testy.

### Negativní

- Engineering přebírá údržbu tokenizace, skórování a kompatibility workerového kontraktu DocFX.
- Lineární hledání je vhodné pro současný malý index, ale při výrazném růstu katalogu bude potřeba znovu změřit odezvu.
- Prefixové hledání záměrně neposkytuje morfologii ani toleranci překlepů.

### Rizika a opatření

| Riziko | Pravděpodobnost nebo dopad | Opatření | Ověření |
|---|---|---|---|
| DocFX změní zprávy mezi stránkou a workerem | Střední dopad při upgradu | Zachovat přepis na jediné integrační hranici a provést smoke po každém upgradu | `npm test`, build a hledání v prohlížeči |
| Dotaz vrátí nesouvisející položky | Nízká pravděpodobnost | Vyžadovat shodu všech slov a omezit prefix na nejméně tři znaky | Parametrizované testy pozitivní i nulové shody |
| Velký index zpomalí klienta | Nízká pravděpodobnost v aktuálním rozsahu | Připravit normalizovaná pole jednou při načtení a při růstu provést měření | Reálný smoke a případný benchmark před změnou technologie |
| Indexovaný veřejný text obsahuje nebezpečný řetězec | Nízký dopad navíc proti DocFX | Vrátit původní datový objekt a ponechat vykreslení existujícímu escapovanému rendereru DocFX | Kontrola integrační hranice při upgradu šablony |

## Migrace a kompatibilita

Migrace pouze aktualizuje připnutý DocFX, přidává veřejné assety vlastní šablony a nemění zdrojový obsah ani výsledné URL.

Návrat je možný odstraněním vlastního workeru a použitím vestavěného hledání až ve verzi DocFX, která prokáže stejné české i anglické scénáře.

## Ověření rozhodnutí

`npm test` ověřuje normalizaci, všechny termíny reprezentativních českých i anglických názvů, slova pouze z obsahu nebo cesty, nulový výsledek a hraniční prefixy.

`npm run docs:build` ověřuje, že vlastní assety vstoupí do statického artefaktu sestaveného bez varování.

Reprezentativní smoke ověřuje české i anglické názvy, termín pouze z cesty, nulový dotaz, české popisky a konzoli skutečného prohlížeče.

Při každém upgradu DocFX se porovná nativní podpora češtiny a vlastní worker se odstraní, pokud přestane přinášet jedinečnou hodnotu.

## Stav a nahrazení

Rozhodnutí je přijaté a dosud nebylo nahrazené.
