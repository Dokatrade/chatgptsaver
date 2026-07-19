# Chat Notes

## Project Memory Setup

### Topic

Initial file-based project memory setup.

### Summary

- User requested a lightweight project memory system with `AGENTS.md` and `project-memory/`.
- Existing `agents.md` contained the project documentation map and was converted into a shorter root instruction file.
- Existing project docs describe a vanilla JavaScript Manifest V3 Chrome extension for exporting ChatGPT conversations to TXT, Markdown, and PDF.

### Follow-up

- Before future substantial work, read `AGENTS.md` and all files under `project-memory/`.

## Memory Cleanup

### Topic

Second pass over project memory and informational files.

### Summary

- No obsolete memory files were found outside `project-memory/`.
- `.agents/` and `.codex/` were identified as empty local tooling directories, but the filesystem reported them busy when deletion was attempted.
- `.gitignore` now excludes local agent metadata, temporary files, and extension archive artifacts.
- Template sections were removed from memory files to keep them concise.

### Follow-up

- If `.agents/` or `.codex/` stop being busy, they can be removed as local-only directories.

## Workflow Improvements

### Topic

Documentation and release workflow cleanup.

### Summary

- README and manifest description now describe TXT, Markdown, and PDF export support.
- `scripts/check-project.js` powers `npm test` for basic Manifest V3, version, file, permission, and popup dependency checks.
- `scripts/package-extension.js` powers `npm run package` and creates `chatgptsaver.zip` from runtime extension files.
- `npm test`, direct `node scripts/check-project.js`, `npm run package`, and `unzip -l chatgptsaver.zip` were run successfully.

### Follow-up

- Next high-value reliability work is fixture-based coverage for content extraction and formatting edge cases.

## Extraction Fix

### Topic

Missing visible text after ChatGPT inline arrow marker.

### Summary

- User reported that a visible phrase after an arrow marker in a ChatGPT message was missing from TXT, Markdown, and PDF exports.
- `content/content.js` globally removed `[aria-hidden="true"]` elements, which can include visible ChatGPT-rendered text.
- The extractor now keeps `aria-hidden` text and unwraps text-bearing `button`/`role="button"` blocks while still removing explicit controls/icons.
- `↪`/`↩` arrows are normalized for PDF-safe output.

### Follow-up

- Fixture-based extraction tests were added after this fix.

## Extraction Fixtures

### Topic

Test coverage for ChatGPT DOM extraction.

### Summary

- Extraction logic was moved to `content/extractor.js` with browser global and CommonJS exports.
- `content/content.js` now only bridges Chrome runtime messages to the extractor API.
- `manifest.json` and popup fallback injection now load `content/extractor.js` before `content/content.js`.
- `scripts/test-extractor.js` uses `jsdom` fixtures for visible `aria-hidden` text, text-bearing inline buttons, Markdown formatting, links, code blocks, fallback turns, and nested lists.
- `npm test`, `npm run package`, and `unzip -l chatgptsaver.zip` passed; the package includes `content/extractor.js`.

### Follow-up

- Add focused tests for Markdown/PDF formatting in popup code.

## EPUB Export

### Topic

Adding EPUB as a fourth export format.

### Summary

- `popup/epub.js` now generates EPUB 3 files with `mimetype`, `META-INF/container.xml`, `OEBPS/content.opf`, `OEBPS/nav.xhtml`, `OEBPS/chat.xhtml`, and `OEBPS/styles.css`.
- The EPUB ZIP writer is uncompressed and does not add a production dependency.
- Popup format selection now includes EPUB and downloads `.epub` through the existing `downloadBlob()` path.
- `scripts/test-epub.js` verifies EPUB container structure, required files, links, code blocks, lists, and XML escaping.
- `npm test`, `npm run package`, and `unzip -l chatgptsaver.zip` passed.

### Follow-up

- Manual browser testing should open an exported EPUB in a reader such as Calibre, Apple Books, or Thorium.

## AZW3/Kindle Export Path

### Topic

Adding Kindle/AZW3 support without fake AZW3 output.

### Summary

- Popup format selection now includes `AZW3/Kindle (через EPUB)`.
- The AZW3/Kindle path reuses the existing EPUB generator and downloads a valid `.epub` source for external AZW3 conversion.
- `scripts/check-project.js` now checks that all popup export format options are present.
- `npm test` passed after the change.

### Follow-up

- Manual testing should confirm the generated EPUB converts to AZW3 in Calibre or Kindle Previewer.

## AZW3 Option Removal

### Topic

Removing the misleading AZW3/Kindle popup option.

