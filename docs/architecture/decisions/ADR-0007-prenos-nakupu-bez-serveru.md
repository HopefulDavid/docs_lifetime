---
canonical_for: decision-0007-shopping-transfer
status: accepted
date: 2026-09-13
last_verified: 2026-09-13
owner: architecture
supersedes: null
superseded_by: null
---

# ADR-0007: Předání nákupu bez serverového úložiště

## Kontext a kritéria

Uživatel požaduje nahradit stažení TXT exportem a importem nákupu, aby si lidé v různých obchodech mohli předávat aktuální stav například přes SMS.

Výslovně zvolil nabídku sloučení i převzetí celého nákupu; závazné chování vlastní [požadavky](../../product/requirements.md#předání-nákupu).

Rozhodnutí doplňuje [ADR-0004](ADR-0004-nakup-a-vareni-nad-markdownem.md) o přenositelnou kopii místních dat a zachovává [PDF podle ADR-0005](ADR-0005-pdf-export-v-prohlizeci.md).

## Varianty

| Varianta | Přínos | Omezení a návrat |
|---|---|---|
| Soubor se stavem nákupu | Jednoduchá příloha, přenos i většího objemu dat | Samotná SMS nenese soubor a telefon vyžaduje práci se soubory |
| Kompaktní kód v odkazu a ruční vložení | Otevření ze zprávy rovnou nabídne náhled; zachová statický web a funguje také kopírováním | Délka roste s nákupem; odkaz nelze odvolat a není živou synchronizací |
| Krátký odkaz na serverový stav | Krátká zpráva a možnost živých změn | Vyžaduje nové úložiště, oprávnění, retenci a řešení souběhu nad rámec požadovaného předání |

## Rozhodnutí

Použít verzovaný přenosový formát odvozený z nákupního stavu, případně zkomprimovaný standardním gzip API, a přenášet jej ve fragmentu odkazu na stávající nákupní stránku.

Zobrazené kopírování funguje samostatně; Web Share pouze nabídne systémovou volbu příjemce při dostupnosti API a uživatelském kliknutí.

Modul `kitchen-transfer.mjs` je hranicí vnějších dat a nemění úložiště; uživatelské rozhraní nejprve zobrazí návrh a dovolí zápis až po výslovném potvrzení vyřešených konfliktů.

Přenos neobsahuje receptový obsah ani libovolné zdrojové podpisy; platnost odvozuje z odpovídající revize aktuálního katalogu.

Nová runtime knihovna, server ani univerzální synchronizační protokol nejsou potřeba pro tento omezený jednorázový přenos.

## Podklady

| Zdroj | Ověření 2026-09-13 a vliv na rozhodnutí | Omezení |
|---|---|---|
| [W3C Web Share](https://www.w3.org/TR/web-share/) | Standard nabízí sdílení odkazu po uživatelské aktivaci a dovoluje rušení i chybové stavy | Konkrétní SMS aplikaci či příjemce volí zařízení; kopírování zůstává nezávislé |
| [WHATWG Compression](https://compression.spec.whatwg.org/) | Podporuje gzip a odmítá porušený proud včetně nesprávného kontrolního součtu | Projekt navíc omezuje velikost po rozbalení a při chybějícím API nabídne vysvětlení |
| [RFC 3986, fragment](https://www.rfc-editor.org/rfc/rfc3986#section-3.5) | Fragment se zpracovává na klientovi a není součástí požadavku na získání zdroje | Zprávová aplikace nebo příjemce zná celý sdílený odkaz; nejde o šifrování |
| Projektové doménové testy a lokální prohlížeč | Přenos dávek, alternativ, množství a hotových; sloučení, nahrazení, vrácení, konflikty a odmítnutí nadměrného rozbalení prošly | Skutečné odeslání SMS není součástí testu |

## Migrace, rizika a další ověření

Současný místní formát a klíč úložiště se nemění; exportní kopie má vlastní verzi a staré TXT ani PDF nepředstírají importovatelný stav.

Jiná verze nebo chybějící recept odmítne celý import, aby staré údaje nepotvrdily nová množství; náprava je sjednocení verze webu a nový export.

Při sloučení nelze z absence odškrtnutí rozpoznat, zda jej někdo záměrně zrušil; pro přesnou kopii uživatel zvolí převzetí celého nákupu.

Rozměrné odkazy mohou překročit limity zprávových aplikací a vyžadovat chat; bez serverového úložiště nelze slíbit krátkou SMS pro libovolně velký nákup.

Nákup lze přečíst z odkazu a jeho držitel jej může předat dále; rozhraní tuto vlastnost oznamuje při exportu.

Vlastníkem formátu a jeho validace je engineering; konkrétní ověřené scénáře a limity prostředí vlastní [testování](../../quality/testing.md).

Rozhodnutí se přezkoumá při požadavku na živou synchronizaci, odvolání odkazu, účty nebo přenos nezávislý na existenci stejného katalogu.
