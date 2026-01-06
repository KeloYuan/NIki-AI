# Changelog

All notable changes to Niki AI will be documented in this file.

## [4.0.0] - 2025-01-05

### Major Features
- **Multi-Assistant Preset System**: Add multiple AI assistant presets and switch between them quickly
- Each assistant has independent system prompts and identity configurations
- Settings UI for managing assistants (add, edit, delete)
- Compact assistant selector in sidebar next to send button

### Improvements
- **Send/Stop Button**: Send button transforms to "Stop/Interrupt" button during AI response generation
- Prevent sending multiple messages simultaneously while AI is responding
- Process interruption capability to stop ongoing AI responses
- **Settings Persistence**: Debounced save (500ms) to prevent excessive disk writes
- Visual feedback (green border flash) when settings are saved
- Settings properly load on re-render

### Bug Fixes
- Fixed IME input compatibility - prevent accidental send when confirming input with Enter key
- Fixed settings not persisting when adding new assistants
- Fixed prompt loading when settings UI is re-rendered

### UI Enhancements
- Compact assistant selector (120px width) positioned next to send button
- Hover and focus states for better user experience
- Save confirmation visual feedback

## [3.0.0] - Previous Release

### Features
- Chat with Claude Code in sidebar
- File context support via @ mentions
- Code diff viewer
- Topic management
- Multi-language support (Chinese/English)
- Theme adaptive styling
