# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Niki AI** is an Obsidian plugin that integrates Claude Code CLI as a conversational AI assistant in the Obsidian sidebar. Users can chat with Claude, include current note content as context, and insert responses directly into their notes.

**Architecture:** Single-file TypeScript plugin ([main.ts](main.ts)) that follows Obsidian's plugin lifecycle pattern. The plugin executes Claude Code CLI locally via Node.js child processes.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode with incremental builds
npm run build        # Production build (one-time)
```

**Build output:** `main.js` (bundled CommonJS)

**Installation to Obsidian:** After building, copy these files to `.obsidian/plugins/niki-ai/` in your vault:
- `main.js`
- `manifest.json`
- `styles.css`

Then enable the plugin in Obsidian's settings.

## Code Architecture

### File Structure
```
├── main.ts              # All source code (plugin, view, settings)
├── styles.css           # UI styling
├── manifest.json        # Plugin metadata
├── esbuild.config.mjs   # Build configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # NPM scripts
```

### Core Classes

**ClaudeSidebarPlugin** ([main.ts:40](main.ts#L40-L88))
- Main plugin class extending `Plugin`
- Manages plugin lifecycle: `onload()`, `onunload()`
- Registers sidebar view, ribbon icon, and command palette entry
- Handles settings persistence via `loadData()` / `saveData()`

**ClaudeSidebarView** ([main.ts:90](main.ts#L90))
- Extends `ItemView`, renders the sidebar UI
- Manages chat state (`messages: ChatMessage[]`)
- Handles user input and executes Claude CLI
- Renders messages using Obsidian's `MarkdownRenderer.render()`

**ClaudeSidebarSettingTab** ([main.ts:400+](main.ts#L400))
- Settings UI configuration
- Three settings: `claudeCommand`, `defaultPrompt`, `workingDir`

### State Management

**Chat State** (`ChatMessage` type):
- In-memory array, **not persisted** (lost on reload)
- Messages have `role`, `content`, optional `isError`, `isPending`
- Append-only model

**Settings State** (`ClaudeSidebarSettings`):
- Persistent storage via Obsidian API
- Default values defined in `DEFAULT_SETTINGS`

### Claude CLI Integration

The plugin supports two command patterns (configured in settings):

1. **Inline mode:** `claude -p "{prompt}"` - Prompt passed via CLI argument
2. **Stdin mode:** `claude` - Prompt piped to stdin

**Execution details:**
- Uses Node.js `child_process.exec()` or `execFile()`
- 2-minute timeout, 10MB buffer limit
- Auto-detects Claude binary in common locations:
  - `~/.npm-global/bin/claude`
  - `~/.local/bin/claude`
  - `/opt/homebrew/bin/claude`
  - `/usr/local/bin/claude`
  - `/usr/bin/claude`
- Builds custom PATH for Node version managers (nvm, n, fnm)

**Context building** ([`buildPrompt()`](main.ts#L200)):
```
[System]
{defaultPrompt}

[Current Note: {path}]
{note content if "Include current note" checked}

[Conversation]
{chat history}

[User]
{user input}
```

### UI Pattern

- Direct DOM manipulation via Obsidian's `containerEl.createDiv()` API
- CSS classes prefixed with `.claude-code-`
- Markdown rendering via `MarkdownRenderer.render(app, content, element, ...)`
- Flexbox-based layout with custom dark theme

## Key Concepts

### Obsidian View System
- Views are registered with `registerView(VIEW_TYPE, factory)`
- Sidebar views use `workspace.getRightLeaf(false)` to open in right sidebar
- `WorkspaceLeaf` represents a UI panel in Obsidian's workspace

### Claude CLI Detection
The plugin parses shebang lines to detect if Claude is a Node.js script, then resolves the appropriate Node binary. This handles installations via npm where the "binary" is actually a shell script.

### File Operations
- Read notes: `app.vault.read(file)`
- Write notes: `app.vault.modify(file, content)`
- Get active note: `app.workspace.getActiveFile()`

## Limitations & Known Issues

- No session persistence (chat history lost on reload)
- No test coverage
- No automated CI/CD
- Tightly coupled to Claude Code CLI (not generic AI provider)

## Planned Enhancements (from README)

- Auto-apply patches
- Session history persistence
- Multi-file context selection
- Claude Code config integration
