"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ClaudeSidebarPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_child_process = require("child_process");
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_path = __toESM(require("path"), 1);
var VIEW_TYPE_CLAUDE = "niki-ai-sidebar-view";
var DEFAULT_SETTINGS = {
  claudeCommand: "",
  defaultPrompt: "You are Niki AI embedded in Obsidian (powered by Claude Code). Help me edit Markdown notes.\nWhen you propose changes, be explicit and keep the style consistent.",
  workingDir: ""
};
var ClaudeSidebarPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_CLAUDE, (leaf) => {
      return new ClaudeSidebarView(leaf, this);
    });
    this.addRibbonIcon("bot", "Open Niki AI Sidebar", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-niki-ai-sidebar",
      name: "Open Niki AI Sidebar",
      callback: () => this.activateView()
    });
    this.addSettingTab(new ClaudeSidebarSettingTab(this.app, this));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLAUDE);
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_CLAUDE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var ClaudeSidebarView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.messages = [];
    this.loaded = false;
    // 新增：@ 文件相关
    this.mentionedFiles = [];
    this.handleOutsideClick = (e) => {
      if (this.filePickerEl && !this.filePickerEl.contains(e.target) && !this.inputEl.contains(e.target)) {
        this.hideFilePicker();
      }
    };
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_CLAUDE;
  }
  getDisplayText() {
    return "Niki AI";
  }
  async onOpen() {
    const container = this.containerEl;
    container.empty();
    container.addClass("claude-code-sidebar");
    const header = container.createDiv("claude-code-header");
    header.createDiv({ text: "Niki AI" }).addClass("claude-code-title");
    this.messagesEl = container.createDiv("claude-code-messages");
    const composer = container.createDiv("claude-code-composer");
    this.mentionTagsEl = composer.createDiv("claude-code-mention-tags");
    const topRow = composer.createDiv("claude-code-top-row");
    const controls = topRow.createDiv("claude-code-controls");
    const includeNoteWrap = controls.createDiv("claude-code-toggle");
    this.includeNoteEl = includeNoteWrap.createEl("input", {
      type: "checkbox"
    });
    includeNoteWrap.createEl("span", { text: "Include current note" });
    const actions = topRow.createDiv("claude-code-actions");
    const sendBtn = actions.createEl("button", {
      text: "Send",
      cls: "mod-cta"
    });
    const clearBtn = actions.createEl("button", { text: "Clear" });
    this.inputEl = composer.createEl("textarea", {
      cls: "claude-code-input",
      attr: { placeholder: "Ask Niki AI..." }
    });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.handleSend();
      }
    });
    this.inputEl.addEventListener("input", (event) => {
      const target = event.target;
      const value = target.value;
      const cursorPos = target.selectionStart;
      if (cursorPos > 0 && value[cursorPos - 1] === "@" && (cursorPos === 1 || value[cursorPos - 2] === " ")) {
        const activeFile = this.getActiveFile();
        if (activeFile) {
          this.addMentionedFile(activeFile);
          target.value = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
          target.setSelectionRange(cursorPos - 1, cursorPos - 1);
          this.showFilePicker();
        }
      }
    });
    this.inputEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      this.inputEl.addClass("claude-code-input-dragover");
    });
    this.inputEl.addEventListener("dragleave", () => {
      this.inputEl.removeClass("claude-code-input-dragover");
    });
    this.inputEl.addEventListener("drop", async (event) => {
      event.preventDefault();
      this.inputEl.removeClass("claude-code-input-dragover");
      const transfer = event.dataTransfer;
      if (!transfer)
        return;
      try {
        const jsonData = transfer.getData("text/plain");
        if (jsonData) {
          const data = JSON.parse(jsonData);
          if (data.type === "file" && data.file) {
            const file = this.app.vault.getAbstractFileByPath(data.file.path);
            if (file instanceof import_obsidian.TFile) {
              this.addMentionedFile(file);
              new import_obsidian.Notice(`\u5DF2\u6DFB\u52A0: ${file.basename}`);
              return;
            }
          }
        }
      } catch (e) {
      }
      const files = transfer.files;
      if (!files || files.length === 0)
        return;
      for (const file of Array.from(files)) {
        const filePath = file.path || file.name;
        if (!filePath)
          continue;
        const vaultFile = this.app.vault.getMarkdownFiles().find(
          (f) => filePath.endsWith(f.path) || f.path.endsWith(filePath) || f.basename === file.name.replace(/\.[^/.]+$/, "")
        );
        if (vaultFile) {
          this.addMentionedFile(vaultFile);
          new import_obsidian.Notice(`\u5DF2\u6DFB\u52A0: ${vaultFile.basename}`);
        } else {
          try {
            const fs2 = require("fs");
            if (fs2.existsSync(filePath)) {
              const content = await fs2.promises.readFile(filePath, "utf-8");
              const tempFile = {
                path: filePath,
                basename: file.name.replace(/\.[^/.]+$/, ""),
                // 添加一个特殊标记，表示这是外部文件
                stat: { size: content.length, mtime: Date.now(), ctime: Date.now() }
              };
              this.addMentionedFile(tempFile);
              new import_obsidian.Notice(`\u5DF2\u6DFB\u52A0\u5916\u90E8\u6587\u4EF6: ${tempFile.basename}`);
            }
          } catch (error) {
            new import_obsidian.Notice(`\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6: ${file.name}`);
            console.error("Failed to read dropped file:", error);
          }
        }
      }
    });
    sendBtn.addEventListener("click", () => this.handleSend());
    clearBtn.addEventListener("click", () => this.clearChat());
    this.loaded = true;
    this.renderMessages();
  }
  async onClose() {
    this.loaded = false;
  }
  async handleSend() {
    const content = this.inputEl.value.trim();
    if (!content && this.mentionedFiles.length === 0) {
      return;
    }
    this.inputEl.value = "";
    this.addMessage({ role: "user", content });
    this.clearMentionTags();
    const prompt = await this.buildPrompt(content);
    const pendingMessage = {
      role: "assistant",
      content: "Niki \u6B63\u5728\u601D\u8003...",
      isPending: true
    };
    this.messages.push(pendingMessage);
    this.renderMessages();
    this.scrollToBottom();
    try {
      const reply = await this.runClaudeCommand(prompt);
      if (!reply || reply.trim() === "") {
        pendingMessage.content = "(empty response)";
        pendingMessage.isError = true;
      } else {
        pendingMessage.content = reply.trim();
      }
      pendingMessage.isPending = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run Claude command.";
      pendingMessage.content = `\u9519\u8BEF\uFF1A\u65E0\u6CD5\u8FDE\u63A5\u5230 Claude CLI\u3002

\u8BF7\u68C0\u67E5\uFF1A
1. Claude CLI \u662F\u5426\u5DF2\u6B63\u786E\u5B89\u88C5\uFF1A
   npm install -g @anthropic-ai/claude-code
2. \u547D\u4EE4\u662F\u5426\u5728\u7EC8\u7AEF\u4E2D\u53EF\u4EE5\u6B63\u5E38\u8FD0\u884C
3. \u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u7684 Claude command \u914D\u7F6E

\u8BE6\u7EC6\u9519\u8BEF\uFF1A${message}`;
      pendingMessage.isError = true;
      pendingMessage.isPending = false;
    }
    this.renderMessages();
    this.scrollToBottom();
  }
  clearChat() {
    this.messages = [];
    this.renderMessages();
  }
  addMessage(message) {
    this.messages.push(message);
    this.renderMessages();
    this.scrollToBottom();
  }
  async buildPrompt(userInput) {
    const parts = [];
    const system = this.plugin.settings.defaultPrompt.trim();
    if (system) {
      parts.push(`[System]
${system}`);
    }
    if (this.mentionedFiles.length > 0) {
      const filePaths = this.mentionedFiles.map((f) => f.path).join(", ");
      parts.push(`[@ Referenced files: ${filePaths}]`);
    }
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile && !this.mentionedFiles.some((f) => f.path === activeFile.path)) {
        parts.push(`[@ Current note: ${activeFile.path}]`);
      }
    }
    const history = this.messages.filter((msg) => msg.role !== "system").map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n");
    if (history) {
      parts.push(`[Conversation]
${history}`);
    }
    parts.push(`[User]
${userInput}`);
    return parts.join("\n\n");
  }
  runClaudeCommand(prompt) {
    const configured = this.plugin.settings.claudeCommand.trim();
    const normalized = normalizeCommand(configured);
    const detectedClaude = configured ? "" : findClaudeBinary();
    const basePath = this.getVaultBasePath();
    const cwd = this.plugin.settings.workingDir.trim() || basePath || void 0;
    const env = buildEnv();
    const timeoutMs = 12e4;
    if (normalized) {
      const hasPlaceholder = normalized.includes("{prompt}");
      const finalCommand = hasPlaceholder ? replacePlaceholder(normalized, prompt) : normalized;
      return new Promise((resolve, reject) => {
        const child = (0, import_child_process.exec)(
          finalCommand,
          { cwd, maxBuffer: 1024 * 1024 * 10, env, timeout: timeoutMs },
          (error, stdout, stderr) => {
            if (error) {
              reject(new Error(stderr || error.message));
              return;
            }
            resolve(stdout || stderr);
          }
        );
        if (!hasPlaceholder && child.stdin) {
          child.stdin.write(prompt);
          child.stdin.end();
        }
      });
    }
    if (detectedClaude) {
      const useNodeShim = isNodeScript(detectedClaude);
      const systemNode = useNodeShim ? findNodeBinary() : "";
      const command = useNodeShim ? systemNode || process.execPath : detectedClaude;
      const args = useNodeShim ? [detectedClaude] : [];
      return new Promise((resolve, reject) => {
        const child = (0, import_child_process.execFile)(
          command,
          args,
          { cwd, maxBuffer: 1024 * 1024 * 10, env, timeout: timeoutMs },
          (error, stdout, stderr) => {
            if (error) {
              reject(new Error(stderr || error.message));
              return;
            }
            resolve(stdout || stderr);
          }
        );
        if (child.stdin) {
          child.stdin.write(prompt);
          child.stdin.end();
        }
      });
    }
    new import_obsidian.Notice(
      "\u672A\u627E\u5230 Claude CLI\u3002\u8BF7\u5728\u8BBE\u7F6E\u91CC\u586B\u5199 Claude command\uFF0C\u6216\u628A claude \u52A0\u5165 PATH\u3002"
    );
    return Promise.resolve(
      "Claude CLI not found. Configure Claude command or add claude to PATH."
    );
  }
  getActiveFile() {
    const file = this.app.workspace.getActiveFile();
    return file != null ? file : null;
  }
  getVaultBasePath() {
    var _a, _b;
    const adapter = this.app.vault.adapter;
    if ("getBasePath" in adapter) {
      return (_b = (_a = adapter.getBasePath) == null ? void 0 : _a.call(adapter)) != null ? _b : null;
    }
    return null;
  }
  async insertIntoActiveFile(content) {
    const file = this.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("No active note to insert into.");
      return;
    }
    const existing = await this.app.vault.read(file);
    await this.app.vault.modify(file, `${existing}

${content.trim()}
`);
    new import_obsidian.Notice(`Inserted into ${file.path}`);
  }
  async renderMessages() {
    if (!this.loaded) {
      return;
    }
    this.messagesEl.empty();
    if (this.messages.length === 0) {
      this.messagesEl.createDiv({
        text: "Start a conversation with Niki AI.",
        cls: "claude-code-empty"
      });
      return;
    }
    for (const message of this.messages) {
      const wrapper = this.messagesEl.createDiv("claude-code-message");
      wrapper.addClass(`is-${message.role}`);
      if (message.isError) {
        wrapper.addClass("is-error");
      }
      if (message.isPending) {
        wrapper.addClass("is-pending");
      }
      const roleEl = wrapper.createDiv({
        text: message.role === "user" ? "You" : "Niki",
        cls: "claude-code-role"
      });
      const contentEl = wrapper.createDiv("claude-code-content");
      if (message.isPending) {
        const thinking = contentEl.createSpan("claude-code-thinking");
        thinking.createSpan({ text: "Niki \u6B63\u5728\u601D\u8003" });
        thinking.createSpan({ cls: "claude-code-thinking-dots" });
      } else {
        try {
          import_obsidian.MarkdownRenderer.render(
            this.app,
            message.content,
            contentEl,
            "",
            this.plugin
          );
        } catch (error) {
          console.error("Failed to render markdown:", error);
          contentEl.createEl("pre", { text: message.content });
        }
      }
      if (message.role === "assistant" && !message.isError && !message.isPending) {
        const actions = wrapper.createDiv("claude-code-message-actions");
        if (!message.codeChanges) {
          message.codeChanges = await this.parseCodeChanges(message);
        }
        if (message.codeChanges.length > 0) {
          const viewChangesBtn = actions.createEl("button", {
            text: message.codeChanges.some((c) => c.applied) ? "Changes applied" : "View changes"
          });
          viewChangesBtn.addEventListener(
            "click",
            () => this.toggleDiffView(wrapper, message)
          );
          const hasUnapplied = message.codeChanges.some((c) => !c.applied);
          if (hasUnapplied) {
            const applyBtn = actions.createEl("button", {
              text: "Apply all changes",
              cls: "mod-cta"
            });
            applyBtn.addEventListener(
              "click",
              () => this.applyAllChanges(message)
            );
          }
        } else {
          const insertBtn = actions.createEl("button", {
            text: "Insert to note"
          });
          insertBtn.addEventListener(
            "click",
            () => this.insertIntoActiveFile(message.content)
          );
        }
      }
    }
  }
  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  // 解析代码块变更
  async parseCodeChanges(message) {
    const codeChanges = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const [, language, content] = match;
      const activeFile = this.getActiveFile();
      if (!activeFile)
        continue;
      const originalContent = await this.app.vault.cachedRead(activeFile);
      codeChanges.push({
        language,
        originalContent,
        newContent: content.trim(),
        blockIndex: blockIndex++
      });
    }
    return codeChanges;
  }
  // 渲染 diff 视图
  renderDiffView(container, diff) {
    var _a;
    const diffContainer = container.createDiv("claude-code-diff-container");
    const header = diffContainer.createDiv("claude-code-diff-header");
    header.createSpan({
      text: `Changes for ${((_a = this.getActiveFile()) == null ? void 0 : _a.path) || "current file"}`,
      cls: "claude-code-diff-file"
    });
    const stats = this.computeDiffStats(diff);
    header.createSpan({
      text: `+${stats.added} -${stats.removed}`,
      cls: "claude-code-diff-stats"
    });
    const diffContent = diffContainer.createDiv("claude-code-diff-content");
    diff.changes.forEach((change) => {
      const lineEl = diffContent.createDiv("claude-code-diff-line");
      lineEl.addClass(`claude-code-diff-${change.type}`);
      const lineNumEl = lineEl.createDiv("claude-code-diff-line-num");
      lineNumEl.setText(
        change.type === "removed" ? `${change.originalLine}` : change.type === "added" ? `${change.newLine}` : `${change.originalLine} \u2192 ${change.newLine}`
      );
      const contentEl = lineEl.createDiv("claude-code-diff-line-content");
      contentEl.setText(change.content);
    });
  }
  computeDiffStats(diff) {
    return diff.changes.reduce(
      (stats, change) => {
        if (change.type === "added")
          stats.added++;
        else if (change.type === "removed")
          stats.removed++;
        return stats;
      },
      { added: 0, removed: 0 }
    );
  }
  // 切换 diff 视图
  async toggleDiffView(wrapper, message) {
    let diffContainer = wrapper.querySelector(
      ".claude-code-diff-container"
    );
    if (diffContainer) {
      diffContainer.toggleClass("claude-code-diff-hidden");
      return;
    }
    if (!message.codeChanges || message.codeChanges.length === 0)
      return;
    const codeChange = message.codeChanges[0];
    const diff = computeDiff(codeChange.originalContent, codeChange.newContent);
    this.renderDiffView(wrapper, diff);
  }
  // 应用代码变更
  async applyCodeChanges(codeChange) {
    const file = this.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("No active file to apply changes to.");
      return;
    }
    try {
      await this.app.vault.modify(file, codeChange.newContent);
      codeChange.applied = true;
      new import_obsidian.Notice(`Changes applied to ${file.path}`);
      this.renderMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      new import_obsidian.Notice(`Failed to apply changes: ${message}`);
    }
  }
  async applyAllChanges(message) {
    if (!message.codeChanges)
      return;
    for (const codeChange of message.codeChanges) {
      if (!codeChange.applied) {
        await this.applyCodeChanges(codeChange);
      }
    }
  }
  // ============ @ 文件相关方法 ============
  // 显示文件选择弹窗
  showFilePicker() {
    if (this.filePickerEl) {
      this.filePickerEl.remove();
    }
    this.filePickerEl = this.containerEl.createDiv("claude-code-file-picker");
    const files = this.app.vault.getMarkdownFiles();
    const activeFile = this.getActiveFile();
    const searchInput = this.filePickerEl.createEl("input", {
      type: "text",
      placeholder: "\u641C\u7D22\u6587\u4EF6...",
      cls: "claude-code-file-search"
    });
    const fileList = this.filePickerEl.createDiv("claude-code-file-list");
    const renderFileList = (filter = "") => {
      fileList.empty();
      const filteredFiles = files.filter(
        (f) => f.path.toLowerCase().includes(filter.toLowerCase())
      );
      for (const file of filteredFiles.slice(0, 10)) {
        const item = fileList.createDiv("claude-code-file-item");
        if (file === activeFile) {
          item.addClass("claude-code-file-active");
        }
        item.createSpan({
          text: file.basename,
          cls: "claude-code-file-name"
        });
        item.createSpan({
          text: file.path,
          cls: "claude-code-file-path"
        });
        item.addEventListener("click", () => {
          this.addMentionedFile(file);
          this.hideFilePicker();
        });
      }
    };
    renderFileList();
    searchInput.addEventListener("input", (e) => {
      const target = e.target;
      renderFileList(target.value);
    });
    setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick);
    }, 0);
  }
  hideFilePicker() {
    if (this.filePickerEl) {
      this.filePickerEl.remove();
      this.filePickerEl = void 0;
    }
    document.removeEventListener("click", this.handleOutsideClick);
  }
  // 添加被 @ 的文件
  addMentionedFile(file) {
    if (this.mentionedFiles.some((f) => f.path === file.path)) {
      return;
    }
    this.mentionedFiles.push(file);
    this.renderMentionTags();
    this.inputEl.focus();
  }
  // 移除被 @ 的文件
  removeMentionedFile(file) {
    this.mentionedFiles = this.mentionedFiles.filter((f) => f.path !== file.path);
    this.renderMentionTags();
  }
  // 渲染 @ 标签
  renderMentionTags() {
    this.mentionTagsEl.empty();
    this.mentionTagsEl.toggleClass("has-tags", this.mentionedFiles.length > 0);
    for (const file of this.mentionedFiles) {
      const tag = this.mentionTagsEl.createDiv("claude-code-mention-tag");
      const icon = tag.createSpan({ cls: "claude-code-mention-icon" });
      icon.setText("@");
      const name = tag.createSpan({
        text: file.basename,
        cls: "claude-code-mention-name"
      });
      const removeBtn = tag.createSpan({
        text: "\xD7",
        cls: "claude-code-mention-remove"
      });
      removeBtn.addEventListener("click", () => this.removeMentionedFile(file));
    }
  }
  // 清空 @ 标签
  clearMentionTags() {
    this.mentionedFiles = [];
    this.renderMentionTags();
  }
};
function normalizeCommand(command) {
  if (!command) {
    return "";
  }
  const trimmed = command.trim();
  if (!trimmed) {
    return "";
  }
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken && isDirectory(firstToken)) {
    const resolved = import_path.default.join(firstToken, "claude");
    return trimmed.replace(firstToken, resolved);
  }
  return trimmed;
}
function findClaudeBinary() {
  const home = import_os.default.homedir();
  const candidates = [
    import_path.default.join(home, ".npm-global", "bin", "claude"),
    import_path.default.join(home, ".local", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude"
  ];
  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return "";
}
function buildEnv() {
  const env = { ...process.env };
  const home = import_os.default.homedir();
  env.HOME = env.HOME || home;
  const nodeBinary = findNodeBinary();
  const nodeDir = nodeBinary ? import_path.default.dirname(nodeBinary) : "";
  const extra = [
    import_path.default.join(home, ".npm-global", "bin"),
    import_path.default.join(home, ".local", "bin"),
    import_path.default.join(home, ".volta", "bin"),
    import_path.default.join(home, ".asdf", "shims"),
    import_path.default.join(home, ".nvm", "versions", "node"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin"
  ];
  const currentPath = env.PATH || "";
  const parts = currentPath.split(import_path.default.delimiter).filter(Boolean);
  const merged = [...nodeDir ? [nodeDir] : [], ...extra, ...parts];
  env.PATH = Array.from(new Set(merged)).join(import_path.default.delimiter);
  return env;
}
function isExecutable(target) {
  try {
    import_fs.default.accessSync(target, import_fs.default.constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}
function isDirectory(target) {
  try {
    return import_fs.default.statSync(target).isDirectory();
  } catch (e) {
    return false;
  }
}
function isNodeScript(target) {
  try {
    const fd = import_fs.default.openSync(target, "r");
    const buffer = Buffer.alloc(200);
    const bytes = import_fs.default.readSync(fd, buffer, 0, buffer.length, 0);
    import_fs.default.closeSync(fd);
    const firstLine = buffer.toString("utf8", 0, bytes).split("\n")[0];
    return firstLine.includes("node");
  } catch (e) {
    return false;
  }
}
function findNodeBinary() {
  const home = import_os.default.homedir();
  const direct = [
    import_path.default.join(home, ".volta", "bin", "node"),
    import_path.default.join(home, ".asdf", "shims", "node"),
    import_path.default.join(home, ".nvm", "versions", "node", "bin", "node"),
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node"
  ];
  for (const candidate of direct) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  const nvmRoot = import_path.default.join(home, ".nvm", "versions", "node");
  try {
    const versions = import_fs.default.readdirSync(nvmRoot).map((entry) => import_path.default.join(nvmRoot, entry, "bin", "node")).filter((candidate) => isExecutable(candidate)).sort();
    if (versions.length > 0) {
      return versions[versions.length - 1];
    }
  } catch (e) {
  }
  return "";
}
var ClaudeSidebarSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Niki AI Sidebar" });
    new import_obsidian.Setting(containerEl).setName("Claude command").setDesc(
      "Command to run Claude Code. Use {prompt} to inline the prompt, or leave it out to send via stdin."
    ).addText(
      (text) => text.setPlaceholder('claude -p "{prompt}"').setValue(this.plugin.settings.claudeCommand).onChange(async (value) => {
        this.plugin.settings.claudeCommand = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Default prompt").setDesc("Prepended to every request.").addTextArea(
      (text) => text.setPlaceholder("You are Claude Code embedded in Obsidian...").setValue(this.plugin.settings.defaultPrompt).onChange(async (value) => {
        this.plugin.settings.defaultPrompt = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Working directory").setDesc("Optional cwd for the Claude command. Defaults to vault path.").addText(
      (text) => text.setPlaceholder("/path/to/vault").setValue(this.plugin.settings.workingDir).onChange(async (value) => {
        this.plugin.settings.workingDir = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
function computeDiff(original, modified) {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  const changes = [];
  const lcs = longestCommonSubsequence(originalLines, modifiedLines);
  let origIdx = 0, modIdx = 0;
  for (const line of lcs) {
    while (origIdx < originalLines.length && originalLines[origIdx] !== line) {
      changes.push({
        type: "removed",
        originalLine: origIdx + 1,
        content: originalLines[origIdx]
      });
      origIdx++;
    }
    while (modIdx < modifiedLines.length && modifiedLines[modIdx] !== line) {
      changes.push({
        type: "added",
        newLine: modIdx + 1,
        content: modifiedLines[modIdx]
      });
      modIdx++;
    }
    if (origIdx < originalLines.length && modIdx < modifiedLines.length) {
      changes.push({
        type: "unchanged",
        originalLine: origIdx + 1,
        newLine: modIdx + 1,
        content: line
      });
      origIdx++;
      modIdx++;
    }
  }
  while (origIdx < originalLines.length) {
    changes.push({
      type: "removed",
      originalLine: origIdx + 1,
      content: originalLines[origIdx]
    });
    origIdx++;
  }
  while (modIdx < modifiedLines.length) {
    changes.push({
      type: "added",
      newLine: modIdx + 1,
      content: modifiedLines[modIdx]
    });
    modIdx++;
  }
  return { changes };
}
function longestCommonSubsequence(arr1, arr2) {
  const m = arr1.length, n = arr2.length;
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  for (let i2 = 1; i2 <= m; i2++) {
    for (let j2 = 1; j2 <= n; j2++) {
      dp[i2][j2] = arr1[i2 - 1] === arr2[j2 - 1] ? dp[i2 - 1][j2 - 1] + 1 : Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
    }
  }
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return lcs;
}
function replacePlaceholder(command, prompt) {
  if (/"\{prompt\}"/.test(command)) {
    const escaped2 = prompt.replace(/\\/g, "\\\\").replace(/\$/g, "\\$").replace(/`/g, "\\`").replace(/"/g, '\\"').replace(/\n/g, " ").replace(/\r/g, " ");
    return command.replace(/"\{prompt\}"/g, `"${escaped2}"`);
  }
  if (/'\{prompt\}'/.test(command)) {
    const escaped2 = prompt.replace(/'/g, "'\\''");
    return command.replace(/'\{prompt\}'/g, `'${escaped2}'`);
  }
  const escaped = prompt.replace(/'/g, "'\\''");
  return command.replace(/\{prompt\}/g, `'${escaped}'`);
}
