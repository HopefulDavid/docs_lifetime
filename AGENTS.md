# Family documentation site

Practical household guides, currently recipes with a shared shopping list and step-by-step cooking, published as a DocFX site to GitHub Pages. People read the Czech `README.md`.

## Content

- Recipes in `food/` and `drink/`, `pruvodce.md` and every user-facing text in the generator and the kitchen client are neutral Czech with no second-person address, formal or informal (`Cibule se nakrájí najemno.`, not `Cibuli nakrájejte najemno.`), because the owner decided against addressing the reader. `tests/style.test.js` checks recipes and the guide.
- A recipe path is `<food|drink>/<continent>/<country>/<type>/<name>.md` with keys from `data/taxonomy.json`, and every ingredient name must match `data/ingredients.json` exactly, because the generator builds navigation and the shopping list from these dictionaries. `index.md` is reserved for generated overviews.
- Section titles `Ingredience`, `Postup`, `Před přípravou` and `Video postup` are a contract shared by `scripts/docset/`, the kitchen client, `data/icons.json` and tests, so rename one only in all of them together.
- Life areas come from `data/areas.json`: exactly one `kitchen` area with its own generator, and `guides` areas built by `scripts/docset/areas.js` from `guides/<id>/*.md` (front matter `description`, a `#` title, neutral Czech checked by `tests/style.test.js`). Add a new life area there instead of hard-coding pages or navigation.
- `_generated/` and `_site/` are build outputs. Change the sources, never the outputs.

## Kitchen client

- `templates/life/public/kitchen/` stores state in `localStorage` under `kitchen-plan-v1` and shares plans as `version: 1` payloads. Shared links and saved plans exist on family devices, so keep reading version 1 when the format changes and add a new version instead of changing its meaning.
- `scripts/docset/recipe.js` imports `templates/life/public/kitchen/quantity.js`, so quantity parsing has one implementation for the build and the browser.

## Commits

- Commit messages appear on the public changelog page through `cliff.toml`. Use Czech Conventional Commits with a scope where the history uses one (`feat(content):` for a new recipe).
- A push to `main` publishes the site after CI passes, so push only with the owner's approval.

## Validation

Run from the repository root in PowerShell. Setup: `bun ci` and `dotnet tool restore`.

- `bun run validate`: Prettier check (`check:format`, Markdown excluded), tests and a full build with DocFX warnings as errors and `scripts/verify-site.js`. Run it before every commit. CI runs the same script.
- `bun run fix` rewrites code and data files across the repository.
- After changing `templates/life`, also run `bun run dev` (long-running, port 8765) and check the shopping list, cooking mode, sharing and print preview in the browser, because `validate` does not run the client in a browser.