### Summary

- User clarified the goal is direct Send to Kindle, where EPUB is enough and manual AZW3 conversion is not desired.
- The AZW3/Kindle option duplicated EPUB output and could imply true `.azw3` generation.
- The popup now offers only TXT, Markdown, PDF, and EPUB.

## Scroll-Dependent Export Count

### Topic

Fixing exports that saved fewer messages depending on scroll position.

### Summary

- User reported that exporting at the bottom saved 3 messages while exporting at the top saved 5.
- The extractor previously collected only visible-sized `[data-message-author-role]` groups, which is fragile with ChatGPT's scroll virtualization.
- `extractAllMessagesWithScroll()` now scans the conversation scroll container top-to-bottom, deduplicates messages, and restores the original scroll position.
- A fixture now confirms zero-sized message groups still export when their content remains in the DOM.

## Image Embedding Revert

### Topic

Reverting attempted image preservation in PDF and EPUB exports.

### Summary

- User clarified images should be preserved in PDF as well as EPUB.
- A best-effort image embedding implementation was attempted, but the user reported it made the result worse.
- The image embedding changes were removed; PDF and EPUB exports are back to text/Markdown content.
- Future image support should be handled as a separate design/test task.

## Markdown Download MIME Fix

### Topic

Fixing Markdown exports that saved as TXT.

### Summary

- User reported that choosing MD still saved a TXT file.
- `downloadAsText()` used `text/plain;charset=utf-8` for both TXT and MD blobs.
- Markdown exports now use `text/markdown;charset=utf-8`, while TXT keeps `text/plain`.
- `scripts/check-project.js` now asserts the Markdown MIME type, and `npm test` passed.

## Long Conversation Export Limit

### Topic

Long ChatGPT conversations stopped exporting before all turns were collected.

### Summary

- The virtualized-conversation scanner had a fixed 80-step cap.
- It now continues until the live scroll range reaches its end and still stops on repeated lack of scroll progress.
- The extractor fixture simulates 100 virtualized positions and verifies that the last turn is collected and the original scroll position is restored.

## Conversation Scroller Detection

### Topic

The end-based scan could still target a sidebar or page wrapper rather than the chat viewport.

### Summary

- Extraction now selects the closest scrollable ancestor of a conversation turn instead of the tallest scrollable page element.
- The render delay increased to 300 ms so virtualized DOM changes have time to mount before collection.
- The long-chat fixture includes a taller scrollable sidebar and confirms it is ignored.
- A follow-up fixed a regression where a tall message wrapper with visible overflow was mistaken for a scroll container; computed CSS overflow is now required.

## Missing Newest Turns

### Topic

Four newest messages were missing from a very large chat export.

### Summary

- The scanner moved away from the initially mounted bottom viewport before preserving it.
- Extraction now captures the initial messages and merges any missing ones after the virtualized scan.
- The fixture covers turns 97–100 being available only before scrolling while the scan remounts through turn 96.

## Repeated Tail Messages

### Topic

Latest messages were still missing from some saved long chats.

### Summary

- The virtualized scan deduped globally by `role + content`, which could drop legitimate repeated prompts such as "continue" near the end of a chat.
- Extraction now merges ordered viewport snapshots by suffix/prefix overlap, uses stable ChatGPT message/turn IDs when present, dispatches scroll events after programmatic scrolls, and performs a repeated final bottom-seek.

## Expert Review Document

### Topic

Standalone description for external expert review.

### Summary

- Added `docs/extension-mechanics-expert-review.md` in Russian.
- The document explains Manifest V3 structure, popup/content/background responsibilities, scroll-aware extraction, PDF/EPUB generation, limitations, risks, and suggested review priorities.
- No runtime code or technical behavior changed.
- `scripts/test-extractor.js` includes fixtures where two identical user prompts in different turns are both preserved and where the true tail appears only after multiple bottom render attempts.

## Bottom Stabilization

### Topic

Preventing loss of final messages in long virtualized ChatGPT chats.

### Summary

- User reported likely premature bottom detection before React/virtualizer DOM updates finish.
- Extraction now waits for MutationObserver DOM quiescence after programmatic scrolls instead of relying only on double RAF and fixed timeout.
- The scroll scan always performs bottom stabilization; bottom is accepted only after 3 identical states by message count, last stable key, and scrollHeight, followed by a final snapshot merge.
- Numeric `conversation-turn-N` metadata is used when available to detect gaps, normalize reliable turn order, and repeat the scan once.
- Regression coverage now simulates delayed mounting of the last two conversation turns after reaching the bottom.
