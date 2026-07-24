# Contributing

Thank you for contributing to Equation Citator. Bug reports, documentation improvements, tests, and pull requests are welcome.

## Report a bug

Before opening an issue, wait a few seconds for cache updates, then reopen the file or restart Obsidian to rule out an expected cache delay. Include:

1. A clear description and steps to reproduce the problem.
2. The Markdown that triggers the issue.
3. The debug console output after enabling debug mode in the plugin settings.

## Development setup

Install a current Node.js LTS release and npm, then install the project dependencies:

```sh
npm install
```

For development, run the JavaScript bundle watcher and the stylesheet watcher in separate terminals:

```sh
npm run dev:esbuild
npm run watch:css
```

On Windows, `npm run dev` starts both watchers. The generated `main.js` and `styles.css`, together with `manifest.json`, are the files to place in an Obsidian vault's `.obsidian/plugins/equation-citator/` directory for manual testing.

## Validation commands

Run the relevant checks before opening a pull request:

```sh
npm run check
npm run type-check
npm test
npm run build
```

Additional commands:

```sh
npm run check:case
npm run build:css
npm run docs:build
```

`npm run check` runs the repository ESLint configuration. `npm run type-check` runs TypeScript without emitting files. `npm test` runs Jest, and `npm run build` produces the production plugin bundle.

## Tests

Tests live in the nested `tests/` repository. Add or update `.ts` test files there. Do not add source-adjacent test files under `src/`.

## Pull requests

1. Fork the repository and branch from `dev-latest`.
2. Open the pull request **against `dev-latest`, never `master`**. `dev-latest` is the active development branch.
3. Keep the change focused and include tests when behavior changes.
4. Run the validation commands above and describe the results in the pull request.
5. Add an entry to the appropriate file under `changelogs/en/` when the change is user-facing. Use the next patch version unless a new minor release is planned.

## Project conventions

- Keep shared utilities under `src/utils/` and use the existing parser and workspace helpers where applicable.
- Add UI strings to `src/i18n/locales/en.tsx`. Do not modify the Chinese translation unless the change specifically includes translation work.
- Preserve desktop and mobile compatibility. Node APIs must be behind desktop-only runtime guards.
- Do not add inline `.style = ...` assignments; use the existing SCSS files.
- Document non-obvious exported or safety-critical functions, especially filesystem and cache behavior.
