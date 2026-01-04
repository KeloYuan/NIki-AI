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

type Language = "zh-CN" | "en-US";

const I18N = {
  "zh-CN": {
    openSidebarCommand: "打开 Niki AI 侧边栏",
    sidebarTitle: "Niki AI Sidebar",
    includeCurrentNote: "包含当前笔记",
    send: "发送",
    clear: "清空",
    inputPlaceholder: "向 Niki AI 提问...",
    emptyState: "开始和 Niki AI 对话吧。",
    emptyResponse: "(无回复)",
    thinkingPending: "Niki 正在思考...",
    thinkingInline: "Niki 正在思考",
    failedRunCommand: "运行 Claude 命令失败。",
    claudeConnectionError:
      "错误：无法连接到 Claude CLI。\n\n请检查：\n1. Claude CLI 是否已正确安装：\n   npm install -g @anthropic-ai/claude-code\n2. 命令是否在终端中可以正常运行\n3. 插件设置中的 Claude command 配置\n\n详细错误：{message}",
    claudeNotFoundNotice:
      "未找到 Claude CLI。请在设置里填写 Claude command，或把 claude 加入 PATH。",
    claudeNotFoundReply:
      "未找到 Claude CLI。请在设置里填写 Claude command，或把 claude 加入 PATH。",
    noActiveNote: "当前没有可插入的笔记。",
    insertedInto: "已插入到 {path}",
    addedFile: "已添加: {name}",
    roleYou: "你",
    roleNiki: "Niki",
    viewChanges: "查看变更",
    changesApplied: "已应用变更",
    changesAppliedTo: "已应用变更到 {path}",
    applyAllChanges: "应用全部变更",
    insertToNote: "插入到笔记",
    copy: "复制",
    copied: "已复制",
    noTargetFile: "没有可应用变更的目标文件。",
    failedApplyChanges: "应用变更失败：{message}",
    unknownError: "未知错误",
    searchFilesPlaceholder: "搜索文件...",
    settingTitle: "Niki AI Sidebar",
    settingClaudeCommandName: "Claude command",
    settingClaudeCommandDesc:
      "用于运行 Claude Code 的命令。使用 {prompt} 内联提示词，或留空以通过 stdin 发送。",
    settingClaudeCommandPlaceholder: "claude -p \"{prompt}\"",
    settingDefaultPromptName: "Default prompt",
    settingDefaultPromptDesc: "每次请求前自动附加的系统提示词。",
    settingDefaultPromptPlaceholder: "你是嵌入 Obsidian 的 Claude Code...",
    settingWorkingDirName: "Working directory",
    settingWorkingDirDesc: "Claude 命令的可选工作目录，默认为 vault 路径。",
    settingLanguageName: "Language",
    settingLanguageDesc: "界面显示语言。",
    undoChanges: "撤销修改",
    undoSuccess: "已撤销 {path} 的修改",
    undoFailed: "撤销失败：{message}",
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
    claudeConnectionError:
      "Error: Unable to connect to Claude CLI.\n\nPlease check:\n1. Claude CLI is installed:\n   npm install -g @anthropic-ai/claude-code\n2. Command works in terminal\n3. Claude command in settings\n\nDetails: {message}",
    claudeNotFoundNotice:
      "Claude CLI not found. Configure Claude command or add claude to PATH.",
    claudeNotFoundReply:
      "Claude CLI not found. Configure Claude command or add claude to PATH.",
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
    settingClaudeCommandDesc:
      "Command to run Claude Code. Use {prompt} to inline the prompt, or leave it out to send via stdin.",
    settingClaudeCommandPlaceholder: "claude -p \"{prompt}\"",
    settingDefaultPromptName: "Default prompt",
    settingDefaultPromptDesc: "Prepended to every request.",
    settingDefaultPromptPlaceholder: "You are Claude Code embedded in Obsidian...",
    settingWorkingDirName: "Working directory",
    settingWorkingDirDesc:
      "Optional cwd for the Claude command. Defaults to vault path.",
    settingLanguageName: "Language",
    settingLanguageDesc: "Language for the UI.",
    undoChanges: "Undo changes",
    undoSuccess: "Undone changes to {path}",
    undoFailed: "Undo failed: {message}",
  },
} as const;

type I18nKey = keyof typeof I18N["zh-CN"];

function t(language: Language, key: I18nKey): string {
  return (I18N[language] ?? I18N["zh-CN"])[key] ?? I18N["zh-CN"][key];
}

function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  isError?: boolean;
  isPending?: boolean;
  codeChanges?: CodeChange[];
  originalInput?: string;  // 保存原始用户输入（不包含@文件列表），用于生成话题标题
  fileModifications?: FileModification[];  // 文件修改记录（用于撤销）
};

type FileModification = {
  filePath: string;
  originalContent: string;
  file: TFile;
  timestamp: number;
};

type CodeChange = {
  language: string;
  originalContent: string;
  newContent: string;
  blockIndex: number;
  applied?: boolean;
  targetFile?: TFile;  // 新增：目标文件
};

