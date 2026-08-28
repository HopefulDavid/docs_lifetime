---
canonical_for: documentation-map
status: accepted
last_verified: 2026-08-28
owner: maintainers
---

# Mapa kanonické dokumentace

Tento dokument je navigační registr.

Neopakuje obsah cílových dokumentů a každou oblast směruje na právě jeden kanonický zdroj.

| Oblast | Kanonický zdroj | Co zde hledat |
|---|---|---|
| Stručný účel projektu | [`../README.md`](../README.md) | Jednověté vysvětlení projektu a vstupní orientace |
| Produktový záměr a chování | [`product/requirements.md`](product/requirements.md) | Uživatelé, cíle, rozsah, scénáře a akceptační kritéria |
| Architektura | [`architecture/overview.md`](architecture/overview.md) | Aktuální stav, cílový stav, hranice, toky, nasazení a rizika |
| Přijatá architektonická rozhodnutí | [`architecture/decisions/README.md`](architecture/decisions/README.md) | Index neměnných ADR a jejich nahrazení |
| Přesné projektové příkazy | [`development/commands.md`](development/commands.md) | Sestavení, spuštění, kontroly, testy a lokální ověření |
| Práce s Gitem a změnami | [`development/workflow.md`](development/workflow.md) | Větev `develop`, commity, pořadí práce a bezpečnost změn |
| Standardy vlastního kódu | [`development/coding-standards.md`](development/coding-standards.md) | Dokumentační komentáře, čitelnost a návrhové zásady |
| Závislosti a vlastní infrastruktura | [`development/dependencies.md`](development/dependencies.md) | Výběr knihoven, uzamčení verzí a omezení pomocného kódu |
| Strategie testování | [`quality/testing.md`](quality/testing.md) | Vizuální scénáře, automatizované testy a důkazy |
| CI, vydávání a nasazení | [`delivery/ci-cd.md`](delivery/ci-cd.md) | Hosting, workflow, prostředí, release a reprodukovatelnost |
| Provoz a obnova | [`operations/runbook.md`](operations/runbook.md) | Pozorovatelnost, incidenty, zálohy, rollback a diagnostika |
| Správa dokumentace | [`governance/documentation.md`](governance/documentation.md) | Jeden zdroj pravdy, aktuálnost, konflikty a styl |
| Inicializace a audit projektu | [`governance/initialization.md`](governance/initialization.md) | Postup pro nový i existující projekt |
| Výzkumný standard | [`governance/research.md`](governance/research.md) | Požadovaná síla důkazů a ověřování významných voleb |
| Rozhodovací pravomoci | [`governance/decisions.md`](governance/decisions.md) | Co rozhoduje AI a co musí rozhodnout uživatel |
| Protokol dlouhých úkolů | [`work/README.md`](work/README.md) | Dočasný pracovní záznam a bezpečné předání |
| Vstupní instrukce agentů | [`../AGENTS.md`](../AGENTS.md) | Povinné pořadí načtení a dokončení práce |
| Adaptér Claude Code | [`../CLAUDE.md`](../CLAUDE.md) | Import kanonického `AGENTS.md` bez kopie pravidel |

## Rozšiřování struktury

Nový kanonický dokument vzniká pouze tehdy, když má samostatnou oblast vlastnictví a jeho obsah nelze přehledně udržet v existujícím zdroji.

Při rozdělení dokumentu se nejprve určí nové nepřekrývající se hranice a teprve poté se aktualizuje tato mapa.

Navigační stránky smějí obsahovat název, odkaz a účel cíle, ale nesmějí přebírat jeho pravidla ani fakta.

U uživatelské dokumentace lze podle potřeby přidat výukové materiály, postupy, referenci a vysvětlení, přičemž každý typ musí odkazovat na společné kanonické definice místo jejich kopírování.
