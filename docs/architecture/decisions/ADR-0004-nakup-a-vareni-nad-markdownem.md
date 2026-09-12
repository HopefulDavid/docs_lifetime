---
canonical_for: decision-0004-shopping-and-cooking
status: accepted
date: 2026-09-12
last_verified: 2026-09-12
owner: architecture
supersedes: null
superseded_by: null
---

# ADR-0004: Nákup a vaření nad jednotným Markdownem

## Kontext

Uživatel dne 2026-09-12 výslovně rozšířil původní čtecí kuchařku o výběr více jídel, společný nákup a podporu při vaření.

Nový rozsah vlastní [produktové požadavky](../../product/requirements.md), autorský kontrakt vlastní [formát receptu](../../product/recipe-format.md).

Audit všech 27 obsahových položek prokázal nejednotné názvy a množství, pomůcky mezi potravinami a rozdílné zápisy kroků.

## Kritéria a varianty

| Varianta | Přínos | Nevýhoda a vratnost |
|---|---|---|
| Klientské rozšíření stávajícího DocFX a strukturovaný Markdown | Zachová hosting, URL, veřejný obsah i běh bez serveru | Vyžaduje malý vlastní parser tabulek a doménový modul; rozšíření lze odebrat a recepty zůstanou čitelné |
| Nová aplikace s databází a účty | Umožní synchronizaci a bohatší uživatelská data | Mění platformu, provoz a vlastnictví dat nad rámec zadání; návrat vyžaduje migraci |
| Pouhé odškrtávání volného textu v prohlížeči | Malý první zásah | Neřeší součet, jednotky, alternativy ani konzistenci nákupů mezi více recepty |

## Výzkumné podklady

| Podklad | Vlastník, ověření a závěr | Omezení |
|---|---|---|
| [DocFX: Template](https://dotnet.github.io/docfx/docs/template.html) | DocFX, ověřeno 2026-09-12; veřejný vstup vlastní šablony umožňuje klientské rozšíření a vlastní assety | Kompatibilitu s připnutou verzí ověřuje skutečné sestavení |
| [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | MDN, ověřeno 2026-09-12; stav přežije relaci v rámci originu a úložiště může být odmítnuto | Nejde o synchronizaci ani zálohu, soukromý režim a vymazání prohlížeče mohou data odstranit |
| [W3C: Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | W3C, WCAG 2.2, ověřeno 2026-09-12; velikost a rozestupy ovládacích prvků podporují dotykové použití | Velké cíle samy nedokazují celkovou shodu s WCAG |
| Lokální pokus s rajskou a šunkofleky | Node testy a prohlížeč, 2026-09-12; součty, rozdílné jednotky, změna dávky a odškrtnutí jsou ověřitelné bez nové knihovny | Neověřuje kulinářskou správnost obsahu |

## Rozhodnutí

Použít klientské rozšíření existujícího statického webu s jediným obsahovým zdrojem v Markdownu.

Parser tabulek vzniká jako malá doménová hranice stávajícího generátoru, nikoli jako obecný Markdown parser nebo aplikační framework.

Text vaření se přebírá z HTML vytvořeného DocFX, takže nevzniká druhý renderer postupu.

Názvy a nákupní oddělení mají vlastní malý slovník, množství a poznámky zůstávají výhradně v receptu.

Čisté výpočty a validace lokálního stavu používají standardní JavaScript, zatímco DOM, úložiště a export mají samostatnou klientskou hranici.

Nejsou zavedené nové runtime ani npm závislosti, protože nativní ovládací prvky, dialog, úložiště a textový export potřebný rozsah pokrývají.

## Důsledky a kompatibilita

Statický obsah zůstává čitelný bez JavaScriptu a při selhání klientského katalogu.

Výběr, vlastní množství, odškrtnutí a postup vaření jsou místní data konkrétního prohlížeče pod verzovaným klíčem odděleným podle cesty webu.

Suroviny se slučují pouze při shodě kanonického názvu a slučitelné jednotky, neznámé množství zůstává vedle číselného údaje samostatně.

Odškrtnutí a vlastní množství platí pouze pro nezměněný seznam zdrojů včetně dávky a poznámek, takže změna požadavku obnoví nutnost kontroly.

Všechny dosavadní cesty receptů zůstávají zachované a nový generovaný katalog vstupuje do stejného artefaktu jako HTML.

## Rizika a ověření

| Riziko | Opatření | Důkaz |
|---|---|---|
| Nesprávný nákup z neúplného receptu | Přiznané `neuvedeno`, vlastní místní množství, žádný odhad porcí a balení | Doménové testy, autorská revize a viditelný nákup |
| Nedostupné nebo poškozené úložiště | Validace, náhradní stav, čitelná informace a textový export | Test obnovy a kontrola klientské chybové větve |
| Ztráta obsahu při generování | Validace celého katalogu před jakýmkoli zápisem | Negativní integrační test |
| Mobilní nečitelnost | Nativní ovládací prvky, velké dotykové plochy, jednosloupcové suroviny a dialog vaření | Vizuální scénáře v reálném prohlížeči |
| Různá poslední úprava ve více oknech | Uživatel používá jeden nákup v jednom okně; cloudová synchronizace není součástí řešení | Provozní omezení |

Rozhodnutí se přezkoumá při požadavku na účty, synchronizaci, plný offline web, více souběžných nákupů nebo složitější obsahový formát.
