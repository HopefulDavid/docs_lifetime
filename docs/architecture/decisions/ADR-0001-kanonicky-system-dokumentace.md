---
canonical_for: decision-0001-documentation-system
status: accepted
date: 2026-08-28
last_verified: 2026-08-28
owners:
  - maintainers
supersedes: null
superseded_by: null
---

# ADR-0001: Kanonický systém dokumentace pro lidi a AI agenty

## Kontext

Projekt potřebuje dokumentaci použitelnou lidmi, Codexem, Claude Code, GitHub Copilotem, JetBrains AI Assistantem a dalšími agenty.

Systém musí zabránit kopírování pravidel mezi nástroji, udržet kontext dlouhých úkolů a umožnit bezpečný návrat po delší době.

Existující implementace nesmí být bez ověření považována za normativní architekturu.

Dokumentace musí růst bez vzniku jednoho obřího instrukčního souboru.

## Rozhodovací kritéria

- Jediný kanonický zdroj každé informace.
- Přenositelnost mezi hlavními AI agenty a vývojovými prostředími.
- Malý a spolehlivě načítaný vstupní kontext.
- Postupné odhalování detailů podle řešené oblasti.
- Bezpečné pokračování dlouhého úkolu po ztrátě kontextového okna.
- Čitelnost v Markdown náhledu a Quick Documentation nástrojů JetBrains.
- Podpora projektů různých technologií a velikostí.
- Oddělení pozorovaného stavu od cílového záměru.
- Dostatečně lehká údržba, aby dokumentace nezastarávala.

## Zvažované varianty

### Varianta A: Samostatný kompletní soubor pro každého agenta

Každý nástroj by dostal vlastní kopii všech pravidel.

Varianta byla odmítnuta kvůli okamžitému riziku rozcházení textů a nejasnému vlastnictví.

### Varianta B: Jeden rozsáhlý `AGENTS.md`

Veškeré projektové znalosti by byly uložené v jediném souboru.

Varianta byla odmítnuta kvůli vysokému šumu v kontextu, špatné škálovatelnosti a obtížnému vlastnictví jednotlivých oblastí.

### Varianta C: Malý společný vstup a propojené kanonické dokumenty

Kořenový `AGENTS.md` obsahuje pouze povinný pracovní protokol a navigaci.

Projektová fakta a pravidla vlastní tematické dokumenty v `docs/`.

Claude Code používá minimální `CLAUDE.md`, který importuje `AGENTS.md`.

Dlouhé úkoly používají jeden dočasný verzovaný pracovní záznam.

Významná rozhodnutí používají ADR se životním cyklem definovaným v tomto adresáři.

## Rozhodnutí

Přijímáme variantu C.

Kořenový [`../../../AGENTS.md`](../../../AGENTS.md) je jediný společný agentní vstup.

Soubor [`../../../CLAUDE.md`](../../../CLAUDE.md) obsahuje pouze import `@AGENTS.md`.

Adresář `docs/` je systém kanonických projektových znalostí s registrem v [`../../index.md`](../../index.md).

Architektonický přehled používá vybranou strukturu arc42 a hierarchické pohledy inspirované C4, ale nevytváří diagramy bez informační hodnoty.

Uživatelský obsah se podle potřeby třídí podle potřeb popsaných Diátaxis, aniž by se kopírovaly společné definice.

ADR používají lehkou strukturu odvozenou z MADR.

Dlouhý úkol používá právě jeden soubor `docs/work/WORK-*.md`, který spojuje plán, průběh, rozhodnutí, důkazy a předání.

Po dokončení se trvalé informace přesunou do kanonických dokumentů a pracovní soubor se odstraní.

Podrobná provozní pravidla zůstávají ve svých kanonických dokumentech a tento ADR vysvětluje pouze důvod zvolené struktury.

## Důsledky

AI agent musí na začátku úkolu načíst mapu dokumentace a pouze relevantní podrobnosti.

Nový nástroj dostane adaptér pouze tehdy, když neumí číst `AGENTS.md`, a adaptér smí obsahovat pouze import nebo odkaz.

Dokumentace se stává součástí definice dokončení každé významné změny.

Pracovní záznam je během úkolu verzovaný, takže jej může převzít jiný agent.

Odstranění pracovního záznamu po dokončení zachovává čistý aktivní stav, zatímco Git uchovává auditní stopu.

Navigační odkazy se mohou opakovat, ale pravidla a fakta nikoli.

Velké projekty mohou dokumenty rozdělit podle domén, pokud zůstane jednoznačné vlastnictví.

## Ověřovací mechanismy

- Kontrola, že `CLAUDE.md` neobsahuje nic kromě importu společných instrukcí.
- Kontrola, že mapa dokumentace neukazuje dvě kanonická místa pro stejnou oblast.
- Kontrola odkazů a požadovaných metadat v CI, pokud projekt CI používá.
- Kontrola existence nejvýše jednoho pracovního záznamu pro jeden úkol.
- Kontrola odstranění dokončeného pracovního záznamu před uzavřením změny.
- Architektonická kontrola rozporů mezi záměrem, skutečností a přechodovými stavy.

## Výzkumné podklady

Podklady byly ověřené dne 2026-08-28.

Oficiální dokumentace Codexu potvrzuje hierarchické načítání `AGENTS.md` a podporuje krátké instrukce s odkazy na podrobnosti.

Oficiální dokumentace Claude Code podporuje import souborů pomocí `@cesta`, což umožňuje importovat společný `AGENTS.md` bez kopie.

GitHub Copilot, Visual Studio Code a JetBrains AI Assistant podporují přenosné agentní instrukce v `AGENTS.md`.

OpenAI doporučuje pro dlouhé úkoly živý plán se stavem, objevy, rozhodnutími a ověřením.

Anthropic doporučuje pro dlouhé agentní běhy verzovaný postupový soubor, malé ověřitelné kroky a přesné předání dalšímu kontextovému oknu.

Produkční popis agentního vývoje v OpenAI doporučuje malý `AGENTS.md`, dokumentaci jako systém záznamu a postupné načítání znalostí.

arc42, C4, Diátaxis a MADR poskytují navzájem se doplňující struktury pro architekturu, čtenářské potřeby a rozhodovací historii.

### Primární zdroje

- [OpenAI: Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI: Using PLANS.md for multi-hour problem solving](https://developers.openai.com/cookbook/articles/codex_exec_plans)
- [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/)
- [Anthropic: How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [JetBrains: Agent instructions](https://www.jetbrains.com/help/ai-assistant/configure-agent-behavior.html)
- [GitHub Copilot: Adding repository custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
- [Visual Studio Code: Custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [arc42: Template overview](https://arc42.org/overview/)
- [C4 model](https://c4model.com/)
- [Diátaxis](https://diataxis.fr/)
- [MADR](https://adr.github.io/madr/)
- [Docs as Code](https://www.writethedocs.org/guide/docs-as-code/)
- [CommonMark: Paragraphs](https://spec.commonmark.org/current/#paragraphs)
- [CommonMark: Soft line breaks](https://spec.commonmark.org/current/#soft-line-breaks)
