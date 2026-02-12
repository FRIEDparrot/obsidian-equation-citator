# Copilot Instructions

## Summary (TL;DR)
Default all version bumps, bug fixes, preview / pre-release PRs, and release candidate PRs to base branch `dev-latest` unless the user explicitly specifies committing to the `master` branch. Do not target `master` without an explicit instruction.

## Purpose
This repository uses a staged development workflow:
- `dev-latest`: Active integration, preview, fixes, experiment stabilization.
- `master`: Only receives explicitly requested, finalized, stable release changes. 

## Core Rule
If the user does NOT explicitly say the PR should commit to / merge into `master`, assume `dev-latest` as the base.


Explicit instructions that permit using `master` include phrases such as:
- "commit to master"
- "merge into master"
- "base master"
- "open a PR to master"
- "final/stable release to master"
- "promote dev-latest to master"

Anything else defaults to `dev-latest`.

For the develop of this plugin, we shouldn't use dynamic js style code, since its forbidden in the obsidian plugin environment, we should write style code in the scss file instead. Not use `.style.` or `setAttribute('style', ...)` in js code, instead, we can add/remove class to the element and write the style in scss file.


Also, always pay attention to case. [Use sentence case in UI](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+sentence+case+in+UI)

## Target Grammar 
Basic grammar of this plugin is `$\ref{eq:1.1}$`, We support the case that only 1 type of citation (either `eq:`, `fig:`, `callout:`) in the citation form. Available prefixes should be read from settings. We not support mixed citation. You can check `tutorials/Quick Start.md` for details.

## Style File for this Project
- The style file for this project can be found at: `src/styles` foder, only modify the `.scss` files under that folder, not the compiled `.css` files.
- Never modify `main.js` or `main.css` directly, they are generated files. 

## Build, Test, and Lint

- **Build Plugin**: `npm run build` (runs TypeScript compiler and esbuild for production)
- **Dev Mode**: `npm run dev` (watches for SASS changes and runs esbuild in watch mode)
- **Run Tests**: `npm run test` (runs all Jest tests)
- **Run Single Test**: `npx jest path/to/test.ts`
- **Lint**: `npm run check` (ESLint)
- **Type Check**: `npm run type-check` (runs `tsc` without emitting files)
- **Style Build**: `npm run build:css` (compiles SASS to CSS)

## High-Level Architecture

- **Entry Point**: `src/main.tsx` is the main plugin class (`EquationCitator`) which initializes caches, services, and registers views/extensions.
- **Caching**: The plugin relies heavily on caching to maintain performance.
  - Located in `src/cache/`.
  - Specific caches include `EquationCache`, `CitationCache`, `FootNoteCache`, `ImageCache`, `CalloutCache`.
  - Caches are initialized in `loadCaches()` and cleared/destroyed on unload.
- **Services**: Business logic is encapsulated in services located in `src/services/` (e.g., `EquationServices`, `FigureServices`).
- **Editor Integration**:
  - **CodeMirror 6**: Uses CM6 extensions for Live Preview features.
  - **Compartments**: Uses `Compartment` from `@codemirror/state` to allow dynamic reconfiguration of extensions (see `upDateEditorExtensions` in `main.tsx`).
  - **Post-Processors**: Registers markdown post-processors for Reading Mode rendering.
- **UI Components**:
  - **Panels**: Custom views like `EquationArrangePanel` in `src/ui/panels/`.
  - **Widgets**: Editor widgets located in `src/views/widgets/`.

## Key Conventions

- **Path Aliases**: Use `@/` to import from the `src/` directory (configured in `tsconfig.json` and `jest.config.cjs`).
- **Mocking Obsidian**: Tests mock the Obsidian API using `tests/mocks/obsidian.ts`. Always ensure imports from `obsidian` are handled correctly in tests.
- **Styling**: Use SCSS/SASS in `src/styles/` which compiles to `styles.css`.
- **Async Initialization**: Caches and services are loaded asynchronously in `onload()`.
- **Event Handling**: Use the `Shared` event bus or specific handlers in `src/handlers/` for UI interactions.
