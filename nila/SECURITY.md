# Security Policy

Nila runs locally on your machine and is designed to keep your data and system
safe. This document explains the security model and how to report issues.

## Security model

- **Process isolation.** The renderer runs with `contextIsolation` enabled and
  no direct Node.js access. It communicates with the privileged main process
  only through a small, typed `contextBridge` API (`window.nila`). There is no
  `nodeIntegration` and no raw `ipcRenderer` exposed.
- **Encrypted secrets.** Your Anthropic API key is stored using the operating
  system's secure storage (Electron `safeStorage`) and is never sent to the
  renderer — the UI only learns whether a key is configured. If the OS keyring
  is unavailable, Nila warns and falls back to local storage.
- **Sandboxed file access.** File tools and desktop automation are confined to
  the configured workspace folder; paths that escape it are rejected. Only
  user-chosen paths from native dialogs are trusted.
- **Human-in-the-loop automation.** The assistant can *propose* desktop actions
  (shell commands, opening files/URLs, workspace file changes), but nothing runs
  until you explicitly approve it. Every task is recorded in a local audit log.
- **Validated IPC.** All input crossing the process boundary is validated and
  range-checked; only `http(s)` URLs may be opened externally or rendered as
  links.
- **Strict CSP.** The renderer forbids remote scripts, styles, and connections;
  all assets are bundled locally.

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**.
Instead, email the maintainers with:

- a description of the vulnerability and its impact,
- steps to reproduce, and
- any suggested remediation.

We aim to acknowledge reports within a few days and will keep you updated on the
fix. Thank you for helping keep Nila and its users safe.

## Supported versions

Nila is pre-1.0; security fixes land on the latest `main`. Please update to the
newest release before reporting an issue.
