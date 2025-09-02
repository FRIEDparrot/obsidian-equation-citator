# Copilot Instruction: Default PR Base Branch Policy (dev-friedparrot)

## Summary (TL;DR)
Default all version bumps, bug fixes, preview / pre-release PRs, and release candidate PRs to base branch `dev-friedparrot` unless the user explicitly specifies committing to the `master` branch. Do not target `master` without an explicit instruction.

## Purpose
This repository uses a staged development workflow:
- `dev-friedparrot`: Active integration, preview, fixes, experiment stabilization.
- `master`: Only receives explicitly requested, finalized, stable release changes.

## Core Rule
If the user does NOT explicitly say the PR should commit to / merge into `master`, assume `dev-friedparrot` as the base.

Explicit instructions that permit using `master` include phrases such as:
- "commit to master"
- "merge into master"
- "base master"
- "open a PR to master"
- "final/stable release to master"
- "promote dev-friedparrot to master"

Anything else defaults to `dev-friedparrot`.

## Behavior Guidelines
1. Default Base: Use `dev-friedparrot` for version bumps, fixes, preview, beta, alpha, rc, test stabilization, and refactors unless explicitly told otherwise.
2. Stable Releases: When user explicitly requests committing to `master`, first (if relevant) ensure `dev-friedparrot` is synchronized (merge or rebase) before creating a PR to `master`.
3. Ambiguity: If user request is ambiguous (e.g., "prepare a PR"), choose `dev-friedparrot` and mention you followed the default policy.
4. Retargeting: If an existing PR was mistakenly based on `master` without explicit instruction, suggest recreating or retargeting to `dev-friedparrot`.
5. Avoid Automatic Promotion: Never create a PR from `dev-friedparrot` to `master` unless explicitly asked.
6. Do Not Close Old PRs Automatically: Only suggest closing duplicates; do not close PRs unless told.
7. Explanations: Keep confirmations short unless the user asks for detailed reasoning.
8. Testing Flow: Encourage verification on `dev-friedparrot` before promotion to `master`.
9. Conflict Handling: If preparing a master release, advise merging/rebasing latest `master` into `dev-friedparrot` first to reduce conflicts when promoting.
10. Changelog / Versioning: Pre-release identifiers (`-preview.*`, `-beta.*`, `-rc.*`) stay on `dev-friedparrot`. A clean semver (e.g. `1.3.0`) may target `master` only when explicitly requested.
11. Changelog Attribution: Whenever Copilot adds or modifies entries in `CHANGELOG.md`, append "(By Copilot🤖)" to each affected line item so authorship is explicit and auditable.

## Whenever Copilot modifies CHANGELOG.md:

1. Append the marker [copilot] at the end of every newly added line item.
2. If Copilot edits an existing line item (changes wording, version, ordering, formatting), ensure that line ends with [copilot].
3. Do NOT duplicate the marker; if a line already ends with [copilot], leave it unchanged.
4. Preserve any existing human attributions or other annotations; just add (or ensure) the trailing [copilot] marker.
5. Do not reorder untouched lines solely to add attribution.
Only touch lines that are newly added or actually modified by Copilot.

## Example Triggers (Base should be dev-friedparrot)
- "Prepare a preview release PR"
- "Bump version to 1.4.0-preview.1"
- "Add a fix for citation parsing"
- "Stabilize tests for next release candidate"
- "Create an rc PR"  (No mention of master)

## Example Explicit Master Requests
- "Open a PR to master for the final 1.4.0 release"
- "Promote dev-friedparrot to master"
- "Create the stable release PR targeting master"

## Recommended PR Body Snippet
```
Base branch: dev-friedparrot (default staged development policy)
Rationale: Using integration branch before explicit promotion to master.
```

## Promotion Workflow (When Explicitly Requested)
1. Confirm user intent to target `master`.
2. Ensure `dev-friedparrot` includes latest `master` (merge or rebase if needed).
3. Open PR: `dev-friedparrot` -> `master` with clear release notes.
4. After merge: Tag release if appropriate.
5. Resume normal work on `dev-friedparrot`.

## What NOT To Do
- Do not assume master for ambiguous wording.
- Do not auto-open promotion PRs.
- Do not close existing PRs unprompted.
- Do not alter version numbers beyond user intent.

## Quick Decision Algorithm
```
IF request explicitly references master (commit / merge / base / release to master)
    THEN target master
ELSE
    target dev-friedparrot
```

## Short Reference String (For Fast Retrieval)
Default base = dev-friedparrot unless explicit master commit requested.