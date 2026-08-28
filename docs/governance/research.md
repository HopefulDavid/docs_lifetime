---
canonical_for: technical-research-policy
status: accepted
last_verified: 2026-08-28
owner: architecture
---

# Výzkumný standard pro technická rozhodnutí

## Účel

Významné rozhodnutí nesmí vzniknout z jediného článku, momentálního trendu ani nekritického převzetí současného projektu.

Výzkum má určit dlouhodobě vhodný směr v konkrétním kontextu, nikoli najít zdroj potvrzující předem zvolený názor.

Rozsah výzkumu musí odpovídat dopadu, vratnosti a nejistotě rozhodnutí.

## Třídy důkazů

Používej kombinaci následujících tříd zdrojů.

| Třída | Co potvrzuje | Typické příklady |
|---|---|---|
| Projektové důkazy | Skutečný dnešní stav a lokální omezení | Kód, historie Gitu, testy, konfigurace, runtime pozorování, incidenty |
| Primární normativní zdroje | Podporované a zamýšlené použití technologie | Oficiální dokumentace, standard, RFC, specifikace, dokumentace výrobce |
| Produkční důkazy | Chování a provozní důsledky v reálném měřítku | Oficiální případová studie, veřejná architektura z produkce, postmortem |
| Nezávislá analýza | Alternativy, trade-offy a slepá místa | Odborná publikace, recenzovaný článek, uznávaný architektonický zdroj |
| Lokální experiment | Ověření nejistoty v podmínkách projektu | Minimální prototyp, benchmark, migrační zkouška, test kompatibility |

Projektový důkaz potvrzuje skutečnost, ale sám neurčuje správný cílový záměr.

Oficiální dokumentace potvrzuje podporované použití, ale nemusí sama dokázat provozní vhodnost.

Případová studie ukazuje možnost, ale nemusí být přenositelná na jiný kontext.

Experiment má být reprodukovatelný a nesmí být navržený tak, aby zvýhodnil jedinou variantu.

## Minimální síla výzkumu

| Typ rozhodnutí | Minimální podklad |
|---|---|
| Rutinní a vratný detail v přijaté architektuře | Jeden aktuální primární zdroj nebo jasná lokální konvence |
| Významná knihovna, integrační vzor nebo hranice modulu | Nejméně tři nezávislé zdroje alespoň ze dvou tříd |
| Technologie, architektura, datový model, veřejné API nebo platforma | Nejméně tři nezávislé zdroje, z nichž jeden je primární a jeden produkční nebo experimentální |
| Bezpečnost, soukromí, kompatibilita, migrace dat nebo regulatorní dopad | Aktuální primární zdroje, projektové důkazy a cílené ověření rizik |
| Rozhodnutí s vysokou cenou návratu | Srovnání reálných variant, prototyp nebo migrační zkouška a uživatelské rozhodnutí |

Počet zdrojů není náhradou jejich kvality nebo nezávislosti.

Tři články přepisující stejnou tiskovou zprávu představují jeden původní důkaz.

Výjimku z minima lze přijmout jen tehdy, když další nezávislý zdroj objektivně neexistuje, a tato nejistota se musí uvést mezi riziky.

## Postup výzkumu

1. Formuluj rozhodovací otázku bez názvu preferované technologie.
2. Zapiš požadované výsledky, omezení, kvalitativní scénáře a nepřijatelné důsledky.
3. Ověř přesné verze, runtime, platformy, licence, podporované prostředí a aktuální stav projektu.
4. Prozkoumej alespoň dvě reálně použitelné varianty, pokud neexistuje jednoznačné omezení.
5. U každé varianty ověř podporovaný způsob použití, provozní důsledky, údržbu, bezpečnost, testovatelnost a možnost návratu.
6. Hledej důkazy proti předběžnému doporučení stejně aktivně jako důkazy pro něj.
7. Při rozporu zdrojů určuj rozdíl ve verzi, kontextu, měřítku nebo motivaci.
8. Nevyřešenou nejistotu ověř lokálním experimentem, pokud může změnit výsledek.
9. Zapiš podklady, datum ověření a odůvodnění do pracovního záznamu nebo ADR.
10. Předej uživateli pouze varianty, které po výzkumu zůstaly skutečně vhodné.

## Záznam důkazů

Pro každý podstatný podklad uveď:

- tvrzení, které zdroj podporuje nebo zpochybňuje,
- přesný zdroj a jeho autora nebo vlastníka,
- datum vydání a datum ověření, pokud jsou známé,
- verzi produktu, standardu nebo knihovny,
- kontext, ve kterém důkaz platí,
- omezení a možné střety zájmů,
- dopad na konkrétní rozhodovací kritérium.

Dlouhý výpis rešerše nepatří automaticky do trvalé dokumentace.

Do ADR se přenášejí zdroje a závěry nutné k pochopení přijatého rozhodnutí.

Pomocné poznámky se po dokončení úkolu odstraní spolu s pracovním záznamem.

## Hodnocení projektu

Při auditu existujícího projektu odděl:

- co je pozorované,
- co je výslovně zamýšlené,
- co vzniklo historickou náhodou,
- co je vynucené vnější kompatibilitou,
- co je dočasná migrace,
- co představuje dlouhodobé riziko.

Historické použití technologie je vstup do migračního plánu, nikoli automatické veto lepšího cílového řešení.

Současně se neprovádí plošný přepis bez důkazu, že jeho přínos převyšuje migrační riziko.

Dlouhodobé narovnání se provádí po ověřitelných krocích směrem k přijatému cílovému stavu.

## Kritéria kvality doporučení

Doporučení musí být konkrétní pro projekt.

Musí vysvětlit, proč doporučená varianta splňuje cíle lépe než ostatní vhodné varianty.

Musí uvést hlavní nevýhodu, migrační náklady, zbytková rizika a podmínky, za kterých by se rozhodnutí mělo přehodnotit.

Nesmí prezentovat módní popularitu jako technický důkaz.

Nesmí skrývat nejistotu za sebejistý jazyk.
