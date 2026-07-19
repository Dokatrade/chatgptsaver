# Handoff

## Current State

ChatGPT Context Saver is a Manifest V3 Chrome extension with a content script, popup UI, and minimal background service worker. The extension extracts ChatGPT conversation messages from the page, formats them, and downloads TXT, Markdown, PDF, or EPUB files through the Chrome Downloads API.

## Important Context

- The project uses vanilla JavaScript, HTML/CSS, local runtime libraries in `lib/`, pdfmake, and Noto Emoji.
- No framework or build step is part of the extension runtime.
- Content script targets `chatgpt.com` and `chat.openai.com`.
- Follow `docs/architecture.md`, `docs/code-style.md`, `docs/git-workflow.md`, `docs/testing.md`, `docs/dependencies.md`, and `docs/deployment.md` for project rules.
- Do not add production dependencies or delete files without explicit confirmation.

## Recent Changes

- Set up file-based project memory in `project-memory/`.
- Updated root `AGENTS.md` to point Codex to memory files and the existing documentation map.
- Cleaned memory files to keep only concise project-specific context.
- Updated `.gitignore` for local agent metadata, temporary files, and extension package artifacts.
- Synced README and manifest description with current TXT/Markdown/PDF export support.
- Added `npm test` project integrity checks and `npm run package` zip packaging scripts without new dependencies.
- Split extraction logic into `content/extractor.js` and kept `content/content.js` as the Chrome message bridge.
- Added `jsdom` fixture tests for message extraction edge cases and included them in `npm test`.
- Added EPUB export through `popup/epub.js`, which builds EPUB 3 XHTML/OPF/nav/CSS and an uncompressed ZIP container without new runtime dependencies.
- Added EPUB fixture coverage to `npm test`; `npm test`, `npm run package`, and `unzip -l chatgptsaver.zip` passed after the EPUB change.
- Removed the misleading AZW3/Kindle popup option; EPUB remains the book export format.
- Made export extraction scan the conversation scroll area top-to-bottom and collect hidden-sized message groups so exports are less dependent on the current scroll position.
- Reverted the attempted image embedding work; exports are back to text/Markdown content for PDF and EPUB.
- Fixed Markdown downloads to use `text/markdown` instead of `text/plain`, with an `npm test` integrity check for the MIME type.
- Removed the fixed 80-step scroll cap from virtualized conversation extraction, so long chats continue scanning until the actual scroll end.
- Target the closest scrollable ancestor of a conversation turn instead of the tallest page/sidebar container, and allow additional time for virtualized turns to render.
- Require a conversation ancestor to have scrollable CSS overflow before treating it as the chat viewport; tall message wrappers with visible overflow are ignored.
- Preserve the initially mounted message snapshot before scrolling, then merge it after the scan so newest tail turns are not lost when ChatGPT does not remount them.
- Replaced global `role + content` deduplication during virtualized scans with ordered viewport-snapshot merging, stable message IDs when available, synthetic scroll events, and a repeated final bottom-seek so delayed tail turns are preserved.
- Replaced fixed render waits after programmatic scroll with MutationObserver-based DOM quiescence, added strict bottom stabilization requiring 3 identical bottom states, and added turn-index gap validation with limited automatic rescan.
- Added `docs/extension-mechanics-expert-review.md`, a Russian technical overview and expert assessment of the extension flow, extraction mechanisms, export pipeline, risks, and testing focus.

## Next Focus

Consider the next reliability task: add focused Markdown/PDF formatting tests or review unused packaged runtime libraries in `lib/`.

## Links

- See project-memory/TODO.md
- See project-memory/decisions.md
