# Nila

![Nila CI](https://github.com/anulaavanya-svg/SECONDCHANCEOS/actions/workflows/nila-ci.yml/badge.svg)

A polished, cross-platform **desktop AI assistant** built with Electron, React,
and TypeScript. Nila chats, listens and speaks, remembers you across sessions,
helps with code, researches the live web, sees your screen, manages files in a
sandboxed workspace, and — only with your explicit approval — takes actions on
your machine.

Nila lives in its own `nila/` folder inside this repository and is completely
independent of the SecondChanceOS web platform; nothing here touches that app.

---

## Features

| Capability | How it works |
|---|---|
| **AI chat** | Streaming responses from Claude with a full agentic tool loop, plus one-click regenerate. |
| **Voice** | Push-to-talk dictation and spoken replies via the Web Speech API. |
| **Persistent memory** | Long-term facts stored in SQLite and injected into every prompt. Browse/edit them in the Memory panel. |
| **Coding help** | Read/write files in a sandboxed workspace; Markdown + code rendering. |
| **Browser research** | Live web research using Claude's server-side `web_search` tool, with cited sources. |
| **Screenshot analysis** | Capture your screen (or attach an image) and ask Nila about it. |
| **File management** | Sandboxed read/write/list, plus native open/save dialogs. |
| **Desktop automation** | Nila *proposes* actions (shell, open, file ops); you approve before anything runs. |
| **Conversation search** | Full-text search across titles and message content, with snippets, from the sidebar. |
| **Command palette** | `Cmd/Ctrl+K` fuzzy search over actions and conversations. |
| **Slash commands** | Type `/` in the composer for `/research`, `/automate`, `/files`, `/remember`, `/screenshot`, `/new`, and more. |

## Central intelligence architecture

Nila is the **only** assistant the user talks to. Behind that single voice, a
core orchestration layer delegates specialized work to hidden agents and
synthesizes their results into one consistent answer.

```
        USER
          │            one voice · one memory · one relationship
     ┌────▼─────┐
     │ NILA CORE │  personality · memory · decisions · final responses
     └────┬─────┘
          │ delegates focused objectives, reviews results
   ┌──────┼───────────────────────────────────────────────┐
   ▼      ▼        ▼         ▼          ▼         ▼         ▼
 Research Coding  Vision  Automation  Planning  Memory  Security   (hidden agents)
   │      │        │         │          │         │         │
   └──────┴────────┴─────────┴──────────┴─────────┴─────────┘
                    capability layer (memory · files · web · screen · actions)
```

- **Nila Core** (`services/anthropic.ts`) owns personality, memory, and the final
  response. It keeps `remember`/`recall` for itself and exposes one delegation
  tool per available agent.
- **Agents** (`agents/definitions.ts`) are internal specialists with their own
  focused prompt and a narrow capability subset. They never stream to the user,
  never address the user, and never delegate further — orchestration stays
  centralized, so there is no agent-to-agent recursion.
- **The orchestrator** (`agents/orchestrator.ts`) decides which agents Nila may
  use (gated by the per-turn Research/Files/Automate toggles, plus always-on
  Vision/Planning/Memory/Security), runs them, and returns their output to Nila
  to review, combine, and speak. The user only ever sees Nila.

```
nila/
├── src/
│   ├── main/                 # Electron main process (Node)
│   │   ├── index.ts          # App lifecycle + window
│   │   ├── container.ts      # Composition root (wires all services)
│   │   ├── agents/           # Orchestrator, agent runner, agent definitions
│   │   ├── ipc/              # Typed IPC handlers
│   │   ├── services/         # config, database, anthropic (core), tools, research…
│   │   └── automation/       # Propose → approve → execute pipeline
│   ├── preload/              # Secure contextBridge → window.nila
│   ├── renderer/             # React UI
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── state/store.tsx
│   │       ├── components/   # Sidebar, ChatView, Composer, modals…
│   │       └── lib/          # markdown, voice, formatting
│   └── shared/               # Types + IPC contract shared by both sides
└── electron.vite.config.ts
```

**Security model**

- The renderer runs with `contextIsolation` on and no Node access; it talks to
  the main process only through the typed `window.nila` bridge.
- The API key is stored **encrypted** on-device via Electron `safeStorage` and
  never sent to the renderer — the UI only learns whether a key is configured.
- File tools and automation are **confined to the workspace folder**. Paths that
  escape it are rejected. User-chosen paths (native dialogs) are trusted.
- Every desktop action is **proposed and requires explicit approval** before it
  runs (toggleable, on by default). All tasks are recorded in an audit log.

## Getting started

> Requires Node 18+ and an [Anthropic API key](https://console.anthropic.com/settings/keys).

```bash
cd nila
npm run setup        # install dependencies + run environment diagnostics
npm run dev          # launch in development with hot reload
```

`npm run setup` installs everything and runs `npm run doctor`, which checks your
Node version, native modules, and Electron, and prints actionable hints for
anything missing. You can re-run diagnostics any time with `npm run doctor`.

On first launch, click **Add API key** (or open **Settings**) and paste your
key. You can also set `ANTHROPIC_API_KEY` in the environment to override it.

### Scripts

| Script | Description |
|---|---|
| `npm run setup` | Install dependencies and run diagnostics. |
| `npm run doctor` | Check the local environment is ready. |
| `npm run dev` | Run the app with hot-reloading. |
| `npm run build` | Typecheck, then bundle main/preload/renderer into `out/`. |
| `npm run typecheck` | Typecheck the Node and web projects. |
| `npm test` | Run the Vitest unit suite. |
| `npm run lint` | Lint with ESLint. |
| `npm run start` | Preview the production build. |
| `npm run dist` | Package installers with electron-builder. |

## Keyboard shortcuts

Driven by the native application menu, so they work on every platform:

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Command palette (search actions & conversations) |
| `Cmd/Ctrl + N` | New chat |
| `Cmd/Ctrl + E` | Export conversation to Markdown |
| `Cmd/Ctrl + M` | Open the Memory panel |
| `Cmd/Ctrl + ,` | Open Settings |
| `Cmd/Ctrl + Shift + L` | Toggle light/dark theme |

## Configuration

Settings are stored in the OS-standard app-data directory (e.g.
`~/.config/nila` on Linux). Override with `NILA_DATA_DIR`.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | API key (overrides the in-app key). |
| `NILA_MODEL` | Default model id (`claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`). |
| `NILA_DATA_DIR` | Custom data/config directory. |

## Tech stack

- **Electron 33** + **electron-vite** for the desktop shell and build.
- **React 18** + **TypeScript** for the UI (dependency-free Markdown renderer).
- **better-sqlite3** for conversations, messages, memory, and the automation log.
- **@anthropic-ai/sdk** for streaming chat, tools, vision, and web research.
- **Web Speech API** for voice input and spoken output.

## Testing

`npm test` runs the Vitest suite (unit + integration, 90+ tests):

- **Database (integration)** — conversations, messages with image/tool
  round-trips, memory upsert/search/ranking, conversation search, and the
  automation audit log, against an in-memory SQLite database.
- **Automation (integration)** — the propose → approve/reject/cancel lifecycle
  and the shell executor.
- **Orchestration** — agent gating in Nila's tool surface, direct-capability vs.
  agent-delegation routing, and objective validation.
- **Capability registry** — name-based spec selection and memory-tool dispatch.
- **Input validation** — the IPC boundary validators and range clamping.
- **Workspace sandboxing** — path-traversal escapes are rejected; trusted
  (user-picked) paths are allowed.
- **Memory formatting** — the long-term-memory prompt block grouping/empty state.
- **Markdown export** — role headings, tool footnotes, and safe filenames.
- **Search** — snippet generation and SQL-`LIKE` pattern escaping.
- **Fuzzy matching** — command-palette subsequence scoring and ranking.
- **Slash commands** — parsing, prefix matching, and modifier/action resolution.
- **Formatting utilities** — relative time, byte sizes, and history buckets.

## License

MIT
