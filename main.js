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
var I18N = {
  "zh-CN": {
    openSidebarCommand: "\u6253\u5F00 Niki AI \u4FA7\u8FB9\u680F",
    sidebarTitle: "Niki AI Sidebar",
    includeCurrentNote: "\u5305\u542B\u5F53\u524D\u7B14\u8BB0",
    send: "\u53D1\u9001",
    clear: "\u6E05\u7A7A",
    inputPlaceholder: "\u5411 Niki AI \u63D0\u95EE...",
    emptyState: "\u5F00\u59CB\u548C Niki AI \u5BF9\u8BDD\u5427\u3002",
    emptyResponse: "(\u65E0\u56DE\u590D)",
    thinkingPending: "Niki \u6B63\u5728\u601D\u8003...",
    thinkingInline: "Niki \u6B63\u5728\u601D\u8003",
    failedRunCommand: "\u8FD0\u884C Claude \u547D\u4EE4\u5931\u8D25\u3002",
    claudeConnectionError: "\u9519\u8BEF\uFF1A\u65E0\u6CD5\u8FDE\u63A5\u5230 Claude CLI\u3002\n\n\u8BF7\u68C0\u67E5\uFF1A\n1. Claude CLI \u662F\u5426\u5DF2\u6B63\u786E\u5B89\u88C5\uFF1A\n   npm install -g @anthropic-ai/claude-code\n2. \u547D\u4EE4\u662F\u5426\u5728\u7EC8\u7AEF\u4E2D\u53EF\u4EE5\u6B63\u5E38\u8FD0\u884C\n3. \u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u7684 Claude command \u914D\u7F6E\n\n\u8BE6\u7EC6\u9519\u8BEF\uFF1A{message}",
    claudeNotFoundNotice: "\u672A\u627E\u5230 Claude CLI\u3002\u8BF7\u5728\u8BBE\u7F6E\u91CC\u586B\u5199 Claude command\uFF0C\u6216\u628A claude \u52A0\u5165 PATH\u3002",
    claudeNotFoundReply: "\u672A\u627E\u5230 Claude CLI\u3002\u8BF7\u5728\u8BBE\u7F6E\u91CC\u586B\u5199 Claude command\uFF0C\u6216\u628A claude \u52A0\u5165 PATH\u3002",
    noActiveNote: "\u5F53\u524D\u6CA1\u6709\u53EF\u63D2\u5165\u7684\u7B14\u8BB0\u3002",
    insertedInto: "\u5DF2\u63D2\u5165\u5230 {path}",
    addedFile: "\u5DF2\u6DFB\u52A0: {name}",
    roleYou: "\u4F60",
    roleNiki: "Niki",
    viewChanges: "\u67E5\u770B\u53D8\u66F4",
    changesApplied: "\u5DF2\u5E94\u7528\u53D8\u66F4",
    changesAppliedTo: "\u5DF2\u5E94\u7528\u53D8\u66F4\u5230 {path}",
    applyAllChanges: "\u5E94\u7528\u5168\u90E8\u53D8\u66F4",
    insertToNote: "\u63D2\u5165\u5230\u7B14\u8BB0",
    copy: "\u590D\u5236",
    copied: "\u5DF2\u590D\u5236",
    noTargetFile: "\u6CA1\u6709\u53EF\u5E94\u7528\u53D8\u66F4\u7684\u76EE\u6807\u6587\u4EF6\u3002",
    failedApplyChanges: "\u5E94\u7528\u53D8\u66F4\u5931\u8D25\uFF1A{message}",
    unknownError: "\u672A\u77E5\u9519\u8BEF",
    searchFilesPlaceholder: "\u641C\u7D22\u6587\u4EF6...",
    settingTitle: "Niki AI Sidebar",
    settingClaudeCommandName: "Claude command",
    settingClaudeCommandDesc: "\u7528\u4E8E\u8FD0\u884C Claude Code \u7684\u547D\u4EE4\u3002\u4F7F\u7528 {prompt} \u5185\u8054\u63D0\u793A\u8BCD\uFF0C\u6216\u7559\u7A7A\u4EE5\u901A\u8FC7 stdin \u53D1\u9001\u3002",
    settingClaudeCommandPlaceholder: 'claude -p "{prompt}"',
    settingDefaultPromptName: "Default prompt",
    settingDefaultPromptDesc: "\u6BCF\u6B21\u8BF7\u6C42\u524D\u81EA\u52A8\u9644\u52A0\u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD\u3002",
    settingDefaultPromptPlaceholder: "\u4F60\u662F\u5D4C\u5165 Obsidian \u7684 Claude Code...",
    settingWorkingDirName: "Working directory",
    settingWorkingDirDesc: "Claude \u547D\u4EE4\u7684\u53EF\u9009\u5DE5\u4F5C\u76EE\u5F55\uFF0C\u9ED8\u8BA4\u4E3A vault \u8DEF\u5F84\u3002",
    settingLanguageName: "Language",
    settingLanguageDesc: "\u754C\u9762\u663E\u793A\u8BED\u8A00\u3002",
    undoChanges: "\u64A4\u9500\u4FEE\u6539",
    undoSuccess: "\u5DF2\u64A4\u9500 {path} \u7684\u4FEE\u6539",
    undoFailed: "\u64A4\u9500\u5931\u8D25\uFF1A{message}"
  },
  "en-US": {
    openSidebarCommand: "Open Niki AI Sidebar",
    sidebarTitle: "Niki AI Sidebar",
    includeCurrentNote: "Include current note",
    send: "Send",
    clear: "Clear",
    inputPlaceholder: "Ask Niki AI...",
    emptyState: "Start a conversation with Niki AI.",
    emptyResponse: "(empty response)",
    thinkingPending: "Niki is thinking...",
    thinkingInline: "Niki is thinking",
    failedRunCommand: "Failed to run Claude command.",
    claudeConnectionError: "Error: Unable to connect to Claude CLI.\n\nPlease check:\n1. Claude CLI is installed:\n   npm install -g @anthropic-ai/claude-code\n2. Command works in terminal\n3. Claude command in settings\n\nDetails: {message}",
    claudeNotFoundNotice: "Claude CLI not found. Configure Claude command or add claude to PATH.",
    claudeNotFoundReply: "Claude CLI not found. Configure Claude command or add claude to PATH.",
    noActiveNote: "No active note to insert into.",
    insertedInto: "Inserted into {path}",
    addedFile: "Added: {name}",
    roleYou: "You",
    roleNiki: "Niki",
    viewChanges: "View changes",
    changesApplied: "Changes applied",
    changesAppliedTo: "Changes applied to {path}",
    applyAllChanges: "Apply all changes",
    insertToNote: "Insert to note",
    copy: "Copy",
    copied: "Copied",
    noTargetFile: "No target file to apply changes to.",
    failedApplyChanges: "Failed to apply changes: {message}",
    unknownError: "Unknown error",
    searchFilesPlaceholder: "Search files...",
    settingTitle: "Niki AI Sidebar",
    settingClaudeCommandName: "Claude command",
    settingClaudeCommandDesc: "Command to run Claude Code. Use {prompt} to inline the prompt, or leave it out to send via stdin.",
    settingClaudeCommandPlaceholder: 'claude -p "{prompt}"',
    settingDefaultPromptName: "Default prompt",
    settingDefaultPromptDesc: "Prepended to every request.",
    settingDefaultPromptPlaceholder: "You are Claude Code embedded in Obsidian...",
    settingWorkingDirName: "Working directory",
    settingWorkingDirDesc: "Optional cwd for the Claude command. Defaults to vault path.",
    settingLanguageName: "Language",
    settingLanguageDesc: "Language for the UI.",
    undoChanges: "Undo changes",
    undoSuccess: "Undone changes to {path}",
    undoFailed: "Undo failed: {message}"
  }
};
function t(language, key) {
  var _a, _b;
  return (_b = ((_a = I18N[language]) != null ? _a : I18N["zh-CN"])[key]) != null ? _b : I18N["zh-CN"][key];
}
function format(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    var _a;
    return (_a = vars[key]) != null ? _a : "";
  });
}
var DEFAULT_SETTINGS = {
  claudeCommand: "",
  defaultPrompt: "You are Niki AI embedded in Obsidian (powered by Claude Code). Help me edit Markdown notes.\nWhen you propose changes, be explicit and keep the style consistent.",
  workingDir: "",
  language: "zh-CN",
  includeCurrentNote: false,
  topics: [],
  currentTopicId: null
};
var ClaudeSidebarPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_CLAUDE, (leaf) => {
      return new ClaudeSidebarView(leaf, this);
    });
    this.addRibbonIcon("bot", this.t("openSidebarCommand"), () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-niki-ai-sidebar",
      name: this.t("openSidebarCommand"),
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
  t(key) {
    return t(this.settings.language, key);
  }
  tf(key, vars) {
    return format(this.t(key), vars);
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
    const topicControl = container.createDiv("claude-code-topic-control");
    const topicSelector = topicControl.createDiv("claude-code-topic-selector");
    this.topicSelectEl = topicSelector.createEl("select", {
      cls: "claude-code-topic-select"
    });
    const topicActions = topicControl.createDiv("claude-code-topic-actions");
    this.newTopicBtn = topicActions.createEl("button", {
      text: "+",
      cls: "claude-code-topic-btn claude-code-topic-new"
    });
    this.newTopicBtn.setAttribute("aria-label", "\u65B0\u5EFA\u8BDD\u9898");
    this.deleteTopicBtn = topicActions.createEl("button", {
      text: "\xD7",
      cls: "claude-code-topic-btn claude-code-topic-delete"
    });
    this.deleteTopicBtn.setAttribute("aria-label", "\u5220\u9664\u8BDD\u9898");
    this.messagesEl = container.createDiv("claude-code-messages");
    const composer = container.createDiv("claude-code-composer");
    this.mentionTagsEl = composer.createDiv("claude-code-mention-tags");
    const topRow = composer.createDiv("claude-code-top-row");
    const controls = topRow.createDiv("claude-code-controls");
    const includeNoteWrap = controls.createDiv("claude-code-toggle");
    this.includeNoteEl = includeNoteWrap.createEl("input", {
      type: "checkbox"
    });
    this.includeNoteEl.checked = this.plugin.settings.includeCurrentNote;
    includeNoteWrap.createEl("span", { text: this.plugin.t("includeCurrentNote") });
    const actions = topRow.createDiv("claude-code-actions");
    const sendBtn = actions.createEl("button", {
      text: this.plugin.t("send"),
      cls: "mod-cta"
    });
    const clearBtn = actions.createEl("button", { text: this.plugin.t("clear") });
    this.inputEl = composer.createEl("textarea", {
      cls: "claude-code-input",
      attr: { placeholder: this.plugin.t("inputPlaceholder") }
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
      console.log("Drop event types:", transfer.types);
      const uriData = transfer.getData("text/plain");
      console.log("URI data:", uriData);
      if (uriData && uriData.startsWith("obsidian://open?")) {
        try {
          const url = new URL(uriData);
          const vaultName = url.searchParams.get("vault");
          const filePath = url.searchParams.get("file");
          console.log("Parsed URI - vault:", vaultName, "file:", filePath);
          if (filePath) {
            const decodedPath = decodeURIComponent(filePath);
            console.log("Decoded path:", decodedPath);
            const fileName = decodedPath.split("/").pop() || decodedPath;
            const file = this.app.vault.getMarkdownFiles().find(
              (f) => f.path === decodedPath || f.path.endsWith(decodedPath) || f.basename === fileName
            );
            if (file) {
              this.addMentionedFile(file);
              new import_obsidian.Notice(this.plugin.tf("addedFile", { name: file.basename }));
              return;
            } else {
              const tempFile = {
                path: decodedPath,
                basename: fileName.replace(/\.md$/, ""),
                extension: "md",
                stat: { mtime: Date.now(), ctime: Date.now(), size: 0 }
              };
              this.addMentionedFile(tempFile);
              new import_obsidian.Notice(this.plugin.tf("addedFile", { name: tempFile.basename }));
              return;
            }
          }
        } catch (e) {
          console.error("Failed to parse Obsidian URI:", e);
        }
      }
      const files = transfer.files;
      console.log("Files from File API:", files);
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const filePath = file.path || file.name;
          console.log("Processing file:", filePath);
          if (!filePath)
            continue;
          const vaultFile = this.app.vault.getMarkdownFiles().find(
            (f) => filePath.endsWith(f.path) || f.path.endsWith(filePath) || f.basename === file.name.replace(/\.[^/.]+$/, "")
          );
          if (vaultFile) {
            this.addMentionedFile(vaultFile);
            new import_obsidian.Notice(this.plugin.tf("addedFile", { name: vaultFile.basename }));
          } else {
            const tempFile = {
              path: filePath,
              basename: file.name.replace(/\.[^/.]+$/, ""),
              extension: file.name.split(".").pop(),
              stat: { mtime: Date.now(), ctime: Date.now(), size: 0 }
            };
            this.addMentionedFile(tempFile);
            new import_obsidian.Notice(this.plugin.tf("addedFile", { name: tempFile.basename }));
          }
        }
      }
    });
    this.includeNoteEl.addEventListener("change", async () => {
      this.plugin.settings.includeCurrentNote = this.includeNoteEl.checked;
      await this.plugin.saveSettings();
    });
    sendBtn.addEventListener("click", () => this.handleSend());
    clearBtn.addEventListener("click", () => this.clearChat());
    this.topicSelectEl.addEventListener("change", async (e) => {
      const target = e.target;
      await this.switchTopic(target.value);
    });
    this.newTopicBtn.addEventListener("click", async () => {
      await this.createTopic();
    });
    this.deleteTopicBtn.addEventListener("click", async () => {
      await this.deleteTopic();
    });
    if (this.plugin.settings.topics.length === 0) {
      await this.createTopic();
    } else {
      const currentTopicId = this.plugin.settings.currentTopicId;
      if (currentTopicId) {
        const topic = this.plugin.settings.topics.find((t2) => t2.id === currentTopicId);
        if (topic) {
          this.messages = [...topic.messages];
        }
      }
    }
    this.renderTopicSelector();
    this.loaded = true;
    this.renderMessages();
  }
  async onClose() {
    await this.saveCurrentTopic();
    this.loaded = false;
  }
  async handleSend() {
    const content = this.inputEl.value.trim();
    if (!content && this.mentionedFiles.length === 0) {
      return;
    }
    this.inputEl.value = "";
    let messageContent = content;
    if (this.mentionedFiles.length > 0) {
      const fileList = this.mentionedFiles.map((f) => `@${f.basename}`).join(", ");
      messageContent = `${fileList}

${content}`;
    }
    this.addMessage({
      role: "user",
      content: messageContent,
      originalInput: content
      // 保存原始输入，用于生成话题标题
    });
    await this.updateTopicTitle();
    const filesToTrack = [...this.mentionedFiles];
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile && !filesToTrack.some((f) => f.path === activeFile.path)) {
        filesToTrack.push(activeFile);
      }
    }
    const beforeTimestamp = Date.now();
    const fileSnapshots = /* @__PURE__ */ new Map();
    for (const file of filesToTrack) {
      try {
        fileSnapshots.set(file.path, await this.app.vault.read(file));
      } catch (e) {
      }
    }
    const prompt = await this.buildPrompt(content);
    this.clearMentionTags();
    const pendingMessage = {
      role: "assistant",
      content: this.plugin.t("thinkingPending"),
      isPending: true
    };
    this.messages.push(pendingMessage);
    this.renderMessages();
    this.scrollToBottom();
    try {
      const reply = await this.runClaudeCommand(prompt);
      if (!reply || reply.trim() === "") {
        pendingMessage.content = this.plugin.t("emptyResponse");
        pendingMessage.isError = true;
      } else {
        pendingMessage.content = reply.trim();
      }
      pendingMessage.isPending = false;
      const modifications = [];
      for (const file of filesToTrack) {
        const beforeContent = fileSnapshots.get(file.path);
        if (!beforeContent)
          continue;
        try {
          const afterContent = await this.app.vault.read(file);
          console.log(`\u68C0\u67E5\u6587\u4EF6 ${file.path}:`, {
            beforeLength: beforeContent.length,
            afterLength: afterContent.length,
            changed: afterContent !== beforeContent
          });
          if (afterContent !== beforeContent) {
            modifications.push({
              filePath: file.path,
              originalContent: beforeContent,
              file,
              timestamp: beforeTimestamp
            });
          }
        } catch (e) {
          console.error(`\u8BFB\u53D6\u6587\u4EF6 ${file.path} \u5931\u8D25:`, e);
        }
      }
      console.log(`\u68C0\u6D4B\u5230 ${modifications.length} \u4E2A\u6587\u4EF6\u88AB\u4FEE\u6539`);
      if (modifications.length > 0) {
        pendingMessage.fileModifications = modifications;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : this.plugin.t("failedRunCommand");
      pendingMessage.content = this.plugin.tf("claudeConnectionError", {
        message
      });
      pendingMessage.isError = true;
      pendingMessage.isPending = false;
    }
    this.renderMessages();
    this.scrollToBottom();
    await this.saveCurrentTopic();
  }
  clearChat() {
    this.messages = [];
    this.renderMessages();
    void this.saveCurrentTopic();
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
      for (const file of this.mentionedFiles) {
        try {
          const content = await this.app.vault.read(file);
          parts.push(`[@ ${file.path}]
${content}`);
        } catch (e) {
          parts.push(`[@ ${file.path}]
(\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6)`);
        }
      }
    }
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile && !this.mentionedFiles.some((f) => f.path === activeFile.path)) {
        try {
          const noteText = await this.app.vault.read(activeFile);
          parts.push(`[@ Current note: ${activeFile.path}]
${noteText}`);
        } catch (e) {
          parts.push(`[@ Current note: ${activeFile.path}]
(\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6)`);
        }
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
      this.plugin.t("claudeNotFoundNotice")
    );
    return Promise.resolve(
      this.plugin.t("claudeNotFoundReply")
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
      new import_obsidian.Notice(this.plugin.t("noActiveNote"));
      return;
    }
    const existing = await this.app.vault.read(file);
    await this.app.vault.modify(file, `${existing}

${content.trim()}
`);
    new import_obsidian.Notice(this.plugin.tf("insertedInto", { path: file.path }));
  }
  async copyToClipboard(content) {
    var _a;
    if ((_a = navigator == null ? void 0 : navigator.clipboard) == null ? void 0 : _a.writeText) {
      await navigator.clipboard.writeText(content);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  async renderMessages() {
    if (!this.loaded) {
      return;
    }
    this.messagesEl.empty();
    if (this.messages.length === 0) {
      this.messagesEl.createDiv({
        text: this.plugin.t("emptyState"),
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
        text: message.role === "user" ? this.plugin.t("roleYou") : this.plugin.t("roleNiki"),
        cls: "claude-code-role"
      });
      const contentEl = wrapper.createDiv("claude-code-content");
      if (message.isPending) {
        const thinking = contentEl.createSpan("claude-code-thinking");
        thinking.createSpan({ text: this.plugin.t("thinkingInline") });
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
      const actions = wrapper.createDiv("claude-code-message-actions");
      const copyBtn = actions.createEl("button", {
        text: this.plugin.t("copy")
      });
      copyBtn.addEventListener("click", async () => {
        await this.copyToClipboard(message.content);
        new import_obsidian.Notice(this.plugin.t("copied"));
      });
      if (message.role === "assistant" && !message.isError && !message.isPending) {
        if (message.fileModifications && message.fileModifications.length > 0) {
          const undoBtn = actions.createEl("button", {
            text: this.plugin.t("undoChanges"),
            cls: "claude-code-undo-btn"
          });
          undoBtn.addEventListener("click", async () => {
            await this.undoFileModifications(message);
          });
        }
        if (!message.codeChanges) {
          message.codeChanges = await this.parseCodeChanges(message);
        }
        if (message.codeChanges.length > 0) {
          const viewChangesBtn = actions.createEl("button", {
            text: message.codeChanges.some((c) => c.applied) ? this.plugin.t("changesApplied") : this.plugin.t("viewChanges")
          });
          viewChangesBtn.addEventListener(
            "click",
            () => this.toggleDiffView(wrapper, message)
          );
          const hasUnapplied = message.codeChanges.some((c) => !c.applied);
          if (hasUnapplied) {
            const applyBtn = actions.createEl("button", {
              text: this.plugin.t("applyAllChanges"),
              cls: "mod-cta"
            });
            applyBtn.addEventListener(
              "click",
              () => this.applyAllChanges(message)
            );
          }
        } else if (!message.fileModifications || message.fileModifications.length === 0) {
          const insertBtn = actions.createEl("button", {
            text: this.plugin.t("insertToNote")
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
  // 根据内容查找最匹配的文件
  findBestMatchingFile(content) {
    const allFiles = this.app.vault.getMarkdownFiles();
    const contentLines = content.trim().split("\n").slice(0, 50);
    let bestMatch = null;
    let bestScore = 0;
    for (const file of allFiles) {
      try {
        const fileContent = this.app.vault.cachedRead(file);
        if (!fileContent)
          continue;
        const fileLines = fileContent.split("\n").slice(0, 50);
        let matchCount = 0;
        for (const line of contentLines) {
          if (line.trim().length > 5) {
            for (const fileLine of fileLines) {
              if (fileLine.trim() === line.trim()) {
                matchCount++;
                break;
              }
            }
          }
        }
        const score = matchCount / Math.max(contentLines.filter((l) => l.trim().length > 5).length, 1);
        if (score > bestScore && score > 0.3) {
          bestScore = score;
          bestMatch = file;
        }
      } catch (e) {
      }
    }
    return bestMatch;
  }
  // 解析代码块变更
  async parseCodeChanges(message) {
    const codeChanges = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const [, language, content] = match;
      const targetFile = this.findBestMatchingFile(content);
      if (!targetFile)
        continue;
      const originalContent = await this.app.vault.cachedRead(targetFile);
      codeChanges.push({
        language,
        originalContent,
        newContent: content.trim(),
        blockIndex: blockIndex++,
        targetFile
      });
    }
    return codeChanges;
  }
  // 渲染 diff 视图
  renderDiffView(container, diff, targetFile) {
    const diffContainer = container.createDiv("claude-code-diff-container");
    const header = diffContainer.createDiv("claude-code-diff-header");
    const fileLink = header.createEl("a", {
      text: targetFile.path,
      cls: "claude-code-diff-file"
    });
    fileLink.addEventListener("click", () => {
      this.app.workspace.openLinkText(targetFile.path, "", true);
    });
    fileLink.style.cursor = "pointer";
    fileLink.style.textDecoration = "underline";
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
    if (!codeChange.targetFile)
      return;
    const diff = computeDiff(codeChange.originalContent, codeChange.newContent);
    this.renderDiffView(wrapper, diff, codeChange.targetFile);
  }
  // 应用代码变更
  async applyCodeChanges(codeChange) {
    const file = codeChange.targetFile;
    if (!file) {
      new import_obsidian.Notice(this.plugin.t("noTargetFile"));
      return;
    }
    try {
      await this.app.vault.modify(file, codeChange.newContent);
      codeChange.applied = true;
      new import_obsidian.Notice(this.plugin.tf("changesAppliedTo", { path: file.path }));
      this.renderMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : this.plugin.t("unknownError");
      new import_obsidian.Notice(this.plugin.tf("failedApplyChanges", { message }));
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
  // 撤销文件修改
  async undoFileModifications(message) {
    if (!message.fileModifications || message.fileModifications.length === 0) {
      return;
    }
    for (const mod of message.fileModifications) {
      try {
        await this.app.vault.modify(mod.file, mod.originalContent);
        new import_obsidian.Notice(this.plugin.tf("undoSuccess", { path: mod.filePath }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : this.plugin.t("unknownError");
        new import_obsidian.Notice(this.plugin.tf("undoFailed", { message: errorMsg }));
      }
    }
    message.fileModifications = [];
    this.renderMessages();
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
      placeholder: this.plugin.t("searchFilesPlaceholder"),
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
  // ============ 话题管理相关方法 ============
  // 生成话题ID
  generateTopicId() {
    return `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  // 创建新话题
  async createTopic() {
    if (this.plugin.settings.currentTopicId) {
      const currentTopic = this.plugin.settings.topics.find(
        (t2) => t2.id === this.plugin.settings.currentTopicId
      );
      if (currentTopic) {
        currentTopic.messages = [...this.messages];
        currentTopic.updatedAt = Date.now();
      }
    }
    const newTopic = {
      id: this.generateTopicId(),
      title: "\u65B0\u8BDD\u9898",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.plugin.settings.topics.push(newTopic);
    this.plugin.settings.currentTopicId = newTopic.id;
    this.messages = [];
    await this.plugin.saveSettings();
    this.renderMessages();
    this.renderTopicSelector();
    this.scrollToBottom();
  }
  // 切换话题
  async switchTopic(topicId) {
    const topic = this.plugin.settings.topics.find((t2) => t2.id === topicId);
    if (!topic)
      return;
    if (this.plugin.settings.currentTopicId) {
      const currentTopic = this.plugin.settings.topics.find(
        (t2) => t2.id === this.plugin.settings.currentTopicId
      );
      if (currentTopic) {
        currentTopic.messages = [...this.messages];
        currentTopic.updatedAt = Date.now();
      }
    }
    this.plugin.settings.currentTopicId = topicId;
    this.messages = [...topic.messages];
    await this.plugin.saveSettings();
    this.renderMessages();
    this.renderTopicSelector();
    this.scrollToBottom();
  }
  // 删除话题
  async deleteTopic() {
    const currentTopicId = this.plugin.settings.currentTopicId;
    if (!currentTopicId)
      return;
    const topicIndex = this.plugin.settings.topics.findIndex(
      (t2) => t2.id === currentTopicId
    );
    if (topicIndex === -1)
      return;
    if (this.plugin.settings.topics.length <= 1) {
      this.messages = [];
      this.plugin.settings.topics[0].messages = [];
      this.plugin.settings.topics[0].title = "\u65B0\u8BDD\u9898";
      this.plugin.settings.topics[0].updatedAt = Date.now();
      await this.plugin.saveSettings();
      this.renderMessages();
      this.renderTopicSelector();
      return;
    }
    this.plugin.settings.topics.splice(topicIndex, 1);
    const nextTopic = this.plugin.settings.topics[Math.max(0, topicIndex - 1)];
    this.plugin.settings.currentTopicId = nextTopic.id;
    this.messages = [...nextTopic.messages];
    await this.plugin.saveSettings();
    this.renderMessages();
    this.renderTopicSelector();
  }
  // 自动生成话题标题
  async generateTopicTitle(topic) {
    const firstUserMessage = topic.messages.find((m) => m.role === "user");
    if (!firstUserMessage) {
      return "\u65B0\u8BDD\u9898";
    }
    const content = (firstUserMessage.originalInput || firstUserMessage.content).trim();
    const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
    return title;
  }
  // 更新话题标题
  async updateTopicTitle() {
    const currentTopicId = this.plugin.settings.currentTopicId;
    if (!currentTopicId)
      return;
    const topic = this.plugin.settings.topics.find((t2) => t2.id === currentTopicId);
    if (!topic)
      return;
    if (topic.title === "\u65B0\u8BDD\u9898") {
      topic.title = await this.generateTopicTitle(topic);
      await this.plugin.saveSettings();
      this.renderTopicSelector();
    }
  }
  // 保存当前话题
  async saveCurrentTopic() {
    const currentTopicId = this.plugin.settings.currentTopicId;
    if (!currentTopicId)
      return;
    const topic = this.plugin.settings.topics.find((t2) => t2.id === currentTopicId);
    if (topic) {
      topic.messages = [...this.messages];
      topic.updatedAt = Date.now();
      await this.plugin.saveSettings();
    }
  }
  // 渲染话题选择器
  renderTopicSelector() {
    if (!this.topicSelectEl)
      return;
    this.topicSelectEl.empty();
    const topics = this.plugin.settings.topics;
    const currentTopicId = this.plugin.settings.currentTopicId;
    for (const topic of topics) {
      const option = this.topicSelectEl.createEl("option", {
        value: topic.id,
        text: topic.title || "\u672A\u547D\u540D\u8BDD\u9898"
      });
      if (topic.id === currentTopicId) {
        option.setAttribute("selected", "selected");
      }
    }
    if (this.deleteTopicBtn) {
      this.deleteTopicBtn.disabled = topics.length <= 1;
    }
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
    containerEl.createEl("h2", { text: this.plugin.t("settingTitle") });
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingLanguageName")).setDesc(this.plugin.t("settingLanguageDesc")).addDropdown(
      (dropdown) => dropdown.addOption("zh-CN", "\u7B80\u4F53\u4E2D\u6587").addOption("en-US", "English").setValue(this.plugin.settings.language).onChange(async (value) => {
        this.plugin.settings.language = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingClaudeCommandName")).setDesc(this.plugin.t("settingClaudeCommandDesc")).addText(
      (text) => text.setPlaceholder(this.plugin.t("settingClaudeCommandPlaceholder")).setValue(this.plugin.settings.claudeCommand).onChange(async (value) => {
        this.plugin.settings.claudeCommand = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingDefaultPromptName")).setDesc(this.plugin.t("settingDefaultPromptDesc")).addTextArea(
      (text) => text.setPlaceholder(this.plugin.t("settingDefaultPromptPlaceholder")).setValue(this.plugin.settings.defaultPrompt).onChange(async (value) => {
        this.plugin.settings.defaultPrompt = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName(this.plugin.t("settingWorkingDirName")).setDesc(this.plugin.t("settingWorkingDirDesc")).addText(
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
