import {
  App,
  ItemView,
  MarkdownRenderer,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { exec, execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const VIEW_TYPE_CLAUDE = "niki-ai-sidebar-view";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  isError?: boolean;
};

interface ClaudeSidebarSettings {
  claudeCommand: string;
  defaultPrompt: string;
  workingDir: string;
}

const DEFAULT_SETTINGS: ClaudeSidebarSettings = {
  claudeCommand: "",
  defaultPrompt:
    "You are Niki AI embedded in Obsidian (powered by Claude Code). Help me edit Markdown notes.\n" +
    "When you propose changes, be explicit and keep the style consistent.",
  workingDir: "",
};

export default class ClaudeSidebarPlugin extends Plugin {
  settings: ClaudeSidebarSettings;

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
      callback: () => this.activateView(),
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
}

class ClaudeSidebarView extends ItemView {
  plugin: ClaudeSidebarPlugin;
  messages: ChatMessage[] = [];
  messagesEl: HTMLDivElement;
  inputEl: HTMLTextAreaElement;
  includeNoteEl: HTMLInputElement;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeSidebarPlugin) {
    super(leaf);
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
      type: "checkbox",
    });
    includeNoteWrap.createEl("span", { text: "Include current note" });

    const actions = topRow.createDiv("claude-code-actions");
    const sendBtn = actions.createEl("button", {
      text: "Send",
      cls: "mod-cta",
    });
    const clearBtn = actions.createEl("button", { text: "Clear" });

    this.inputEl = composer.createEl("textarea", {
      cls: "claude-code-input",
      attr: { placeholder: "Ask Niki AI..." },
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
        content: reply.trim() || "(empty)",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run Claude command.";
      this.addMessage({
        role: "assistant",
        content: `Error: ${message}`,
        isError: true,
      });
    }
  }

  clearChat() {
    this.messages = [];
    this.renderMessages();
  }

  addMessage(message: ChatMessage) {
    this.messages.push(message);
    this.renderMessages();
    this.scrollToBottom();
  }

  async buildPrompt(userInput: string) {
    const parts: string[] = [];
    const system = this.plugin.settings.defaultPrompt.trim();
    if (system) {
      parts.push(`[System]\n${system}`);
    }

    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile) {
        const noteText = await this.app.vault.read(activeFile);
        parts.push(`[Current Note: ${activeFile.path}]\n${noteText}`);
      } else {
        parts.push("[Current Note]\n(There is no active note.)");
      }
    }

    const history = this.messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
    if (history) {
      parts.push(`[Conversation]\n${history}`);
    }

    parts.push(`[User]\n${userInput}`);
    return parts.join("\n\n");
  }

  runClaudeCommand(prompt: string): Promise<string> {
    const configured = this.plugin.settings.claudeCommand.trim();
    const normalized = normalizeCommand(configured);
    const detectedClaude = configured ? "" : findClaudeBinary();

    const basePath = this.getVaultBasePath();
    const cwd = this.plugin.settings.workingDir.trim() || basePath || undefined;
    const env = buildEnv();

    if (normalized) {
      const hasPlaceholder = normalized.includes("{prompt}");
      const finalCommand = hasPlaceholder
        ? normalized.replace(/\{prompt\}/g, prompt.replace(/"/g, '\\"'))
        : normalized;

      return new Promise((resolve, reject) => {
        const child = exec(
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
        execFile(
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

    new Notice(
      "未找到 Claude CLI。请在设置里填写 Claude command，或把 claude 加入 PATH。"
    );
    return Promise.resolve(
      "Claude CLI not found. Configure Claude command or add claude to PATH."
    );
  }

  getActiveFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    return file ?? null;
  }

  getVaultBasePath(): string | null {
    const adapter = this.app.vault.adapter;
    if ("getBasePath" in adapter) {
      return (adapter as any).getBasePath?.() ?? null;
    }
    return null;
  }

  async insertIntoActiveFile(content: string) {
    const file = this.getActiveFile();
    if (!file) {
      new Notice("No active note to insert into.");
      return;
    }
    const existing = await this.app.vault.read(file);
    await this.app.vault.modify(file, `${existing}\n\n${content.trim()}\n`);
    new Notice(`Inserted into ${file.path}`);
  }

  renderMessages() {
    this.messagesEl.empty();
    if (this.messages.length === 0) {
      this.messagesEl.createDiv({
        text: "Start a conversation with Niki AI.",
        cls: "claude-code-empty",
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
        cls: "claude-code-role",
      });

      const contentEl = wrapper.createDiv("claude-code-content");
      MarkdownRenderer.render(
        this.app,
        message.content,
        contentEl,
        "",
        this.plugin
      );

      if (message.role === "assistant" && !message.isError) {
        const actions = wrapper.createDiv("claude-code-message-actions");
        const insertBtn = actions.createEl("button", { text: "Insert to note" });
        insertBtn.addEventListener("click", () =>
          this.insertIntoActiveFile(message.content)
        );
      }
    });
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}

function normalizeCommand(command: string): string {
  if (!command) {
    return "";
  }
  const trimmed = command.trim();
  if (!trimmed) {
    return "";
  }
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken && isDirectory(firstToken)) {
    const resolved = path.join(firstToken, "claude");
    return trimmed.replace(firstToken, resolved);
  }
  return trimmed;
}

function findClaudeBinary(): string {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".npm-global", "bin", "claude"),
    path.join(home, ".local", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
  ];
  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return "";
}

function buildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const home = os.homedir();
  const nodeBinary = findNodeBinary();
  const nodeDir = nodeBinary ? path.dirname(nodeBinary) : "";
  const extra = [
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".local", "bin"),
    path.join(home, ".volta", "bin"),
    path.join(home, ".asdf", "shims"),
    path.join(home, ".nvm", "versions", "node"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
  ];
  const currentPath = env.PATH || "";
  const parts = currentPath.split(path.delimiter).filter(Boolean);
  const merged = [...(nodeDir ? [nodeDir] : []), ...extra, ...parts];
  env.PATH = Array.from(new Set(merged)).join(path.delimiter);
  return env;
}

function isExecutable(target: string): boolean {
  try {
    fs.accessSync(target, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function findNodeBinary(): string {
  const home = os.homedir();
  const direct = [
    path.join(home, ".volta", "bin", "node"),
    path.join(home, ".asdf", "shims", "node"),
    path.join(home, ".nvm", "versions", "node", "bin", "node"),
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node",
  ];
  for (const candidate of direct) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  const nvmRoot = path.join(home, ".nvm", "versions", "node");
  try {
    const versions = fs
      .readdirSync(nvmRoot)
      .map((entry) => path.join(nvmRoot, entry, "bin", "node"))
      .filter((candidate) => isExecutable(candidate))
      .sort();
    if (versions.length > 0) {
      return versions[versions.length - 1];
    }
  } catch {
    // ignore
  }

  return "";
}

class ClaudeSidebarSettingTab extends PluginSettingTab {
  plugin: ClaudeSidebarPlugin;

  constructor(app: App, plugin: ClaudeSidebarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Niki AI Sidebar" });

    new Setting(containerEl)
      .setName("Claude command")
      .setDesc(
        "Command to run Claude Code. Use {prompt} to inline the prompt, or leave it out to send via stdin."
      )
      .addText((text) =>
        text
          .setPlaceholder("claude -p \"{prompt}\"")
          .setValue(this.plugin.settings.claudeCommand)
          .onChange(async (value) => {
            this.plugin.settings.claudeCommand = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default prompt")
      .setDesc("Prepended to every request.")
      .addTextArea((text) =>
        text
          .setPlaceholder("You are Claude Code embedded in Obsidian...")
          .setValue(this.plugin.settings.defaultPrompt)
          .onChange(async (value) => {
            this.plugin.settings.defaultPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Working directory")
      .setDesc("Optional cwd for the Claude command. Defaults to vault path.")
      .addText((text) =>
        text
          .setPlaceholder("/path/to/vault")
          .setValue(this.plugin.settings.workingDir)
          .onChange(async (value) => {
            this.plugin.settings.workingDir = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
