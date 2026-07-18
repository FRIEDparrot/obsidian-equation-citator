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
- `src/utils/misc/desktop_fs_utils.tsx`: desktop-only Node/Electron filesystem/path helpers, including safe runtime `require`, path normalization, containment checks, resolving child paths inside an export folder, and cleaning external export artifacts.
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
- For website-note sync cleanup outside the vault, treat stale files as generated artifacts and remove them with logged `fs.rm` helpers in `src/utils/misc/desktop_fs_utils.tsx`; do not add system-trash or command-runner fallbacks.


## Documentation

- Add brief documentation for relatively complex functions to preserve readability and maintainability. 
- Also, Especially, key functions (like exported interface functions and the functions )
- A good function comment should explain the function contract first: what the function does, what each non-obvious parameter represents, and what the caller can expect from the return value or side effects.
- Use `@param` only when a parameter is non-obvious or important to the function contract.
- Document edge cases only when they are important to the function's correctness or safety, such as path traversal, missing files, stale cache/index entries, mobile or desktop API availability, and destructive-operation safety. Do not add edge-case lists to simple functions where the signature and body are already clear.
- Do not document self-evident parameters such as `plugin`, `file`, or `folder` when the signature and local context already make them clear.
- When a `catch` handles a non-trivial operation, log detailed context with `Debugger.log` or `Debugger.error` in addition to any user-facing `Notice`; include the operation, relevant file/path, and the original error object when available.

## Maintainability 
- Always prevent redunant, unused functions and unnecessary nesting. Keep the code as short and clean as possible. 
- If not necessary, prevent alias for multiple alias  (like ` Embedlink > MarkdownLink`), for this case, keep only one for clarity (Use naming as clear as possible, prefer short, clear name; or the long name is accepted if clear enough)

## Safety

- Do not add Windows command execution through shell, PowerShell, `cmd`, `child_process`, or similar command runners unless explicitly requested; these paths are fragile and can look like command injection.


## Translation 

For UI text, always add the text, like notice, to en.tsx file. Don't change zh-CN.tsx unless I explicitly specify that.  Since there would be some encoding issues. 


## Obsidian Plugin rules  

1. Never insert any .style = xxx code into the script, use scss file instead. 


## Command 
These following commands should be selected if I prompt `cmd <CMD>`

`translate` : there  are some options that not inlcuded in the zh-CN.tsx now. You may run git diff to see what we added and changed, sync these changes to zh-CN translation 
`translate:changelogs` : sync the changelogs/en folder to changelogs/zh folder (translate chinese). 
`translate:readme`: sync en to zh for readme 