type ChatTopic = {
  id: string;                    // 唯一标识符
  title: string;                 // 话题标题
  messages: ChatMessage[];       // 该话题的所有消息
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
};

interface ClaudeSidebarSettings {
  claudeCommand: string;
  defaultPrompt: string;
  workingDir: string;
  language: Language;
  includeCurrentNote: boolean;
  // 新增话题数据
  topics: ChatTopic[];           // 所有话题
  currentTopicId: string | null; // 当前话题ID
}

const DEFAULT_SETTINGS: ClaudeSidebarSettings = {
  claudeCommand: "",
  defaultPrompt:
    "You are Niki AI embedded in Obsidian (powered by Claude Code). Help me edit Markdown notes.\n" +
    "When you propose changes, be explicit and keep the style consistent.",
  workingDir: "",
  language: "zh-CN",
  includeCurrentNote: false,
  topics: [],
  currentTopicId: null,
};

export default class ClaudeSidebarPlugin extends Plugin {
  settings: ClaudeSidebarSettings;

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

  t(key: I18nKey) {
    return t(this.settings.language, key);
  }

  tf(key: I18nKey, vars: Record<string, string>) {
    return format(this.t(key), vars);
  }
}

class ClaudeSidebarView extends ItemView {
  plugin: ClaudeSidebarPlugin;
  messages: ChatMessage[] = [];
  messagesEl: HTMLDivElement;
  inputEl: HTMLTextAreaElement;
  includeNoteEl: HTMLInputElement;
  private loaded = false;
  // 新增：@ 文件相关
  private mentionedFiles: TFile[] = [];
  private mentionTagsEl: HTMLDivElement;
  private filePickerEl: HTMLDivElement;
  // 新增：话题相关
  private topicSelectEl: HTMLSelectElement;
  private newTopicBtn: HTMLButtonElement;
  private deleteTopicBtn: HTMLButtonElement;

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

    // 新增：话题控制区域
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
    this.newTopicBtn.setAttribute("aria-label", "新建话题");

    this.deleteTopicBtn = topicActions.createEl("button", {
      text: "×",
      cls: "claude-code-topic-btn claude-code-topic-delete"
    });
    this.deleteTopicBtn.setAttribute("aria-label", "删除话题");

    this.messagesEl = container.createDiv("claude-code-messages");

    const composer = container.createDiv("claude-code-composer");

    // 新增：@ 标签显示区域
    this.mentionTagsEl = composer.createDiv("claude-code-mention-tags");

    const topRow = composer.createDiv("claude-code-top-row");

    const controls = topRow.createDiv("claude-code-controls");
    const includeNoteWrap = controls.createDiv("claude-code-toggle");
    this.includeNoteEl = includeNoteWrap.createEl("input", {
      type: "checkbox",
    });
    this.includeNoteEl.checked = this.plugin.settings.includeCurrentNote;
    includeNoteWrap.createEl("span", { text: this.plugin.t("includeCurrentNote") });

    const actions = topRow.createDiv("claude-code-actions");
    const sendBtn = actions.createEl("button", {
      text: this.plugin.t("send"),
      cls: "mod-cta",
    });
    const clearBtn = actions.createEl("button", { text: this.plugin.t("clear") });

