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
  isPending?: boolean;
  codeChanges?: CodeChange[];
};

type CodeChange = {
  language: string;
  originalContent: string;
  newContent: string;
  blockIndex: number;
  applied?: boolean;
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
  private loaded = false;
  // 新增：@ 文件相关
  private mentionedFiles: TFile[] = [];
  private mentionTagsEl: HTMLDivElement;
  private filePickerEl: HTMLDivElement;

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

    // 新增：@ 标签显示区域
    this.mentionTagsEl = composer.createDiv("claude-code-mention-tags");

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
              new Notice(`已添加: ${file.basename}`);
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
              new Notice(`已添加: ${tempFile.basename}`);
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
            new Notice(`已添加: ${vaultFile.basename}`);
          } else {
            // 外部文件：创建简单的文件对象
            const tempFile = {
              path: filePath,
              basename: file.name.replace(/\.[^/.]+$/, ""),
              extension: file.name.split('.').pop(),
              stat: { mtime: Date.now(), ctime: Date.now(), size: 0 },
            } as TFile;
            this.addMentionedFile(tempFile);
            new Notice(`已添加: ${tempFile.basename}`);
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

    // 构建用户消息内容（包含被 @ 的文件信息）
    let messageContent = content;
    if (this.mentionedFiles.length > 0) {
      const fileList = this.mentionedFiles.map((f) => `@${f.basename}`).join(", ");
      messageContent = `${fileList}\n\n${content}`;
    }

    this.addMessage({ role: "user", content: messageContent });
    this.clearMentionTags(); // 清空 @ 标签

    const prompt = await this.buildPrompt(content);
    const pendingMessage: ChatMessage = {
      role: "assistant",
      content: "Niki 正在思考...",
      isPending: true,
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
      const message =
        error instanceof Error ? error.message : "Failed to run Claude command.";
      pendingMessage.content = `错误：无法连接到 Claude CLI。\n\n请检查：\n1. Claude CLI 是否已正确安装：\n   npm install -g @anthropic-ai/claude-code\n2. 命令是否在终端中可以正常运行\n3. 插件设置中的 Claude command 配置\n\n详细错误：${message}`;
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

  async renderMessages() {
    if (!this.loaded) {
      return;
    }

    this.messagesEl.empty();
    if (this.messages.length === 0) {
      this.messagesEl.createDiv({
        text: "Start a conversation with Niki AI.",
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
        text: message.role === "user" ? "You" : "Niki",
        cls: "claude-code-role",
      });

      const contentEl = wrapper.createDiv("claude-code-content");
      if (message.isPending) {
        const thinking = contentEl.createSpan("claude-code-thinking");
        thinking.createSpan({ text: "Niki 正在思考" });
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

      if (message.role === "assistant" && !message.isError && !message.isPending) {
        const actions = wrapper.createDiv("claude-code-message-actions");

        // 延迟检测代码块
        if (!message.codeChanges) {
          message.codeChanges = await this.parseCodeChanges(message);
        }

        if (message.codeChanges.length > 0) {
          // 显示 "View changes" 按钮
          const viewChangesBtn = actions.createEl("button", {
            text: message.codeChanges.some((c) => c.applied)
              ? "Changes applied"
              : "View changes",
          });
          viewChangesBtn.addEventListener("click", () =>
            this.toggleDiffView(wrapper, message)
          );

          // 显示 "Apply all" 按钮
          const hasUnapplied = message.codeChanges.some((c) => !c.applied);
          if (hasUnapplied) {
            const applyBtn = actions.createEl("button", {
              text: "Apply all changes",
              cls: "mod-cta",
            });
            applyBtn.addEventListener("click", () =>
              this.applyAllChanges(message)
            );
          }
        } else {
          // 原有的 "Insert to note" 按钮
          const insertBtn = actions.createEl("button", {
            text: "Insert to note",
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

  // 解析代码块变更
  private async parseCodeChanges(message: ChatMessage): Promise<CodeChange[]> {
    const codeChanges: CodeChange[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const [, language, content] = match;
      const activeFile = this.getActiveFile();
      if (!activeFile) continue;

      const originalContent = await this.app.vault.cachedRead(activeFile);
      codeChanges.push({
        language,
        originalContent,
        newContent: content.trim(),
        blockIndex: blockIndex++,
      });
    }
    return codeChanges;
  }

  // 渲染 diff 视图
  private renderDiffView(container: HTMLElement, diff: DiffResult): void {
    const diffContainer = container.createDiv("claude-code-diff-container");

    const header = diffContainer.createDiv("claude-code-diff-header");
    header.createSpan({
      text: `Changes for ${this.getActiveFile()?.path || "current file"}`,
      cls: "claude-code-diff-file",
    });

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
    const diff = computeDiff(codeChange.originalContent, codeChange.newContent);
    this.renderDiffView(wrapper, diff);
  }

  // 应用代码变更
  private async applyCodeChanges(codeChange: CodeChange): Promise<void> {
    const file = this.getActiveFile();
    if (!file) {
      new Notice("No active file to apply changes to.");
      return;
    }

    try {
      await this.app.vault.modify(file, codeChange.newContent);
      codeChange.applied = true;
      new Notice(`Changes applied to ${file.path}`);
      this.renderMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      new Notice(`Failed to apply changes: ${message}`);
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
      placeholder: "搜索文件...",
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
