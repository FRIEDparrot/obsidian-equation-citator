# Repository Notes

- Project tests live in the separate nested repository at `tests/`, not beside source files.
- The nested test repository remote is `https://github.com/FRIEDparrot/obsidian-equation-citator-test`.
- Add or update test files under `tests/` using `.ts` test files, following `tests/README.md`.
- Do not add source-adjacent test files such as `src/**/*.test.tsx` for this project.

## `src/` Structure

- `src/main.tsx`: plugin lifecycle, cache/service registration, editor extensions, reading-mode processors, settings tab registration.
- `src/api/`: external API helpers such as update checking.
- `src/cache/`: cache classes for parsed equations, citations, figures/images, footnotes, callouts, and line hashes.
- `src/commands/`: Obsidian command registration.
- `src/debug/`: debug logging utilities.
- `src/export/`: PDF/export-specific generation logic.
- `src/func/`: command-facing feature functions such as markdown export and auto-number execution.
- `src/handlers/`: editor or workspace event handlers such as right-click handling.
- `src/services/`: higher-level lookup/update services for equations, figures, callouts, tags, and figure tags.
- `src/settings/`: settings model, metadata, settings tab UI, category helpers, setting-page renderers, settings extensions, and style managers.
- `src/styles/`: SCSS for plugin UI, settings, popovers, panels, and shared variables.
- `src/types/`: ambient TypeScript declarations.
- `src/ui/`: ribbon buttons, modals, and custom panels. The equation management panel lives in `src/ui/panels/equationManagePanel/`.
- `src/utils/`: reusable logic grouped by domain: `core/` for citation/auto-number algorithms, `parsers/` for markdown parsers, `workspace/` for Obsidian workspace/editor helpers, `string_processing/` for regex/string helpers, and `misc/` for small shared utilities.
- `src/views/`: editor/reading-mode rendering, widgets, popovers, and autocomplete suggestions.

# Add settings

- This project has 3 settings tab view methods. So when a new setting is added, besides adding to the defaultSettings.tsx, the UI componenet should be defined in `src\settings\pages`, and since we have a list view, you also need to check `src\settings\settingsHelper.tsx` to ensure the settings key is in it.
- Set Basic/Advanced display placement directly in `DEFAULT_SETTINGS.basicSettingsKeys` or `DEFAULT_SETTINGS.advancedSettingsKeys`. Do not add migration or push logic in `src\main.tsx` just to place a setting in the settings UI.

- Consider the mobile compatibility of this plugin. The node may be not available when running in an mobile environment.