    this.inputEl = composer.createEl("textarea", {
      cls: "claude-code-input",
      attr: { placeholder: this.plugin.t("inputPlaceholder") },
    });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.handleSend();
      }
    });

    // 新增：监听 @ 输入
    this.inputEl.addEventListener("input", (event) => {
      const target = event.target as HTMLTextAreaElement;
      const value = target.value;
      const cursorPos = target.selectionStart;

      // 检查是否输入了 @
      if (
        cursorPos > 0 &&
        value[cursorPos - 1] === "@" &&
        (cursorPos === 1 || value[cursorPos - 2] === " ")
      ) {
        const activeFile = this.getActiveFile();
        if (activeFile) {
          this.addMentionedFile(activeFile);
          // 移除输入的 @
          target.value = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
          target.setSelectionRange(cursorPos - 1, cursorPos - 1);
          this.showFilePicker();
        }
      }
    });

    // 新增：拖拽文件支持
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
      if (!transfer) return;

      console.log("Drop event types:", transfer.types);

      // 方法1: 处理 Obsidian obsidian://open URI
      const uriData = transfer.getData("text/plain");
      console.log("URI data:", uriData);

      if (uriData && uriData.startsWith("obsidian://open?")) {
        try {
          const url = new URL(uriData);
          const vaultName = url.searchParams.get("vault");
          const filePath = url.searchParams.get("file");

          console.log("Parsed URI - vault:", vaultName, "file:", filePath);

          if (filePath) {
            // Obsidian URI 编码的文件路径，需要解码
            const decodedPath = decodeURIComponent(filePath);
            console.log("Decoded path:", decodedPath);

            // 尝试从路径中提取文件名
            const fileName = decodedPath.split('/').pop() || decodedPath;

            // 在 vault 中查找文件
            const file = this.app.vault.getMarkdownFiles().find((f) =>
              f.path === decodedPath || f.path.endsWith(decodedPath) || f.basename === fileName
            );

            if (file) {
              this.addMentionedFile(file);
              new Notice(this.plugin.tf("addedFile", { name: file.basename }));
              return;
            } else {
              // 如果在 vault 中找不到，可能是外部文件，创建临时文件对象
              const tempFile = {
                path: decodedPath,
                basename: fileName.replace(/\.md$/, ""),
                extension: "md",
                stat: { mtime: Date.now(), ctime: Date.now(), size: 0 },
              } as TFile;
              this.addMentionedFile(tempFile);
              new Notice(this.plugin.tf("addedFile", { name: tempFile.basename }));
              return;
            }
          }
        } catch (e) {
          console.error("Failed to parse Obsidian URI:", e);
        }
      }

      // 方法2: 标准 File API（用于从操作系统拖拽文件）
      const files = transfer.files;
      console.log("Files from File API:", files);

      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const filePath = (file as any).path || (file as any).name;
          console.log("Processing file:", filePath);

          if (!filePath) continue;

          // 尝试在 vault 中查找匹配的文件
          const vaultFile = this.app.vault.getMarkdownFiles().find((f) =>
            filePath.endsWith(f.path) ||
            f.path.endsWith(filePath) ||
            f.basename === file.name.replace(/\.[^/.]+$/, "")
          );

          if (vaultFile) {
            this.addMentionedFile(vaultFile);
            new Notice(this.plugin.tf("addedFile", { name: vaultFile.basename }));
          } else {
            // 外部文件：创建简单的文件对象
            const tempFile = {
              path: filePath,
              basename: file.name.replace(/\.[^/.]+$/, ""),
              extension: file.name.split('.').pop(),
              stat: { mtime: Date.now(), ctime: Date.now(), size: 0 },
            } as TFile;
            this.addMentionedFile(tempFile);
            new Notice(this.plugin.tf("addedFile", { name: tempFile.basename }));
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

    // 新增：话题事件绑定
    this.topicSelectEl.addEventListener("change", async (e) => {
      const target = e.target as HTMLSelectElement;
      await this.switchTopic(target.value);
    });

    this.newTopicBtn.addEventListener("click", async () => {
      await this.createTopic();
    });

    this.deleteTopicBtn.addEventListener("click", async () => {
      await this.deleteTopic();
    });

    // 新增：初始化话题
    if (this.plugin.settings.topics.length === 0) {
      await this.createTopic();
    } else {
      const currentTopicId = this.plugin.settings.currentTopicId;
      if (currentTopicId) {
        const topic = this.plugin.settings.topics.find(t => t.id === currentTopicId);
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
    // 新增：保存当前话题状态
    await this.saveCurrentTopic();
    this.loaded = false;
  }

  async handleSend() {
    const content = this.inputEl.value.trim();
    if (!content && this.mentionedFiles.length === 0) {
      return;
    }
    this.inputEl.value = "";

    // 构建用户消息内容（包含被 @ 的文件信息）
    let messageContent = content;
    if (this.mentionedFiles.length > 0) {
      const fileList = this.mentionedFiles.map((f) => `@${f.basename}`).join(", ");
      messageContent = `${fileList}\n\n${content}`;
    }

    this.addMessage({
      role: "user",
      content: messageContent,
      originalInput: content  // 保存原始输入，用于生成话题标题
    });

    // 新增：更新话题标题（在清空 mentionedFiles 之前）
    await this.updateTopicTitle();

    // 记录调用前的文件状态（用于撤销）
    const filesToTrack: TFile[] = [...this.mentionedFiles];
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile && !filesToTrack.some((f) => f.path === activeFile.path)) {
        filesToTrack.push(activeFile);
      }
    }
    const beforeTimestamp = Date.now();
    const fileSnapshots = new Map<string, string>();
    for (const file of filesToTrack) {
      try {
        fileSnapshots.set(file.path, await this.app.vault.read(file));
      } catch {
        // 文件读取失败，跳过
      }
    }

    // 注意：buildPrompt 需要 mentionedFiles，所以必须在 clearMentionTags 之前调用
    const prompt = await this.buildPrompt(content);

    // buildPrompt 完成后，清空 @ 标签
    this.clearMentionTags();
    const pendingMessage: ChatMessage = {
      role: "assistant",
      content: this.plugin.t("thinkingPending"),
      isPending: true,
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

      // 检查文件是否被修改
      const modifications: FileModification[] = [];
      for (const file of filesToTrack) {
        const beforeContent = fileSnapshots.get(file.path);
        if (!beforeContent) continue;

        try {
          const afterContent = await this.app.vault.read(file);
          console.log(`检查文件 ${file.path}:`, {
            beforeLength: beforeContent.length,
            afterLength: afterContent.length,
            changed: afterContent !== beforeContent
          });
          if (afterContent !== beforeContent) {
            modifications.push({
              filePath: file.path,
              originalContent: beforeContent,
              file,
              timestamp: beforeTimestamp,
            });
          }
        } catch (e) {
          console.error(`读取文件 ${file.path} 失败:`, e);
        }
      }

      console.log(`检测到 ${modifications.length} 个文件被修改`);
      if (modifications.length > 0) {
        pendingMessage.fileModifications = modifications;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : this.plugin.t("failedRunCommand");
      pendingMessage.content = this.plugin.tf("claudeConnectionError", {
        message,
      });
      pendingMessage.isError = true;
      pendingMessage.isPending = false;
    }
    this.renderMessages();
    this.scrollToBottom();

    // 新增：保存消息到话题
    await this.saveCurrentTopic();
  }

  clearChat() {
    this.messages = [];
    this.renderMessages();
    // 新增：保存到话题
    void this.saveCurrentTopic();
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

    // 新增：包含被 @ 的文件（读取内容）
    if (this.mentionedFiles.length > 0) {
      for (const file of this.mentionedFiles) {
        try {
          const content = await this.app.vault.read(file);
          parts.push(`[@ ${file.path}]\n${content}`);
        } catch {
          parts.push(`[@ ${file.path}]\n(无法读取文件)`);
        }
      }
    }

    // "Include current note" 也读取内容
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (activeFile && !this.mentionedFiles.some((f) => f.path === activeFile.path)) {
        try {
          const noteText = await this.app.vault.read(activeFile);
          parts.push(`[@ Current note: ${activeFile.path}]\n${noteText}`);
        } catch {
          parts.push(`[@ Current note: ${activeFile.path}]\n(无法读取文件)`);
        }
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
    const timeoutMs = 120000;

    if (normalized) {
      const hasPlaceholder = normalized.includes("{prompt}");
      const finalCommand = hasPlaceholder
        ? replacePlaceholder(normalized, prompt)
        : normalized;

      return new Promise((resolve, reject) => {
        const child = exec(
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
        const child = execFile(
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
        // 使用 stdin 传递 prompt，而不是命令行参数
        if (child.stdin) {
          child.stdin.write(prompt);
          child.stdin.end();
        }
      });
    }

    new Notice(
      this.plugin.t("claudeNotFoundNotice")
    );
    return Promise.resolve(
      this.plugin.t("claudeNotFoundReply")
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
      new Notice(this.plugin.t("noActiveNote"));
      return;
    }
    const existing = await this.app.vault.read(file);
    await this.app.vault.modify(file, `${existing}\n\n${content.trim()}\n`);
    new Notice(this.plugin.tf("insertedInto", { path: file.path }));
  }

  private async copyToClipboard(content: string): Promise<void> {
    if (navigator?.clipboard?.writeText) {
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
        cls: "claude-code-empty",
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
        text:
          message.role === "user"
            ? this.plugin.t("roleYou")
            : this.plugin.t("roleNiki"),
        cls: "claude-code-role",
      });

      const contentEl = wrapper.createDiv("claude-code-content");
      if (message.isPending) {
        const thinking = contentEl.createSpan("claude-code-thinking");
        thinking.createSpan({ text: this.plugin.t("thinkingInline") });
        thinking.createSpan({ cls: "claude-code-thinking-dots" });
      } else {
        try {
          MarkdownRenderer.render(
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
        text: this.plugin.t("copy"),
      });
      copyBtn.addEventListener("click", async () => {
        await this.copyToClipboard(message.content);
        new Notice(this.plugin.t("copied"));
      });

      if (message.role === "assistant" && !message.isError && !message.isPending) {
        // 检查是否有文件被修改（用于撤销）
        if (message.fileModifications && message.fileModifications.length > 0) {
          const undoBtn = actions.createEl("button", {
            text: this.plugin.t("undoChanges"),
            cls: "claude-code-undo-btn",
          });
          undoBtn.addEventListener("click", async () => {
            await this.undoFileModifications(message);
          });
        }

        // 延迟检测代码块
        if (!message.codeChanges) {
          message.codeChanges = await this.parseCodeChanges(message);
        }

        if (message.codeChanges.length > 0) {
          // 显示 "View changes" 按钮
          const viewChangesBtn = actions.createEl("button", {
            text: message.codeChanges.some((c) => c.applied)
              ? this.plugin.t("changesApplied")
              : this.plugin.t("viewChanges"),
          });
          viewChangesBtn.addEventListener("click", () =>
            this.toggleDiffView(wrapper, message)
          );

          // 显示 "Apply all" 按钮
          const hasUnapplied = message.codeChanges.some((c) => !c.applied);
          if (hasUnapplied) {
            const applyBtn = actions.createEl("button", {
              text: this.plugin.t("applyAllChanges"),
              cls: "mod-cta",
            });
            applyBtn.addEventListener("click", () =>
              this.applyAllChanges(message)
            );
          }
        } else if (!message.fileModifications || message.fileModifications.length === 0) {
          // 只有在没有文件修改时才显示 "Insert to note" 按钮
          const insertBtn = actions.createEl("button", {
            text: this.plugin.t("insertToNote"),
          });
          insertBtn.addEventListener("click", () =>
            this.insertIntoActiveFile(message.content)
          );
        }
      }
    }
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  // 根据内容查找最匹配的文件
  private findBestMatchingFile(content: string): TFile | null {
    const allFiles = this.app.vault.getMarkdownFiles();
    const contentLines = content.trim().split('\n').slice(0, 50); // 只比较前50行
    let bestMatch: TFile | null = null;
    let bestScore = 0;

    for (const file of allFiles) {
      try {
        const fileContent = this.app.vault.cachedRead(file);
        if (!fileContent) continue;

        const fileLines = fileContent.split('\n').slice(0, 50);
        let matchCount = 0;

        // 计算匹配行数
        for (const line of contentLines) {
          if (line.trim().length > 5) {  // 只比较有意义的行
            for (const fileLine of fileLines) {
              if (fileLine.trim() === line.trim()) {
                matchCount++;
                break;
              }
            }
          }
        }

        // 计算匹配分数（匹配行数 / 内容行数）
        const score = matchCount / Math.max(contentLines.filter(l => l.trim().length > 5).length, 1);

        if (score > bestScore && score > 0.3) {  // 至少30%匹配才考虑
          bestScore = score;
          bestMatch = file;
        }
      } catch {
        // 忽略读取失败的文件
      }
    }

    return bestMatch;
  }

  // 解析代码块变更
  private async parseCodeChanges(message: ChatMessage): Promise<CodeChange[]> {
    const codeChanges: CodeChange[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const [, language, content] = match;

      // 查找最佳匹配的文件
      const targetFile = this.findBestMatchingFile(content);
      if (!targetFile) continue;

      const originalContent = await this.app.vault.cachedRead(targetFile);
      codeChanges.push({
        language,
        originalContent,
        newContent: content.trim(),
        blockIndex: blockIndex++,
        targetFile,
      });
    }
    return codeChanges;
  }

  // 渲染 diff 视图
  private renderDiffView(container: HTMLElement, diff: DiffResult, targetFile: TFile): void {
    const diffContainer = container.createDiv("claude-code-diff-container");

    const header = diffContainer.createDiv("claude-code-diff-header");

    // 创建可点击的文件路径链接
    const fileLink = header.createEl("a", {
      text: targetFile.path,
      cls: "claude-code-diff-file",
    });
    fileLink.addEventListener("click", () => {
      // 打开文件到新标签页
      this.app.workspace.openLinkText(targetFile.path, "", true);
    });
    fileLink.style.cursor = "pointer";
    fileLink.style.textDecoration = "underline";

    const stats = this.computeDiffStats(diff);
    header.createSpan({
      text: `+${stats.added} -${stats.removed}`,
      cls: "claude-code-diff-stats",
    });

    const diffContent = diffContainer.createDiv("claude-code-diff-content");
    diff.changes.forEach((change) => {
      const lineEl = diffContent.createDiv("claude-code-diff-line");
      lineEl.addClass(`claude-code-diff-${change.type}`);

      const lineNumEl = lineEl.createDiv("claude-code-diff-line-num");
      lineNumEl.setText(
        change.type === "removed"
          ? `${change.originalLine}`
          : change.type === "added"
          ? `${change.newLine}`
          : `${change.originalLine} → ${change.newLine}`
      );

      const contentEl = lineEl.createDiv("claude-code-diff-line-content");
      contentEl.setText(change.content);
    });
  }

  private computeDiffStats(diff: DiffResult): { added: number; removed: number } {
    return diff.changes.reduce(
      (stats, change) => {
        if (change.type === "added") stats.added++;
        else if (change.type === "removed") stats.removed++;
        return stats;
      },
      { added: 0, removed: 0 }
    );
  }

  // 切换 diff 视图
  private async toggleDiffView(
    wrapper: HTMLElement,
    message: ChatMessage
  ): Promise<void> {
    let diffContainer = wrapper.querySelector(
      ".claude-code-diff-container"
    ) as HTMLElement;

    if (diffContainer) {
      diffContainer.toggleClass("claude-code-diff-hidden");
      return;
    }

    if (!message.codeChanges || message.codeChanges.length === 0) return;

    const codeChange = message.codeChanges[0];
    if (!codeChange.targetFile) return;

    const diff = computeDiff(codeChange.originalContent, codeChange.newContent);
    this.renderDiffView(wrapper, diff, codeChange.targetFile);
  }

  // 应用代码变更
  private async applyCodeChanges(codeChange: CodeChange): Promise<void> {
    const file = codeChange.targetFile;
    if (!file) {
      new Notice(this.plugin.t("noTargetFile"));
      return;
    }

    try {
      await this.app.vault.modify(file, codeChange.newContent);
      codeChange.applied = true;
      new Notice(this.plugin.tf("changesAppliedTo", { path: file.path }));
      this.renderMessages();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : this.plugin.t("unknownError");
      new Notice(this.plugin.tf("failedApplyChanges", { message }));
    }
  }

  private async applyAllChanges(message: ChatMessage): Promise<void> {
    if (!message.codeChanges) return;
    for (const codeChange of message.codeChanges) {
      if (!codeChange.applied) {
        await this.applyCodeChanges(codeChange);
      }
    }
  }

  // 撤销文件修改
  private async undoFileModifications(message: ChatMessage): Promise<void> {
    if (!message.fileModifications || message.fileModifications.length === 0) {
      return;
    }

    for (const mod of message.fileModifications) {
      try {
        await this.app.vault.modify(mod.file, mod.originalContent);
        new Notice(this.plugin.tf("undoSuccess", { path: mod.filePath }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : this.plugin.t("unknownError");
        new Notice(this.plugin.tf("undoFailed", { message: errorMsg }));
      }
    }

    // 清除修改记录，因为已经撤销了
    message.fileModifications = [];
    this.renderMessages();
  }

  // ============ @ 文件相关方法 ============

  // 显示文件选择弹窗
  private showFilePicker(): void {
    if (this.filePickerEl) {
      this.filePickerEl.remove();
    }

    this.filePickerEl = this.containerEl.createDiv("claude-code-file-picker");

    const files = this.app.vault.getMarkdownFiles();
    const activeFile = this.getActiveFile();

    const searchInput = this.filePickerEl.createEl("input", {
      type: "text",
      placeholder: this.plugin.t("searchFilesPlaceholder"),
      cls: "claude-code-file-search",
    });

    const fileList = this.filePickerEl.createDiv("claude-code-file-list");

    const renderFileList = (filter: string = "") => {
      fileList.empty();
      const filteredFiles = files.filter((f) =>
        f.path.toLowerCase().includes(filter.toLowerCase())
      );

      for (const file of filteredFiles.slice(0, 10)) {
        const item = fileList.createDiv("claude-code-file-item");
        if (file === activeFile) {
          item.addClass("claude-code-file-active");
        }

        item.createSpan({
          text: file.basename,
          cls: "claude-code-file-name",
        });
        item.createSpan({
          text: file.path,
          cls: "claude-code-file-path",
        });

        item.addEventListener("click", () => {
          this.addMentionedFile(file);
          this.hideFilePicker();
        });
      }
    };

    renderFileList();

    searchInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      renderFileList(target.value);
    });

    setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick);
    }, 0);
  }

  private hideFilePicker(): void {
    if (this.filePickerEl) {
      this.filePickerEl.remove();
      this.filePickerEl = undefined;
    }
    document.removeEventListener("click", this.handleOutsideClick);
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (
      this.filePickerEl &&
      !this.filePickerEl.contains(e.target as Node) &&
      !this.inputEl.contains(e.target as Node)
    ) {
      this.hideFilePicker();
    }
  };

  // 添加被 @ 的文件
  private addMentionedFile(file: TFile): void {
    if (this.mentionedFiles.some((f) => f.path === file.path)) {
      return;
    }
    this.mentionedFiles.push(file);
    this.renderMentionTags();
    this.inputEl.focus();
  }

  // 移除被 @ 的文件
  private removeMentionedFile(file: TFile): void {
    this.mentionedFiles = this.mentionedFiles.filter((f) => f.path !== file.path);
    this.renderMentionTags();
  }

  // 渲染 @ 标签
  private renderMentionTags(): void {
    this.mentionTagsEl.empty();
    this.mentionTagsEl.toggleClass("has-tags", this.mentionedFiles.length > 0);

    for (const file of this.mentionedFiles) {
      const tag = this.mentionTagsEl.createDiv("claude-code-mention-tag");

      const icon = tag.createSpan({ cls: "claude-code-mention-icon" });
      icon.setText("@");

      const name = tag.createSpan({
        text: file.basename,
        cls: "claude-code-mention-name",
      });

      const removeBtn = tag.createSpan({
        text: "×",
        cls: "claude-code-mention-remove",
      });
      removeBtn.addEventListener("click", () => this.removeMentionedFile(file));
    }
  }

  // 清空 @ 标签
  private clearMentionTags(): void {
    this.mentionedFiles = [];
    this.renderMentionTags();
  }

  // ============ 话题管理相关方法 ============

  // 生成话题ID
  private generateTopicId(): string {
    return `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 创建新话题
  private async createTopic(): Promise<void> {
    // 保存当前话题的消息（在切换 ID 之前）
    if (this.plugin.settings.currentTopicId) {
      const currentTopic = this.plugin.settings.topics.find(
        t => t.id === this.plugin.settings.currentTopicId
      );
      if (currentTopic) {
        currentTopic.messages = [...this.messages];
        currentTopic.updatedAt = Date.now();
      }
    }

    const newTopic: ChatTopic = {
      id: this.generateTopicId(),
      title: "新话题",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.plugin.settings.topics.push(newTopic);
    this.plugin.settings.currentTopicId = newTopic.id;

    // 清空当前消息（新话题是空的）
    this.messages = [];

    await this.plugin.saveSettings();
    this.renderMessages();
    this.renderTopicSelector();
    this.scrollToBottom();
  }

  // 切换话题
  private async switchTopic(topicId: string): Promise<void> {
    const topic = this.plugin.settings.topics.find(t => t.id === topicId);
    if (!topic) return;

    // 保存当前话题的消息
    if (this.plugin.settings.currentTopicId) {
      const currentTopic = this.plugin.settings.topics.find(
        t => t.id === this.plugin.settings.currentTopicId
      );
      if (currentTopic) {
        currentTopic.messages = [...this.messages];
        currentTopic.updatedAt = Date.now();
      }
    }

    // 切换到新话题
    this.plugin.settings.currentTopicId = topicId;
    this.messages = [...topic.messages];

    await this.plugin.saveSettings();
    this.renderMessages();
    this.renderTopicSelector();
    this.scrollToBottom();
  }

  // 删除话题
  private async deleteTopic(): Promise<void> {
    const currentTopicId = this.plugin.settings.currentTopicId;
    if (!currentTopicId) return;

    const topicIndex = this.plugin.settings.topics.findIndex(
      t => t.id === currentTopicId
    );
    if (topicIndex === -1) return;

    // 如果只有一个话题，清空而不是删除
    if (this.plugin.settings.topics.length <= 1) {
      this.messages = [];
      this.plugin.settings.topics[0].messages = [];
      this.plugin.settings.topics[0].title = "新话题";
      this.plugin.settings.topics[0].updatedAt = Date.now();
      await this.plugin.saveSettings();
      this.renderMessages();
      this.renderTopicSelector();
      return;
    }

    // 删除当前话题
    this.plugin.settings.topics.splice(topicIndex, 1);

    // 切换到相邻话题
    const nextTopic = this.plugin.settings.topics[Math.max(0, topicIndex - 1)];
    this.plugin.settings.currentTopicId = nextTopic.id;
    this.messages = [...nextTopic.messages];

    await this.plugin.saveSettings();
    this.renderMessages();
    this.renderTopicSelector();
  }

  // 自动生成话题标题
  private async generateTopicTitle(topic: ChatTopic): Promise<string> {
    const firstUserMessage = topic.messages.find(m => m.role === "user");
    if (!firstUserMessage) {
      return "新话题";
    }

    // 使用 originalInput（不包含@文件列表）来生成标题，如果没有则使用 content
    const content = (firstUserMessage.originalInput || firstUserMessage.content).trim();
    const title = content.length > 30
      ? content.substring(0, 30) + "..."
      : content;

    return title;
  }

  // 更新话题标题
  private async updateTopicTitle(): Promise<void> {
    const currentTopicId = this.plugin.settings.currentTopicId;
    if (!currentTopicId) return;

    const topic = this.plugin.settings.topics.find(t => t.id === currentTopicId);
    if (!topic) return;

    if (topic.title === "新话题") {
      topic.title = await this.generateTopicTitle(topic);
      await this.plugin.saveSettings();
      this.renderTopicSelector();
    }
  }

  // 保存当前话题
  private async saveCurrentTopic(): Promise<void> {
    const currentTopicId = this.plugin.settings.currentTopicId;
    if (!currentTopicId) return;

    const topic = this.plugin.settings.topics.find(t => t.id === currentTopicId);
    if (topic) {
      topic.messages = [...this.messages];
      topic.updatedAt = Date.now();
      await this.plugin.saveSettings();
    }
  }

  // 渲染话题选择器
  private renderTopicSelector(): void {
    if (!this.topicSelectEl) return;

    this.topicSelectEl.empty();

    const topics = this.plugin.settings.topics;
    const currentTopicId = this.plugin.settings.currentTopicId;

    for (const topic of topics) {
      const option = this.topicSelectEl.createEl("option", {
        value: topic.id,
        text: topic.title || "未命名话题",
      });

      if (topic.id === currentTopicId) {
        option.setAttribute("selected", "selected");
      }
    }

    // 更新删除按钮状态
    if (this.deleteTopicBtn) {
      this.deleteTopicBtn.disabled = topics.length <= 1;
    }
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
  env.HOME = env.HOME || home;
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

function isNodeScript(target: string): boolean {
  try {
    const fd = fs.openSync(target, "r");
    const buffer = Buffer.alloc(200);
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    const firstLine = buffer.toString("utf8", 0, bytes).split("\n")[0];
    return firstLine.includes("node");
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

    containerEl.createEl("h2", { text: this.plugin.t("settingTitle") });

    new Setting(containerEl)
      .setName(this.plugin.t("settingLanguageName"))
      .setDesc(this.plugin.t("settingLanguageDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("zh-CN", "简体中文")
          .addOption("en-US", "English")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as Language;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("settingClaudeCommandName"))
      .setDesc(this.plugin.t("settingClaudeCommandDesc"))
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.t("settingClaudeCommandPlaceholder"))
          .setValue(this.plugin.settings.claudeCommand)
          .onChange(async (value) => {
            this.plugin.settings.claudeCommand = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("settingDefaultPromptName"))
      .setDesc(this.plugin.t("settingDefaultPromptDesc"))
      .addTextArea((text) =>
        text
          .setPlaceholder(this.plugin.t("settingDefaultPromptPlaceholder"))
          .setValue(this.plugin.settings.defaultPrompt)
          .onChange(async (value) => {
            this.plugin.settings.defaultPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("settingWorkingDirName"))
      .setDesc(this.plugin.t("settingWorkingDirDesc"))
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

// Diff 相关类型定义
type DiffResult = {
  changes: DiffChange[];
};

type DiffChange = {
  type: "added" | "removed" | "unchanged";
  originalLine?: number;
  newLine?: number;
  content: string;
};

// Diff 工具函数
function computeDiff(original: string, modified: string): DiffResult {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  const changes: DiffChange[] = [];

  // 简化的行级 diff 实现
  const lcs = longestCommonSubsequence(originalLines, modifiedLines);

  let origIdx = 0,
    modIdx = 0;
  for (const line of lcs) {
    while (origIdx < originalLines.length && originalLines[origIdx] !== line) {
      changes.push({
        type: "removed",
        originalLine: origIdx + 1,
        content: originalLines[origIdx],
      });
      origIdx++;
    }
    while (modIdx < modifiedLines.length && modifiedLines[modIdx] !== line) {
      changes.push({
        type: "added",
        newLine: modIdx + 1,
        content: modifiedLines[modIdx],
      });
      modIdx++;
    }
    if (origIdx < originalLines.length && modIdx < modifiedLines.length) {
      changes.push({
        type: "unchanged",
        originalLine: origIdx + 1,
        newLine: modIdx + 1,
        content: line,
      });
      origIdx++;
      modIdx++;
    }
  }

  // 处理剩余的行
  while (origIdx < originalLines.length) {
    changes.push({
      type: "removed",
      originalLine: origIdx + 1,
      content: originalLines[origIdx],
    });
    origIdx++;
  }

  while (modIdx < modifiedLines.length) {
    changes.push({
      type: "added",
      newLine: modIdx + 1,
      content: modifiedLines[modIdx],
    });
    modIdx++;
  }

  return { changes };
}

function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length,
    n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        arr1[i - 1] === arr2[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lcs: string[] = [];
  let i = m,
    j = n;
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

/**
 * 转义字符串以便安全地作为 shell 参数使用
 * 使用单引号包裹，对内部的单引号进行特殊处理
 */
function escapeShellArg(arg: string): string {
  // 单引号内所有字符都按字面意思处理
  // 唯一的问题是单引号本身，需要结束单引号，用反斜杠转义单引号，再开始新的单引号
  // 例如: "it's" -> 'it'\''s'
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

/**
 * 转义双引号字符串内的特殊字符
 */
function escapeDoubleQuotedArg(arg: string): string {
  // 在双引号内需要转义: $ ` " \ 和换行符
  return arg
    .replace(/\\/g, '\\\\')  // 反斜杠必须先转义
    .replace(/\$/g, '\\$')    // 美元符号
    .replace(/`/g, '\\`')     // 反引号
    .replace(/"/g, '\\"')     // 双引号
    .replace(/\n/g, '\\n')    // 换行符
    .replace(/\r/g, '\\r');   // 回车符
}

/**
 * 智能替换命令中的 {prompt} 占位符
 * 检测占位符周围是否有引号，使用相应的转义方式
 */
function replacePlaceholder(command: string, prompt: string): string {
  // 检查 {prompt} 是否在双引号内
  if (/"\{prompt\}"/.test(command)) {
    const escaped = prompt
      .replace(/\\/g, '\\\\')   // 反斜杠
      .replace(/\$/g, '\\$')     // 美元符号
      .replace(/`/g, '\\`')      // 反引号
      .replace(/"/g, '\\"')      // 双引号
      .replace(/\n/g, ' ')       // 换行符转空格（避免命令中断）
      .replace(/\r/g, ' ');      // 回车转空格
    return command.replace(/"\{prompt\}"/g, `"${escaped}"`);
  }

  // 检查 {prompt} 是否在单引号内
  if (/'\{prompt\}'/.test(command)) {
    const escaped = prompt.replace(/'/g, "'\\''");
    return command.replace(/'\{prompt\}'/g, `'${escaped}'`);
  }

  // 没有引号：使用单引号包裹
  const escaped = prompt.replace(/'/g, "'\\''");
  return command.replace(/\{prompt\}/g, `'${escaped}'`);
}
