# Contributing to Nila

Thanks for your interest in improving Nila! This guide covers everything you
need to get productive quickly.

## Development setup

```bash
cd nila
npm run setup     # install + diagnostics
npm run dev       # hot-reloading dev build
```

You'll need Node 18+ and, to use AI features, an Anthropic API key (add it in
Settings after launch, or export `ANTHROPIC_API_KEY`).

## Project layout

| Path | Purpose |
|---|---|
| `src/main` | Electron main process: services, IPC, automation, persistence |
| `src/main/agents` | Nila's orchestration layer and hidden specialized agents |
| `src/preload` | The `contextBridge` that exposes `window.nila` |
| `src/renderer` | React UI (components, state store, lib helpers) |
| `src/shared` | Types + IPC contract shared by both processes |
| `test` | Vitest unit + integration tests |

## Before you open a PR

Run the full local gate — the same checks CI enforces:

```bash
npm run typecheck   # strict TypeScript, both projects
npm run lint        # ESLint
npm test            # Vitest unit + integration
npm run build       # electron-vite production build
```

All four must pass. CI (`.github/workflows/nila-ci.yml`) runs them on every push
that touches `nila/`.

## Conventions

- **TypeScript everywhere**, `strict` mode. No `any` without a clear reason.
- **The renderer never imports Node/Electron.** All privileged work goes through
  a typed IPC handler and the preload bridge. Add new surface to
  `src/shared/ipc-channels.ts`, `src/shared/api.ts`, the handler, and the
  preload together so the contract can't drift.
- **Validate untrusted input** at the IPC boundary using
  `src/main/services/validation.ts`.
- **Keep logic testable.** Prefer small pure functions (like `lib/slash.ts`,
  `services/search.ts`) and cover them with unit tests.
- **Security first.** File and automation access stays confined to the
  workspace; desktop actions always require user approval.

## Commit messages

Write clear, imperative commit subjects ("Add conversation search", not
"added search"). Explain the "why" in the body when it isn't obvious.

## Reporting bugs

Open an issue with your OS, Node version (`node -v`), the output of
`npm run doctor`, and steps to reproduce.
