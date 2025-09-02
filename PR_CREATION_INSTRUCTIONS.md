# Instructions for Creating PR Retargeted to dev-friedparrot

## Overview
This branch (`retarget-pr43-to-dev`) contains the exact same changes as PR #43 but is based on `dev-friedparrot` instead of `master`.

## Pull Request Details

### Title
```
Prepare v1.3.0-preview.1 release with test fixes and stability improvements
```

### Body
```markdown
Note: This is the same content as #43 but retargeted to dev-friedparrot for testing before merging into master.
注意：这是与 #43 相同的更改，但基准分支改为 dev-friedparrot，用于先在开发分支测试。

This PR prepares the v1.3.0 preview release for the Obsidian Equation Citator plugin, addressing the need for extensive testing and validation before the final release as outlined in the issue.

## Key Changes

### Test Infrastructure Fixes
Fixed critical issues in the test suite that were preventing proper validation of plugin functionality:

- **Jest Module Mapping**: Corrected the mock import path from `@/utils/heading` to `@/utils/heading_utils` in the auto-numbering tests
- **Missing Mock Function**: Added the missing `parseHeadingsInMarkdown` mock implementation to enable comprehensive heading structure testing
- **Citation Format Tests**: Updated cross-file citation tests to match the current footnote format implementation (`[^N]` instead of `[N]`)

### Version Management
Updated all version files to reflect the preview status:

- **package.json**: Updated to v1.3.0-preview.1
- **manifest.json**: Updated to v1.3.0-preview.1  
- **versions.json**: Added preview version entry with Obsidian compatibility

### Documentation
Enhanced the changelog with comprehensive preview release notes including:

- Clear preview release warnings and timeline expectations
- Documentation of stability improvements and test fixes
- Overview of functionality being tested during the preview period

## Validation Results

The preview release now has a fully functional test suite:
- ✅ **All 398 tests passing** (previously 28 failing)
- ✅ **Successful build** with TypeScript compilation
- ✅ **Citation rendering** verified with footnote format
- ✅ **Cross-file citations** working correctly
- ✅ **Equation auto-numbering** validated across various heading structures

## Testing Focus Areas

This preview enables thorough testing of:
- Citation rendering accuracy in different contexts
- Cross-file citation functionality with the footnote format
- Equation auto-numbering with complex heading hierarchies
- Overall plugin stability and performance

The preview will undergo several weeks to a month of testing as mentioned in the issue, with potential patch releases if critical issues are discovered.

Fixes #41.


---

💡 You can make Copilot smarter by setting up custom instructions, customizing its development environment and configuring Model Context Protocol (MCP) servers. Learn more [Copilot coding agent tips](https://gh.io/copilot-coding-agent-tips) in the docs.
```

## Branch Configuration
- **Head branch**: `retarget-pr43-to-dev`
- **Base branch**: `dev-friedparrot`

## Manual Steps to Create PR
1. Navigate to the GitHub repository: https://github.com/FRIEDparrot/obsidian-equation-citator
2. Click "Compare & pull request" for the `retarget-pr43-to-dev` branch
3. Set base branch to `dev-friedparrot`
4. Set compare branch to `retarget-pr43-to-dev`
5. Use the title and body provided above
6. Assign reviewers as needed
7. Create the pull request

## Changes Summary
The branch contains the following changes compared to `dev-friedparrot`:
- **7 files changed**: 53 additions, 11 deletions
- **Files modified**: CHANGELOG.md, manifest.json, package-lock.json, package.json, tests/auto_number.test.ts, tests/citation_utils.test.ts, versions.json
- **Version bumped**: From 1.2.4 to 1.3.0-preview.1
- **Test fixes**: Jest module mapping and mock function improvements
- **Documentation**: Enhanced changelog with preview release notes