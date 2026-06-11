# Handoff

## Current State

ChatGPT Context Saver is a Manifest V3 Chrome extension with a content script, popup UI, and minimal background service worker. The extension extracts ChatGPT conversation messages from the page, formats them, and downloads TXT, Markdown, or PDF files through the Chrome Downloads API.

## Important Context

- The project uses vanilla JavaScript, HTML/CSS, local runtime libraries in `lib/`, pdfmake, and Noto Emoji.
- No framework or build step is part of the extension runtime.
- Content script targets `chatgpt.com` and `chat.openai.com`.
- Follow `docs/architecture.md`, `docs/code-style.md`, `docs/git-workflow.md`, `docs/testing.md`, `docs/dependencies.md`, and `docs/deployment.md` for project rules.
- Do not add production dependencies or delete files without explicit confirmation.

## Recent Changes

- Set up file-based project memory in `project-memory/`.
- Updated root `AGENTS.md` to point Codex to memory files and the existing documentation map.

## Next Focus

Inspect the current modified worktree before any code task, then continue from the user's requested priority.

## Links

- See project-memory/TODO.md
- See project-memory/decisions.md
