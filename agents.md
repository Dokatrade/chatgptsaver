# Project Instructions

## Project

ChatGPT Context Saver is a Chrome extension (Manifest V3) for saving long ChatGPT conversations to TXT, Markdown, or PDF.

Stack: vanilla JavaScript, HTML/CSS, Chrome Extensions API, pdfmake, Noto Emoji.

## Memory files

This project uses file-based memory.

Before substantial work, read:

- project-memory/HANDOFF.md
- project-memory/TODO.md
- project-memory/decisions.md
- project-memory/chat-notes.md

## File roles

- AGENTS.md = short instruction file and map for Codex.
- project-memory/HANDOFF.md = current project state.
- project-memory/TODO.md = current task queue.
- project-memory/decisions.md = important decisions.
- project-memory/chat-notes.md = compressed notes from chats.

## Documentation map

Before code changes, read the relevant docs:

- docs/architecture.md = extension architecture and data flow.
- docs/code-style.md = formatting, naming, DOM, comments, errors.
- docs/git-workflow.md = Conventional Commits and repository workflow.
- docs/testing.md = manual Chrome testing checklist and debugging notes.
- docs/dependencies.md = npm packages, local libraries, fonts, VFS rebuild rules.
- docs/deployment.md = local install, versioning, archive preparation.

## Language

Answer in English unless the user explicitly asks for another language.

## Work rules

- Do not rewrite unrelated files.
- Preserve the existing project style.
- Before changing code, inspect the existing structure.
- Prefer small, reviewable changes.
- Run relevant checks after code changes when possible.
- Do not add new production dependencies without explicit approval.
- Do not delete files unless the user clearly requested it.

## After substantial work

After every substantial change, improvement, refactor, fix, setup step, or completed task:

- Update project-memory/HANDOFF.md if the current state, architecture, setup, workflow, or important context changed.
- Update project-memory/TODO.md if tasks were added, completed, removed, reprioritized, or clarified.
- Add a short entry to project-memory/decisions.md if an important technical, architectural, workflow, dependency, deployment, or tooling decision was made.
- Add a compressed summary to project-memory/chat-notes.md if the conversation produced useful context for future Codex sessions.

Do not update memory files for trivial changes that do not affect project state, tasks, decisions, or future context.

Keep all memory updates short, factual, and useful.
Do not paste full chats.
Do not invent project history.
