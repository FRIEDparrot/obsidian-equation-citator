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

## `src/utils/` Guide

- Prefer adding shared helpers under `src/utils/` instead of keeping reusable utilities inside command or UI modules.
- `src/utils/core/auto_number_core.tsx`: shared auto-numbering state, config types, tag generation, and heading/code-block processing used by equation and figure numbering.
- `src/utils/core/auto_number_equations.tsx`: equation auto-numbering, cursor-position tag lookup, and illegal nested-equation detection.
- `src/utils/core/auto_number_figures.tsx`: figure auto-numbering and reconstruction of wiki/markdown image lines with updated figure tags.
- `src/utils/core/citation_utils.tsx`: citation parsing, cross-file citation formatting/splitting, continuous citation combine/split logic, and autocomplete tag extraction.
- `src/utils/core/footnote_utils.tsx`: footnote lookup/creation for cross-file references.
- `src/utils/parsers/`: markdown parsers for equations, images/figures, footnotes, headings, and callouts. Use these instead of ad hoc regex parsing when possible.
- `src/utils/string_processing/regexp_utils.tsx`: shared regex constants and small constructors/parsers for citations, equation tags, images, callouts, and code-block detection.
- `src/utils/string_processing/string_utils.tsx`: markdown line environment parsing, quote/code/math environment helpers, validation helpers, brace removal, and safe string escaping.
- `src/utils/workspace/`: Obsidian workspace/editor helpers for leaf lookup, source-mode checks, view lookup from events/elements, panel invocation, cursor insertion, equation navigation, and drag-drop cursor rendering.
- `src/utils/misc/array_utils.tsx`: generic array pattern search via KMP.
- `src/utils/misc/desktop_fs_utils.tsx`: desktop-only Node/Electron filesystem/path helpers, including safe runtime `require`, path normalization, containment checks, resolving child paths inside an export folder, and moving external export artifacts to the system trash.
- `src/utils/misc/equation_copy.tsx`: equation clipboard formatting/copy helpers.
- `src/utils/misc/fileLink_utils.tsx`: resolved-link backlink/forward-link helpers for `metadataCache.resolvedLinks`.
- `src/utils/misc/fileProcessor.tsx`: markdown-file filtering and the `MarkdownFileProcessor` wrapper for safe vault file processing.
- `src/utils/misc/file_pattern_utils.tsx`: markdown filename-pattern normalization and wildcard matching.
- `src/utils/misc/hash_utils.tsx`: hashes for strings, parsed equations, and equation panel items.
- `src/utils/misc/mathjax_utils.tsx`: MathJax re-typesetting helper for refreshed dynamic content.

# Add settings

- This project has 3 settings tab view methods. So when a new setting is added, besides adding to the defaultSettings.tsx, the UI componenet should be defined in `src\settings\pages`, and since we have a list view, you also need to check `src\settings\settingsHelper.tsx` to ensure the settings key is in it.
- Set Basic/Advanced display placement directly in `DEFAULT_SETTINGS.basicSettingsKeys` or `DEFAULT_SETTINGS.advancedSettingsKeys`. Do not add migration or push logic in `src\main.tsx` just to place a setting in the settings UI.

- Consider the mobile compatibility of this plugin. The node may be not available when running in an mobile environment.
- For website-note sync cleanup outside the vault, do not use hard-delete APIs such as `fs.rm` or `fs.rmdir`. Move stale exported artifacts to the system trash through `src/utils/misc/desktop_fs_utils.tsx`.


## Documentation

- Add brief documentation for relatively complex functions to preserve readability and maintainability.
- For complex logic, document the edge cases the function intentionally handles, such as path traversal, missing files, stale cache/index entries, mobile or desktop API availability, and destructive-operation safety.
