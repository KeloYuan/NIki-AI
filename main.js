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
    sendBtn.addEventListener("click", () => this.handleSend());
    clearBtn.addEventListener("click", () => this.clearChat());
    this.renderMessages();
  }
  async handleSend() {
    const content = this.inputEl.value.trim();
    if (!content) {
      return;
    }
    this.inputEl.value = "";
    this.addMessage({ role: "user", content });
    const prompt = await this.buildPrompt(content);
    try {
      const reply = await this.runClaudeCommand(prompt);
      this.addMessage({
        role: "assistant",
        content: reply.trim() || "(empty)"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run Claude command.";
      this.addMessage({
        role: "assistant",
        content: `Error: ${message}`,
        isError: true
      });
    }
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
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile) {
        const noteText = await this.app.vault.read(activeFile);
        parts.push(`[Current Note: ${activeFile.path}]
${noteText}`);
      } else {
        parts.push("[Current Note]\n(There is no active note.)");
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
    if (normalized) {
      const hasPlaceholder = normalized.includes("{prompt}");
      const finalCommand = hasPlaceholder ? normalized.replace(/\{prompt\}/g, prompt.replace(/"/g, '\\"')) : normalized;
      return new Promise((resolve, reject) => {
        const child = (0, import_child_process.exec)(
          finalCommand,
          { cwd, maxBuffer: 1024 * 1024 * 10, env },
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
      return new Promise((resolve, reject) => {
        (0, import_child_process.execFile)(
          detectedClaude,
          ["-p", prompt],
          { cwd, maxBuffer: 1024 * 1024 * 10, env },
          (error, stdout, stderr) => {
            if (error) {
              reject(new Error(stderr || error.message));
              return;
            }
            resolve(stdout || stderr);
          }
        );
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
  renderMessages() {
    this.messagesEl.empty();
    if (this.messages.length === 0) {
      this.messagesEl.createDiv({
        text: "Start a conversation with Niki AI.",
        cls: "claude-code-empty"
      });
      return;
    }
    this.messages.forEach((message, index) => {
      const wrapper = this.messagesEl.createDiv("claude-code-message");
      wrapper.addClass(`is-${message.role}`);
      if (message.isError) {
        wrapper.addClass("is-error");
      }
      const roleEl = wrapper.createDiv({
        text: message.role === "user" ? "You" : "Niki",
        cls: "claude-code-role"
      });
      const contentEl = wrapper.createDiv("claude-code-content");
      import_obsidian.MarkdownRenderer.render(
        this.app,
        message.content,
        contentEl,
        "",
        this.plugin
      );
      if (message.role === "assistant" && !message.isError) {
        const actions = wrapper.createDiv("claude-code-message-actions");
        const insertBtn = actions.createEl("button", { text: "Insert to note" });
        insertBtn.addEventListener(
          "click",
          () => this.insertIntoActiveFile(message.content)
        );
      }
    });
  }
  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
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
