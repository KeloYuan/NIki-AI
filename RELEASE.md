# Niki AI

<!-- Plugin description -->
Chat with Claude Code in a sidebar and edit notes with AI assistance.

## Usage

1. Install [Claude Code CLI](https://github.com/anthropics/claude-code) first:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Configure the Claude command path in plugin settings if auto-detection fails.

3. Open the Niki AI sidebar from the ribbon icon or command palette.

4. Start chatting with Claude! You can include current note content as context.

## Features

- **Chat with Claude Code**: Integrated sidebar interface for conversations
- **File Context**: Drag and drop files or use `@` to mention specific files
- **Code Diff Viewer**: View and apply code changes suggested by Claude
- **Topic Management**: Organize conversations into topics
- **Undo Support**: Undo applied changes
- **Multi-language**: Support for Chinese and English
- **Theme Adaptive**: Automatically follows light/dark theme settings

## Settings

- **Claude command**: Command to run Claude Code (e.g., `claude -p "{prompt}"`)
- **Claude path**: Full path to Claude CLI executable (auto-detected if empty)
- **Node path**: Full path to Node executable (auto-detected if empty)
- **Default prompt**: System prompt prepended to every request
- **Working directory**: Working directory for Claude commands

## Requirements

- Desktop only (requires Node.js for Claude Code CLI)
- Claude Code CLI must be installed separately

## Author

小元Niki（谢旺涛）

## License

MIT
