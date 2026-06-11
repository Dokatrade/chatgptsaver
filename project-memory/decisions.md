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

## Decision Template

### Context

Describe the situation or problem.

### Decision

Describe the decision that was made.

### Reason

Explain why this decision was made.

### Consequences

Describe the expected consequences, trade-offs, or follow-up actions.
