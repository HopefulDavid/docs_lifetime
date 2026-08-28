---
canonical_for: coding-standards
status: accepted
last_verified: 2026-08-28
owner: engineering
---

# Standardy vlastního kódu

## Rozsah

Tato pravidla platí pro kód vytvořený a spravovaný projektem.

Nevztahují se na třetí strany, vendored obsah, generované soubory ani knihovny, které projekt nevlastní.

Změny generovaného výstupu se provádějí v jeho zdroji nebo generátoru.

Projekt nejprve respektuje přijatou architekturu, idiomy jazyka a zavedené formátovací nástroje.

Lokální konvence se zachovává pouze tehdy, když není v rozporu s cílovým stavem nebo těmito pravidly.

## Veřejné prvky a dokumentační komentáře

Každý veřejný prvek vytvořený nebo významově změněný projektem musí mít dokumentační komentář ve standardním formátu daného jazyka.

Pravidlo zahrnuje zejména veřejné třídy, struktury, rozhraní, delegáty, metody, konstruktory, vlastnosti, pole, události, konstanty, moduly, funkce a veřejně exportované proměnné.

V C# používej XML dokumentaci s prvkem `<summary>`.

V jiném jazyce použij jeho kanonický ekvivalent, například Javadoc, docstring, TSDoc nebo Rust doc comment.

Komentář stručně popisuje účel a veřejný kontrakt prvku.

Popisuje především proč prvek existuje a co poskytuje volajícímu.

Neopisuje aktuální algoritmus, pořadí soukromých kroků ani dočasnou implementaci.

Má zůstat pravdivý po interním refaktoringu.

Jedna stručná věta obvykle stačí.

Pokud `<summary>` výjimečně obsahuje více vět, každou větu vlož do vlastního prvku `<para>`.

Pouhý prázdný řádek mezi řádky `///` není spolehlivý odstavec, protože XML documentation renderery mohou whitespace sloučit.

```csharp
/// <summary>
/// Poskytuje ověřený přístup k objednávkám aktuálního zákazníka.
/// </summary>
public interface IOrderRepository
{
    /// <summary>
    /// Načte objednávku dostupnou v rámci zadaného zákaznického kontextu.
    /// </summary>
    Task<Order?> GetAsync(OrderId id, CustomerContext context, CancellationToken cancellationToken);
}
```

Více vět v jednom `<summary>` zapisuj explicitně takto:

```csharp
/// <summary>
/// <para>Načte objednávku v zadaném zákaznickém kontextu.</para>
/// <para>Vrátí pouze data, ke kterým má tento kontext přístup.</para>
/// </summary>
Task<Order?> GetAsync(OrderId id, CustomerContext context, CancellationToken cancellationToken);
```

Použij `<param>`, `<returns>`, `<exception>`, typové parametry nebo příklad pouze tehdy, když doplňují smlouvu, omezení nebo neobvyklé chování.

Neopakuj v nich pouze název parametru nebo typ návratové hodnoty.

Použij `<inheritdoc/>` jen tehdy, když veřejný kontrakt skutečně beze změny dědí význam původního prvku.

Komentář nesmí slibovat chování, které testy a implementace nezaručují.

Veřejnost se posuzuje podle skutečného rozhraní technologie.

Interní typ serializovaný do veřejného protokolu může vyžadovat dokumentaci kontraktu i bez klíčového slova `public`.

Soukromý prvek komentář nepotřebuje, pokud je jeho účel jasný z názvu, typu a kontextu.

## Komentáře uvnitř metod

Jednořádkový komentář uvnitř metody použij pouze tehdy, když odděluje nebo vysvětluje významnou navazující část logiky.

Komentář má čtenáři umožnit rychle pochopit účel fáze.

Nemá převyprávět další řádek kódu.

Vhodné použití:

```csharp
// Ověří celý požadavek před zahájením změn, aby operace zůstala atomická.
Validate(command);

// Zapíše doménovou změnu a integrační událost v jedné transakční hranici.
await unitOfWork.CommitAsync(cancellationToken);
```

Nevhodné použití:

```csharp
// Zvýší čítač o jedna.
count++;
```

Pokud blok potřebuje dlouhé vysvětlení, nejprve prověř pojmenování, rozdělení odpovědností a strukturu kódu.

Komentář nesmí zakrývat zbytečnou složitost.

## Čitelnost a hranice odpovědnosti

Jeden prvek má mít srozumitelnou odpovědnost a název odpovídající doménovému nebo technickému významu.

Veřejné hranice mají být menší a stabilnější než jejich interní implementace.

Závislosti směřují podle pravidel v [`../architecture/overview.md`](../architecture/overview.md).

Validace patří na hranici, kde projekt poprvé získá odpovědnost za nedůvěryhodný vstup.

Chybové stavy se modelují způsobem přirozeným pro jazyk a veřejný kontrakt.

Neskrývej důležité selhání prázdným catch blokem, neurčitým booleanem ani ztrátou kontextu.

Preferuj:

- jasná data a explicitní kontrakty,
- standardní abstrakce jazyka a frameworku,
- kompozici odpovědností místo univerzálních tříd,
- malé veřejné rozhraní,
- deterministické jádro oddělené od I/O, pokud to zjednoduší chování,
- odstranění mrtvého a překonaného přechodového kódu,
- kompatibilní migraci místo dlouhodobého zdvojení cest.

## Utility, helpery a pomocné třídy

Nevytvářej obecnou utility nebo helper vrstvu pouze proto, že několik řádků lze přesunout.

Nejdříve ověř, zda problém řeší:

1. přirozený návrh existujícího modulu,
2. standardní prostředek jazyka nebo frameworku,
3. již používaná projektová abstrakce,
4. vhodná udržovaná knihovna,
5. malá lokální funkce s jasným vlastníkem.

Nové sdílené řešení je opodstatněné pouze tehdy, když má stabilní společný význam, více skutečných uživatelů a jednoznačnou domovskou oblast.

Podobnost syntaxe sama o sobě není sdílený koncept.

Předčasná generalizace zvyšuje vazby a nesmí být vydávána za odstranění duplicity.

Třída s názvem `Helper`, `Utils`, `Common` nebo obdobným neurčitým názvem vyžaduje zvlášť silné odůvodnění.

Lepší název vyjadřuje konkrétní schopnost nebo doménovou roli.

## Veřejné změny

Změna veřejného rozhraní musí určit dopad na kompatibilitu, migraci a dokumentaci.

Breaking change vyžaduje odpovídající produktové nebo architektonické rozhodnutí.

Nový veřejný prvek nevzniká pouze pro usnadnění jednoho testu.

Testovací bod se navrhuje přes skutečnou hranici chování nebo vhodnou interní seam bez rozšíření produkčního API.

## Bezpečnost a spolehlivost

Tajemství se nezapisují do kódu, testovacích dat, logů ani dokumentace.

Vstupy z vnější hranice se validují a výstupy se bezpečně kódují podle cílového kontextu.

Časové limity, zrušení, opakování a idempotence se řeší na základě konkrétního selhávajícího toku.

Automatické retry se nepřidává bez posouzení vedlejších účinků.

Logování nesmí odhalovat citlivá data a musí zachovat kontext potřebný k diagnostice.

## Kontrola změny

Při review ověř účel, hranice, veřejný kontrakt, čitelnost, chybové chování a testovatelnost.

Počet řádků nebo formální pokrytí nenahrazuje toto posouzení.

Kód je přijatelný pouze tehdy, když jeho struktura podporuje dlouhodobý záměr projektu.
