# TODO

## Now

- [ ] Continue from the user's next requested project task.

## Next

- [ ] Run the relevant manual or automated checks after future code changes when possible.
- [ ] Add focused tests for Markdown/PDF formatting edge cases.
- [ ] Review whether unused runtime libraries in `lib/` should remain packaged.

## Later

- [ ] Keep project memory concise and update it only after substantial work.

## Done

- [x] Added a standalone Russian expert-review document describing extension mechanics and risks.
- [x] Preserved visible ChatGPT text inside `aria-hidden` and text-bearing inline button elements during extraction.
- [x] Created the initial file-based project memory structure.
- [x] Rechecked memory/documentation files and removed template noise from project memory.
- [x] Updated README and manifest description for TXT/Markdown/PDF support.
- [x] Added dependency-free `npm test` integrity checks and `npm run package` zip packaging.
- [x] Added `jsdom` fixture tests for message extraction edge cases.
- [x] Added EPUB export with fixture coverage and no new runtime dependency.
- [x] Added AZW3/Kindle export option as a valid EPUB source for external AZW3 conversion.
- [x] Removed the misleading AZW3/Kindle export option and kept EPUB as the book export.
- [x] Reduced scroll-position-dependent exports by scanning the conversation scroll area during extraction.
- [x] Reverted the attempted image embedding work and restored text-only PDF/EPUB exports.
- [x] Fixed Markdown export downloads using TXT MIME type by switching `.md` blobs to `text/markdown`.
- [x] Removed the virtualized-conversation scan limit that truncated long exports.
- [x] Made long-chat extraction select the conversation scroller instead of a sidebar or page wrapper.
- [x] Fixed the conversation-scroller regression that selected tall non-scrollable message wrappers.
- [x] Preserved newest messages that exist only in the initial bottom viewport of a very large chat.
- [x] Preserved repeated latest messages in virtualized exports by replacing global content dedupe with ordered snapshot merging.
- [x] Added repeated bottom-seek extraction so ChatGPT tail messages delayed by virtualization are collected before export.
- [x] Added MutationObserver-based DOM quiescence, strict bottom stabilization, turn-index gap validation, and regression coverage for delayed mounting of final conversation turns.
