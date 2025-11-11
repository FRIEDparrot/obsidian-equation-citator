# Testing Callout Citation Parser

This document explains how to test the callout citation parser implementation.

## Overview

The callout citation parser allows you to cite callouts/quotes in your Obsidian notes using the format:

```markdown
> [!prefix:tag]
> Content of the callout
```

For example:
- `> [!table:1.1]` - Table citation
- `> [!thm:2.3]` - Theorem citation
- `> [!def:3.5]` - Definition citation

## Test Files

### 1. `callout_parser.test.ts`
Automated Jest tests that verify the parser functionality.

**Test Coverage:**
- ✅ Basic callout parsing
- ✅ Multi-line callout content
- ✅ Multiple callouts in one document
- ✅ Edge cases (single line, various tag formats)
- ✅ Invalid cases (code blocks, regular quotes)
- ✅ Line number tracking
- ✅ Quote depth tracking

### 2. `callout_parser.test.md`
Sample markdown file with various callout examples for manual testing.

**Includes:**
- Valid callout examples (table, theorem, definition)
- Edge cases (nested quotes, empty lines, markdown tables)
- Invalid cases (unconfigured prefixes, missing tags)
- Multiple callout scenarios

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Only Callout Parser Tests
```bash
npm test tests/callout_parser.test.ts
```

### Run with Watch Mode
```bash
npm test -- --watch
```

### Run with Coverage
```bash
npm test -- --coverage
```

## Test Results

All 17 tests should pass:
```
PASS tests/callout_parser.test.ts
  parseCalloutCitation
    ✓ should parse basic table callout
    ✓ should parse multi-line callout content
    ✓ should parse multiple callouts in same document
  parseAllCalloutsFromMarkdown - edge cases
    ✓ should ignore regular quotes without citation tags
    ✓ should ignore callouts in code blocks
    ✓ should parse single-line callout
    ✓ should handle callouts with various tag formats
    ✓ should end callout at non-quote line
    ✓ should ignore callouts with unconfigured prefixes
    ✓ should handle empty prefixes array
    ✓ should handle empty markdown
  parseFirstCalloutInMarkdown
    ✓ should find first callout with specific tag
    ✓ should return undefined for non-existent tag
    ✓ should return undefined for empty tag
  CalloutMatch structure
    ✓ should include correct line numbers
    ✓ should track quote depth
    ✓ should include raw content

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

## Manual Testing in Obsidian

To test the parser in your Obsidian vault:

### 1. Build the Plugin
```bash
npm run build
```

### 2. Configure Citation Prefixes
In Obsidian settings, go to:
- **Equation Citator** → **Citation Settings** → **Callout/Quote Citation Prefixes**

Add your desired prefixes:
```
Prefix: table:
Format: Table. #

Prefix: thm:
Format: Theorem #

Prefix: def:
Format: Definition #
```

### 3. Create Test Note
Create a new note with sample callouts:

```markdown
# Test Callouts

> [!table:1.1]
> | Column 1 | Column 2 |
> |----------|----------|
> | Data 1   | Data 2   |

Reference the table: \ref{table:1.1}

> [!thm:2.3]
> **Theorem**: Every callout can be cited.

Reference the theorem: \ref{thm:2.3}
```

### 4. Verify Cache
The `CalloutCache` should automatically parse and cache the callouts.

Check the cache in the browser console:
```javascript
// In Obsidian dev console
app.plugins.plugins['equation_citator'].calloutCache.getCalloutsForFile('path/to/note.md')
```

### 5. Test Citation Rendering
The citation `\ref{table:1.1}` should render as "Table. 1.1" (based on your format setting).

## API Usage Examples

### Get All Callouts in a File
```typescript
const callouts = await plugin.calloutCache.getCalloutsForFile(filePath);
console.log(`Found ${callouts.length} callouts`);
```

### Get Specific Callout by Tag
```typescript
const callout = await plugin.calloutCache.getCalloutByTag(filePath, '1.1');
if (callout) {
    console.log(`Type: ${callout.type}`);
    console.log(`Content: ${callout.content}`);
}
```

### Get Callouts by Type
```typescript
const tables = await plugin.calloutCache.getCalloutsByType(filePath, 'table');
console.log(`Found ${tables.length} tables`);
```

### Parse Markdown Directly
```typescript
import { parseAllCalloutsFromMarkdown } from '@/utils/parsers/callout_parser';

const markdown = `> [!table:1.1]\n> Content`;
const callouts = parseAllCalloutsFromMarkdown(markdown, settings.quoteCitationPrefixes);
```

## Debugging

Enable debug mode in settings to see parser logs:
1. Go to **Equation Citator** → **Other Settings** → **Debug Mode**
2. Enable debug mode
3. Open the browser console (Ctrl+Shift+I)
4. Look for callout parser logs

Example logs:
```
[Debug] Parsed callout at lines 5-8: type=table, tag=1.1
[Debug] Total callouts parsed: 3
[Debug] callout data cached for key: path/to/note.md
```

## Known Limitations

1. **Nested Callouts**: Currently only parses the outer-most callout level
2. **Prefix Matching**: Must exactly match configured prefixes (case-sensitive)
3. **Tag Format**: No validation on tag format (any text after prefix is accepted)

## Troubleshooting

### Tests Fail
```bash
# Clean install dependencies
npm install

# Run tests with verbose output
npm test -- --verbose
```

### Parser Not Working in Obsidian
1. Check that prefixes are configured correctly
2. Verify the markdown syntax matches `> [!prefix:tag]`
3. Enable debug mode and check console for errors
4. Try clearing cache: `plugin.calloutCache.clear()`

### Cache Not Updating
The cache updates based on `cacheUpdateTime` setting (default 5 seconds). Wait a bit or manually trigger:
```javascript
await plugin.calloutCache.updateCache(filePath);
```

## Additional Resources

- Parser implementation: `src/utils/parsers/callout_parser.tsx`
- Cache implementation: `src/cache/calloutCache.tsx`
- Test file: `tests/callout_parser.test.ts`
- Example markdown: `tests/callout_parser.test.md`
