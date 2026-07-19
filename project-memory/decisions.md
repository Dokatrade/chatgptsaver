# Decisions

## File-Based Project Memory

### Context

Future Codex sessions need a lightweight way to understand current project state, active tasks, important decisions, and summarized chat context.

### Decision

Use `project-memory/` with `HANDOFF.md`, `TODO.md`, `decisions.md`, and `chat-notes.md`, and keep `AGENTS.md` as the short map that points to those files and the existing project docs.

### Reason

Small Markdown files are easy to inspect, update, and review without introducing new tooling or dependencies.

### Consequences

Substantial future work should update the relevant memory files with short, factual notes.

## Ignore Local Agent Metadata

### Context

The repository may contain local `.agents/` and `.codex/` directories created by tooling.

### Decision

Ignore `.agents/` and `.codex/` in `.gitignore`.

### Reason

These directories are local agent/tooling state and should not become project files.

### Consequences

Future local agent metadata should stay out of Git status.

## Dependency-Free Project Checks

### Context

The project had only a failing placeholder `npm test` script and manual packaging instructions.

### Decision

Use small Node scripts in `scripts/` for project integrity checks and extension zip packaging.

### Reason

The workflow improves repeatability without adding runtime or development dependencies.

### Consequences

Run `npm test` after code changes and `npm run package` before release packaging checks.

## Testable Extraction Module

### Context

Message extraction is the most fragile part of the extension because ChatGPT DOM changes can remove or hide exported text.

### Decision

Move extraction helpers into `content/extractor.js`, keep `content/content.js` as the Chrome message bridge, and load both scripts in `manifest.json` and popup fallback injection.

### Reason

The extractor can now be tested directly in Node while preserving the same browser runtime behavior.

### Consequences

Any fallback injection must include `content/extractor.js` before `content/content.js`.

## jsdom Fixture Tests

### Context

Extraction tests need a DOM runtime, and no browser CLI was available in the local environment.

### Decision

Use `jsdom` as a dev dependency for `scripts/test-extractor.js`.

### Reason

It enables focused DOM fixtures without adding production dependencies or a build step.

### Consequences

`npm test` now runs both project integrity checks and extractor fixture tests.

## EPUB Export Without Runtime Dependency

### Context

The extension needed EPUB export while preserving the no-build vanilla JavaScript runtime and avoiding new production dependencies.

### Decision

Generate EPUB 3 in `popup/epub.js` with XHTML/OPF/nav/CSS files and a small uncompressed ZIP writer.

### Reason

EPUB does not require compressed ZIP entries, so a focused writer is enough for the extension and keeps runtime packaging simple.

### Consequences

`npm test` includes EPUB fixture checks for ZIP structure, required files, and basic XHTML escaping.

## AZW3/Kindle Export Path

### Context

The user requested AZW3 export from the Chrome extension.

### Decision

Expose an AZW3/Kindle option that saves a valid EPUB source instead of writing a fake `.azw3` file.

### Reason

AZW3/KF8 generation requires Kindle-specific conversion tooling; the Manifest V3 extension runtime cannot run local converters and the project should not add production dependencies without explicit approval.

### Consequences

Users can convert the saved EPUB to AZW3 with Calibre, Kindle Previewer, or another external Kindle tool.

## Remove AZW3/Kindle Popup Option

### Context

The AZW3/Kindle popup option saved the same `.epub` file as EPUB export, which made the UI look like it generated a real `.azw3` file.

### Decision

Remove the AZW3/Kindle format option and keep EPUB as the book export format.

### Reason

The extension cannot reliably generate true AZW3/KF8 in Manifest V3, and EPUB can be sent to Kindle through Amazon's Send to Kindle flow without exposing a separate pseudo-AZW3 export.

### Consequences

The popup now offers TXT, Markdown, PDF, and EPUB only.

## Scroll-Aware Export Extraction

### Context

Exports could return fewer messages depending on the user's current scroll position because ChatGPT may hide or virtualize conversation turns.

### Decision

Use an async export extraction path that scans the conversation scroll area from top to bottom, deduplicates messages, and restores the original scroll position.

### Reason

Collecting only currently visible message groups is not reliable on virtualized ChatGPT conversations.

### Consequences

The popup export action may briefly scroll the page during extraction, but it should restore the original position before completing.

## End-Based Virtualized Conversation Scan

### Context

The initial scroll-aware collector stopped after 80 increments, which could end before a long ChatGPT conversation had been fully rendered.

### Decision

Continue scanning until the scroll container reaches its current end, with the existing stalled-scroll detection as the safety stop.

### Reason

Conversation height and turn size vary widely, so a fixed number of increments cannot reliably cover long threads.

### Consequences

Long exports can take longer, but are no longer truncated by an arbitrary scroll-step limit.

## Conversation Scroll Container Selection

### Context

The page can contain other long scrollable regions, such as the chat-history sidebar, which do not cause conversation turns to virtualize.

### Decision

Use the closest ancestor of an extracted conversation turn whose computed CSS overflow is scrollable; only use a message-count-aware fallback when no such ancestor exists.

### Reason

DOM height alone does not make an element scrollable, and the tallest scrollable element is not necessarily the conversation viewport.

### Consequences

Long-chat extraction scrolls the element that causes ChatGPT to mount older and newer turns, with a 300 ms render settle delay per position.

## Preserve Initial Conversation Viewport

### Context

In very large chats, the newest few turns can be mounted at the bottom initially but fail to remount after an automated top-to-bottom scan.

### Decision

Capture messages before moving the scroll position and merge any missing initial messages after the full scan.

### Reason

The initial bottom viewport may be the only reliable DOM snapshot of the newest turns.

### Consequences

Exports retain tail messages even when ChatGPT's virtualizer only remounts the older portion during scanning.

## Ordered Virtualized Snapshot Merge

### Context

Global `role + content` deduplication during scroll scans can drop legitimate repeated turns, such as repeated "continue" prompts near the end of a long chat.

### Decision

Merge each rendered viewport snapshot by ordered suffix/prefix overlap, use stable ChatGPT message or turn IDs when available, dispatch synthetic scroll events after programmatic scrolls, and run a repeated final bottom-seek before restoring the user's scroll position.

### Reason

Overlapping viewport snapshots still need duplicate suppression, identical text in different turns must remain separate exported messages, and ChatGPT may report the scroll bottom before the newest turns have actually mounted.

### Consequences

Repeated tail prompts and delayed bottom-rendered turns are preserved, stable-ID messages can be updated with more complete streamed content, and long-chat extraction remains scroll-order based.

## Revert Image Embedding Attempt

### Context

An attempted best-effort image embedding path for PDF and EPUB made the export behavior worse.

### Decision

Remove the image embedding changes and return PDF/EPUB to text-only message export.

### Reason

The current image approach was not reliable enough and should not degrade existing exports.

### Consequences

Future image support should be designed separately and tested manually against real ChatGPT image cases before being merged into the main export flow.

## DOM Quiescence Bottom Stabilization

### Context

Long ChatGPT exports could miss the final turns because React or the virtualizer may mount DOM nodes after the scroll position has already reached the bottom.

### Decision

After programmatic scrolls, wait for MutationObserver-based DOM quiescence; always run a bottom stabilization pass requiring 3 consecutive identical bottom states; use numeric `conversation-turn-N` indexes to detect gaps and trigger a limited rescan.

### Reason

Event/state-based stabilization is more reliable than increasing a fixed timeout and directly targets delayed virtualizer updates.

### Consequences

Long exports may wait until DOM mutations settle, but delayed final turns and detectable turn-index gaps are less likely to be omitted.
