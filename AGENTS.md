# Instrukce pro AI agenty

Tento soubor je společným výchozím bodem pro AI agenty pracující v repozitáři.

Obsahuje pouze pořadí načtení a navigaci.

Kanonické projektové informace a pravidla vlastní dokumenty uvedené v [`docs/index.md`](docs/index.md).

## Povinný začátek každého úkolu

1. Ověř kořen repozitáře, stav pracovního stromu, aktuální větev, remotes a platné instrukční soubory.
2. Přečti [`docs/index.md`](docs/index.md).
3. Vyhledej soubory odpovídající `docs/work/WORK-*.md`.
4. Pokud existuje pracovní záznam pro stejný úkol, přečti jej celý.
5. Načti kanonické dokumenty všech oblastí, které může úkol ovlivnit.
6. Proveď nebo obnov projektový průzkum podle [`docs/governance/initialization.md`](docs/governance/initialization.md).
7. Připrav Git podle [`docs/development/workflow.md`](docs/development/workflow.md).
8. Použij podporované příkazy z [`docs/development/commands.md`](docs/development/commands.md).
9. Pokud jsou příkazy dosud neinicializované, ověř je ze strojových konfigurací postupem popsaným v dokumentu příkazů a inicializačním postupu.

## Kanonické pracovní protokoly

- Jeden zdroj pravdy, aktuálnost, konflikty a styl: [`docs/governance/documentation.md`](docs/governance/documentation.md)
- Rozhodovací pravomoci AI a uživatele: [`docs/governance/decisions.md`](docs/governance/decisions.md)
- Výzkum významných technických voleb: [`docs/governance/research.md`](docs/governance/research.md)
- Dlouhé úkoly a bezpečné předání: [`docs/work/README.md`](docs/work/README.md)
- Větev, změnový postup, commity a definice dokončení: [`docs/development/workflow.md`](docs/development/workflow.md)
- Standardy vlastního kódu a komentářů: [`docs/development/coding-standards.md`](docs/development/coding-standards.md)
- Knihovny, helpery a vlastní infrastruktura: [`docs/development/dependencies.md`](docs/development/dependencies.md)
- Testovací strategie a důkazy: [`docs/quality/testing.md`](docs/quality/testing.md)
- Hosting, CI, release a nasazení: [`docs/delivery/ci-cd.md`](docs/delivery/ci-cd.md)

## Povinné dokončení

1. Proveď definici dokončení z [`docs/development/workflow.md`](docs/development/workflow.md).
2. U složitého úkolu proveď přenos znalostí a odstranění pracovního záznamu podle [`docs/work/README.md`](docs/work/README.md).
3. Závěrečné shrnutí (`summary`) opři o skutečně provedená ověření, viditelně uveď zbývající rizika a formátuj je podle [kanonického stylu Markdownu](docs/governance/documentation.md#styl-markdownu).
