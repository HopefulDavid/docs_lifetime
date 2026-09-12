---
canonical_for: decision-0005-browser-pdf
status: accepted
date: 2026-09-12
last_verified: 2026-09-12
owner: architecture
supersedes: null
superseded_by: null
---

# ADR-0005: Přímý export PDF v prohlížeči

## Kontext

Uživatel výslovně požaduje zachovat generování PDF receptu a nákupu a připouští účelnou knihovnu.

Rozhodnutí doplňuje [ADR-0004](ADR-0004-nakup-a-vareni-nad-markdownem.md) o export a nahrazuje jeho předpoklad, že nativní prostředky pokrývají veškerý klientský rozsah.

Platforma, zdroj obsahu ani ukládání nákupu se nemění.

## Varianty a podklady

| Varianta | Přínos | Omezení |
|---|---|---|
| Nativní tisk | Bez nové knihovny, tisk aktuálního výběru | Uložení PDF závisí na tiskovém dialogu systému |
| pdfmake načítaný při exportu | Přímý soubor, čeština, seznamy a stránkování | Přibližně 1,91 MB nekomprimovaných assetů při prvním exportu |
| PDF vytvářené při sestavení DocFX | Předem připravený dokument | Nezachytí místní výběr jídel, vlastní množství ani odškrtnutí |

| Zdroj | Ověření 2026-09-12 | Vazba na rozhodnutí |
|---|---|---|
| [pdfmake: klientský vstup](https://pdfmake.github.io/docs/0.3/getting-started/client-side/) a [metody](https://pdfmake.github.io/docs/0.3/getting-started/client-side/methods/) | Oficiálně podporované dva lokální skripty a asynchronní vytvoření datového URL | Bez CDN a serverového odesílání obsahu |
| [MDN: print](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) | Standardní metoda otevírá tiskový dialog | Tisk zůstává samostatnou náhradní cestou |
| Lokální DocFX artefakt a prohlížeč | Původní metadata nabízela nevytvořený `toc.pdf`; nový náhled vytvoří PDF s aktuálními množstvími | Klientský export řeší skutečný místní výběr |
| npm manifest, lockfile a audit | Připnutá stabilní verze podporuje Node.js od 20, instalace hlásí nula známých zranitelností | Reprodukovatelnost a kompatibilita s projektem; audit není zárukou absence chyb |
| Metadata vloženého Roboto a [licence autorů](https://raw.githubusercontent.com/googlefonts/roboto-classic/main/OFL.txt) | Font uvádí SIL OFL 1.1; samotné pdfmake je MIT | Licenční texty jsou součástí publikovaných assetů |

## Rozhodnutí a hranice

Použít pdfmake pouze pro exportní náhled přes `kitchen-pdf.mjs`.

Verzi vlastní manifest a lockfile, DocFX kopíruje klientské soubory z nainstalovaného balíčku.

Knihovna i písmo se načtou až po otevření PDF náhledu ze stejného webu.

Jediný náhled definuje obsah tisku a PDF: vybrané suroviny, násobek dávky, přílohy, poznámky, pomůcky a zahrnuté kroky.

Nákupní export obsahuje celý seznam i při aktivním filtru, včetně odškrtnutí, vlastních údajů a původu množství.

Neexistující vestavěný odkaz na PDF nahradí konkrétní akce v receptu a nákupu.

Při selhání knihovny zůstává čitelný náhled, vysvětlení a nativní tisk.

## Důsledky a ověření

Export je textové PDF; externí doplňkové obrázky mimo postup zůstávají ve webovém receptu.

PDF uchovává původní časy a textová množství v postupu a u změněné dávky tuto hranici výslovně uvádí.

Soubor neobnovuje editovatelný stav aplikace a první načtení knihovny vyžaduje připojení.

[Testovací strategie](../../quality/testing.md) vlastní skutečné vizuální důkazy a omezení prostředí.

Knihovnu lze odstranit spolu s exportním modulem a DocFX resource záznamy; tisk a zbytek kuchařky zůstanou samostatně použitelné.
