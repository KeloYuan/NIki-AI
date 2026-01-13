import {
  App,
  ItemView,
  MarkdownRenderer,
  Modal,
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
    unsupportedFileType: "不支持的文件类型。只支持文本文件（如 .md, .txt, .js 等）。",
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
    settingClaudePathName: "Claude path",
    settingClaudePathDesc:
      "Claude CLI 可执行文件的完整路径（Windows 可填 claude.cmd）。留空则自动检测。",
    settingNodePathName: "Node path",
    settingNodePathDesc:
      "Node 可执行文件的完整路径（Windows 可填 node.exe）。留空则自动检测。",
    settingGitBashPathName: "Git Bash path",
    settingGitBashPathDesc:
      "Git Bash 可执行文件的完整路径（Windows 使用 shell 执行时需要）。留空则自动检测。",
    pathHelpButton: "帮助",
    pathHelpTitle: "路径帮助",
    pathHelpBody:
      "如何找到 Claude / Node 的完整路径：\n\n" +
      "Windows（推荐）:\n" +
      "1) 打开 cmd 或 PowerShell\n" +
      "2) 运行: where claude\n" +
      "3) 运行: where node\n\n" +
      "如果没有输出，可尝试以下常见路径：\n" +
      "- %APPDATA%\\npm\\claude.cmd\n" +
      "- C:\\Program Files\\nodejs\\node.exe\n" +
      "- C:\\Program Files (x86)\\nodejs\\node.exe\n" +
      "- %LOCALAPPDATA%\\Programs\\nodejs\\node.exe\n" +
      "- %NVM_SYMLINK%\\node.exe\n\n" +
      "macOS/Linux:\n" +
      "- 运行: which claude\n" +
      "- 运行: which node",
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
    aboutSectionName: "关于本插件",
    aboutVersion: "版本",
    aboutAuthor: "作者",
    aboutEmail: "邮箱",
    aboutLicense: "开源协议",
    aboutRepository: "代码仓库",
    aboutDescription: "简介",
    aboutDescriptionText: "Niki AI 是一个 Obsidian 插件，集成了 Claude Code CLI 作为对话式 AI 助手。你可以在侧边栏与 Claude 聊天，包含当前笔记内容作为上下文，并将回复直接插入到笔记中。",
    // 助手预设相关
    assistantSectionName: "助手预设",
    assistantSectionDesc: "管理和切换不同的 AI 助手，每个助手有独立的提示词配置。",
    assistantName: "助手名称",
    assistantSystemPrompt: "系统提示词",
    assistantAddNew: "添加新助手",
    assistantDelete: "删除助手",
    assistantEdit: "编辑助手",
    assistantDefaultName: "新助手",
    assistantDefaultPrompt: "你是一个 AI 助手。",
    assistantCannotDeleteLast: "不能删除最后一个助手预设",
    currentAssistant: "当前助手",
    sendInterrupt: "中断",
    sendSending: "发送中...",
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
    unsupportedFileType: "Unsupported file type. Only text files are supported (e.g., .md, .txt, .js, etc.).",
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
    settingClaudePathName: "Claude path",
    settingClaudePathDesc:
      "Full path to the Claude CLI executable (on Windows, use claude.cmd). Leave empty to auto-detect.",
    settingNodePathName: "Node path",
    settingNodePathDesc:
      "Full path to the Node executable (on Windows, use node.exe). Leave empty to auto-detect.",
    settingGitBashPathName: "Git Bash path",
    settingGitBashPathDesc:
      "Full path to the Git Bash executable (needed for shell execution on Windows). Leave empty to auto-detect.",
    pathHelpButton: "Help",
    pathHelpTitle: "Path Help",
    pathHelpBody:
      "How to find the full paths for Claude / Node:\n\n" +
      "Windows (recommended):\n" +
      "1) Open cmd or PowerShell\n" +
      "2) Run: where claude\n" +
      "3) Run: where node\n\n" +
      "If there is no output, try these common locations:\n" +
      "- %APPDATA%\\npm\\claude.cmd\n" +
      "- C:\\Program Files\\nodejs\\node.exe\n" +
      "- C:\\Program Files (x86)\\nodejs\\node.exe\n" +
      "- %LOCALAPPDATA%\\Programs\\nodejs\\node.exe\n" +
      "- %NVM_SYMLINK%\\node.exe\n\n" +
      "macOS/Linux:\n" +
      "- Run: which claude\n" +
      "- Run: which node",
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
    aboutSectionName: "About",
    aboutVersion: "Version",
    aboutAuthor: "Author",
    aboutEmail: "Email",
    aboutLicense: "License",
    aboutRepository: "Repository",
    aboutDescription: "Description",
    aboutDescriptionText: "Niki AI is an Obsidian plugin that integrates Claude Code CLI as a conversational AI assistant. You can chat with Claude in the sidebar, include current note content as context, and insert responses directly into your notes.",
    // Assistant presets
    assistantSectionName: "Assistant Presets",
    assistantSectionDesc: "Manage and switch between different AI assistants, each with independent prompt configuration.",
    assistantName: "Assistant Name",
    assistantSystemPrompt: "System Prompt",
    assistantAddNew: "Add New Assistant",
    assistantDelete: "Delete Assistant",
    assistantEdit: "Edit Assistant",
    assistantDefaultName: "New Assistant",
    assistantDefaultPrompt: "You are an AI assistant.",
    assistantCannotDeleteLast: "Cannot delete the last assistant preset",
    currentAssistant: "Current Assistant",
    sendInterrupt: "Stop",
    sendSending: "Sending...",
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

// 提及的项（文件或文件夹）
type MentionedItem = {
  type: "file" | "folder";
  name: string;      // 显示名称
  path: string;      // 文件或文件夹路径
  files?: TFile[];   // 文件夹时的文件列表
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

type AssistantPreset = {
  id: string;           // 唯一标识符
  name: string;         // 助手名称（如"写作助手"、"编程助手"）
  systemPrompt: string; // 系统提示词
};

interface ClaudeSidebarSettings {
  claudeCommand: string;
  claudePath: string;
  nodePath: string;
  gitBashPath: string;
  defaultPrompt: string;
  workingDir: string;
  language: Language;
  includeCurrentNote: boolean;
  // 新增话题数据
  topics: ChatTopic[];           // 所有话题
  currentTopicId: string | null; // 当前话题ID
  // 新增助手预设数据
  assistantPresets: AssistantPreset[];  // 所有助手预设
  currentAssistantId: string | null;   // 当前选中的助手ID
}

const DEFAULT_SETTINGS: ClaudeSidebarSettings = {
  claudeCommand: "",
  claudePath: "",
  nodePath: "",
  gitBashPath: "",
  defaultPrompt:
    "You are Niki AI embedded in Obsidian (powered by Claude Code). Help me edit Markdown notes.\n" +
    "When you propose changes, be explicit and keep the style consistent.",
  workingDir: "",
  language: "zh-CN",
  includeCurrentNote: false,
  topics: [],
  currentTopicId: null,
  assistantPresets: [
    {
      id: "assistant_default",
      name: "默认助手",
      systemPrompt:
        "You are Niki AI embedded in Obsidian (powered by Claude Code). Help me edit Markdown notes.\n" +
        "When you propose changes, be explicit and keep the style consistent.",
    },
  ],
  currentAssistantId: "assistant_default",
};

export default class ClaudeSidebarPlugin extends Plugin {
  settings: ClaudeSidebarSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_CLAUDE, (leaf) => {
      return new ClaudeSidebarView(leaf, this);
    });

    this.addRibbonIcon("bot", this.t("openSidebarCommand"), () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-sidebar",
      name: this.t("openSidebarCommand"),
      callback: () => this.activateView(),
    });

    this.addSettingTab(new ClaudeSidebarSettingTab(this.app, this));
  }

  onunload() {
    // Don't detach leaves - this resets user's custom positioning
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_CLAUDE, active: true });
    }
    void workspace.revealLeaf(leaf);
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
  private mentionedItems: MentionedItem[] = [];
  private mentionTagsEl: HTMLDivElement;
  private filePickerEl: HTMLDivElement;
  // 新增：话题相关
  private topicSelectEl: HTMLSelectElement;
  private newTopicBtn: HTMLButtonElement;
  private deleteTopicBtn: HTMLButtonElement;
  // 新增：助手预设相关
  private assistantSelectEl: HTMLSelectElement;
  // 新增：发送状态管理
  private isSending = false;
  private sendBtn: HTMLButtonElement;
  private currentProcess: { kill: (signal?: NodeJS.Signals) => void } | null = null;

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

    // 新增：助手选择器（紧凑版）
    this.assistantSelectEl = actions.createEl("select", {
      cls: "claude-code-assistant-select"
    });

    this.sendBtn = actions.createEl("button", {
      text: this.plugin.t("send"),
      cls: "mod-cta",
    });
    const clearBtn = actions.createEl("button", { text: this.plugin.t("clear") });

    this.inputEl = composer.createEl("textarea", {
      cls: "claude-code-input",
      attr: { placeholder: this.plugin.t("inputPlaceholder") },
    });
    this.inputEl.addEventListener("keydown", (event) => {
      // 检查是否在输入法中，避免输入法确认时触发发送
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
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
          this.addMentionedItem({
            type: "file",
            name: activeFile.basename,
            path: activeFile.path
          });
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

      console.debug("Drop event types:", transfer.types);

      // 支持的文本文件扩展名
      const TEXT_EXTENSIONS = new Set([
        "md", "txt", "js", "ts", "jsx", "tsx", "py", "rs", "go", "java",
        "c", "cpp", "h", "hpp", "cs", "php", "rb", "swift", "kt", "scala",
        "json", "yaml", "yml", "toml", "xml", "html", "css", "scss", "less",
        "sh", "bash", "zsh", "fish", "ps1", "sql", "graphql", "wsdl", "rss"
      ]);

      // 检查是否为文本文件
      const isTextFile = (fileName: string): boolean => {
        if (!fileName) return false;
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (!ext) return false;
        return TEXT_EXTENSIONS.has(ext);
      };

      // 方法1: 尝试获取 Obsidian 文件数据
      for (const type of transfer.types) {
        try {
          const data = transfer.getData(type);
          console.debug(`Data for type "${type}":`, data);

          // 检查是否是 Obsidian URI
          if (typeof data === "string" && data.startsWith("obsidian://open?")) {
            try {
              const url = new URL(data);
              const filePath = url.searchParams.get("file");
              if (filePath) {
                const decodedPath = decodeURIComponent(filePath);
                console.debug("Obsidian file path:", decodedPath);

                // Obsidian URI 中的 file 参数只是 basename（不含扩展名）
                // 直接在 vault 中查找，不需要检查扩展名
                const fileName = decodedPath.split('/').pop() || decodedPath;
                const file = this.app.vault.getMarkdownFiles().find((f) =>
                  f.basename === fileName || f.path === decodedPath || f.path.endsWith(decodedPath)
                );

                if (file) {
                  this.addMentionedItem({
                    type: "file",
                    name: file.basename,
                    path: file.path
                  });
                  new Notice(this.plugin.tf("addedFile", { name: file.basename }));
                  return;
                }

                // 如果在 markdown 文件中找不到，尝试其他文本文件
                const allFiles = this.app.vault.getFiles();
                const textFile = allFiles.find((f) =>
                  f.basename === fileName || f.path === decodedPath || f.path.endsWith(decodedPath)
                );

                if (textFile && isTextFile(textFile.path)) {
                  this.addMentionedItem({
                    type: "file",
                    name: textFile.basename,
                    path: textFile.path
                  });
                  new Notice(this.plugin.tf("addedFile", { name: textFile.basename }));
                  return;
                }

                console.debug("File not found in vault:", decodedPath);
              }
            } catch (e) {
              console.error("Failed to parse Obsidian URI:", e);
            }
          }

          // 检查是否是文件路径（某些系统会直接传递文件路径）
          if (typeof data === "string") {
            // 先检查是否是文件夹
            const abstractFile = this.app.vault.getAbstractFileByPath(data);
            if (abstractFile && "children" in abstractFile) {
              // 是文件夹，扫描并添加
              const folderFiles = this.scanFolder(data);

              if (folderFiles.length > 0) {
                const folderName = data.split('/').pop() || data;
                this.addMentionedItem({
                  type: "folder",
                  name: folderName,
                  path: data,
                  files: folderFiles
                });
                new Notice(`已添加文件夹: ${folderName} (${folderFiles.length} 个文件)`);
                return;
              } else {
                new Notice(`文件夹 ${data} 中没有支持的文本文件`);
                return;
              }
            }

            // 如果不是文件夹，按文件处理
            if (data.endsWith(".md") || isTextFile(data)) {
              const fileName = data.split(/[/\\]/).pop() || data;
              const file = this.app.vault.getMarkdownFiles().find((f) =>
                f.path === data || f.path.endsWith(data) || f.basename === fileName.replace(/\.[^/.]+$/, "")
              );

              if (file) {
                this.addMentionedItem({
                  type: "file",
                  name: file.basename,
                  path: file.path
                });
                new Notice(this.plugin.tf("addedFile", { name: file.basename }));
                return;
              }
            }
          }
        } catch (e) {
          // 某些类型可能无法读取，忽略
          console.debug(`Cannot read type "${type}":`, e);
        }
      }

      // 方法2: 标准 File API（用于从操作系统拖拽文件）
      const files = transfer.files;
      console.debug("Files from File API:", files);

      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          console.debug("Processing file:", file.name);

          // 检查是否为文本文件
          if (!isTextFile(file.name)) {
            new Notice(this.plugin.t("unsupportedFileType"));
            continue;
          }

          // 尝试在 vault 中查找匹配的文件
          const vaultFile = this.app.vault.getMarkdownFiles().find((f) =>
            f.basename === file.name.replace(/\.[^/.]+$/, "")
          );

          if (vaultFile) {
            this.addMentionedItem({
              type: "file",
              name: vaultFile.basename,
              path: vaultFile.path
            });
            new Notice(this.plugin.tf("addedFile", { name: vaultFile.basename }));
          } else {
            // 外部文件：不支持直接添加
            new Notice(this.plugin.t("unsupportedFileType"));
          }
        }
      }

      // 方法3: 检查是否拖入了文件夹（通过 DataTransferItem）
      if (transfer.items) {
        for (let i = 0; i < transfer.items.length; i++) {
          const item = transfer.items[i];

          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry?.();
            if (entry && entry.isDirectory) {

              // 获取文件夹路径（去掉开头的 /）
              const folderName = entry.fullPath.substring(1).split('/')[0];
              const folderPath = folderName;

              // 扫描文件夹获取所有文件
              const folderFiles = await this.scanFolder(folderPath);

              if (folderFiles.length > 0) {
                this.addMentionedItem({
                  type: "folder",
                  name: folderName,
                  path: folderPath,
                  files: folderFiles
                });
                new Notice(`已添加文件夹: ${folderName} (${folderFiles.length} 个文件)`);
              } else {
                new Notice(`文件夹 ${folderName} 中没有支持的文本文件`);
              }

              return; // 处理完文件夹后直接返回
            }
          }
        }
      }
    });

    this.includeNoteEl.addEventListener("change", async () => {
      this.plugin.settings.includeCurrentNote = this.includeNoteEl.checked;
      await this.plugin.saveSettings();
    });

    this.sendBtn.addEventListener("click", () => void this.handleSend());
    clearBtn.addEventListener("click", () => this.clearChat());

    // 新增：助手预设事件绑定
    this.assistantSelectEl.addEventListener("change", (e) => {
      void (async () => {
        const target = e.target as HTMLSelectElement;
        await this.switchAssistant(target.value);
      })();
    });

    // 新增：话题事件绑定
    this.topicSelectEl.addEventListener("change", (e) => {
      void (async () => {
        const target = e.target as HTMLSelectElement;
        await this.switchTopic(target.value);
      })();
    });

    this.newTopicBtn.addEventListener("click", () => {
      void this.createTopic();
    });

    this.deleteTopicBtn.addEventListener("click", () => {
      void this.deleteTopic();
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

    this.renderAssistantSelector();
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
    // 如果正在发送，则中断
    if (this.isSending) {
      this.interruptSending();
      return;
    }

    const content = this.inputEl.value.trim();
    if (!content && this.mentionedItems.length === 0) {
      return;
    }
    this.inputEl.value = "";

    // 设置发送状态
    this.isSending = true;
    this.updateSendButtonState();

    // 构建用户消息内容（包含被 @ 的文件/文件夹信息）
    let messageContent = content;
    if (this.mentionedItems.length > 0) {
      const itemList = this.mentionedItems.map((item) => {
        if (item.type === "folder") {
          return `@${item.name} (${item.files?.length || 0} 个文件)`;
        }
        return `@${item.name}`;
      }).join(", ");
      messageContent = `${itemList}\n\n${content}`;
    }

    this.addMessage({
      role: "user",
      content: messageContent,
      originalInput: content  // 保存原始输入，用于生成话题标题
    });

    // 新增：更新话题标题（在清空 mentionedItems 之前）
    await this.updateTopicTitle();

    // 记录调用前的文件状态（用于撤销）
    // 从 mentionedItems 中提取所有文件（包括文件夹内的文件）
    const filesToTrack: TFile[] = [];
    for (const item of this.mentionedItems) {
      if (item.type === "folder" && item.files) {
        filesToTrack.push(...item.files);
      } else if (item.type === "file") {
        // 从 Obsidian vault 中查找文件
        const file = this.app.vault.getFiles().find(f => f.path === item.path);
        if (file) filesToTrack.push(file);
      }
    }
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
          if (afterContent !== beforeContent) {
            modifications.push({
              filePath: file.path,
              originalContent: beforeContent,
              file,
              timestamp: beforeTimestamp,
            });
          }
        } catch {
          // 文件读取失败，跳过
        }
      }

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

    // 恢复发送状态
    this.isSending = false;
    this.updateSendButtonState();
  }

  // 更新发送按钮状态
  private updateSendButtonState() {
    if (this.isSending) {
      this.sendBtn.textContent = this.plugin.t("sendInterrupt");
      this.sendBtn.removeClass("mod-cta");
      this.inputEl.disabled = true;
    } else {
      this.sendBtn.textContent = this.plugin.t("send");
      this.sendBtn.addClass("mod-cta");
      this.inputEl.disabled = false;
    }
  }

  // 中断发送
  private interruptSending() {
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      this.currentProcess = null;
    }

    // 移除正在思考的消息
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.isPending) {
      this.messages.pop();
      this.renderMessages();
    }

    this.isSending = false;
    this.updateSendButtonState();
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
    // 获取当前选中助手的系统提示词
    const currentAssistant = this.plugin.settings.assistantPresets.find(
      a => a.id === this.plugin.settings.currentAssistantId
    );
    const system = (currentAssistant?.systemPrompt || this.plugin.settings.defaultPrompt).trim();
    if (system) {
      parts.push(`[System]\n${system}`);
    }

    // 新增：包含被 @ 的文件/文件夹（读取内容）
    if (this.mentionedItems.length > 0) {
      for (const item of this.mentionedItems) {
        if (item.type === "folder" && item.files) {
          // 文件夹：读取所有文件内容
          parts.push(`[@ 文件夹: ${item.name} (${item.files.length} 个文件)]`);
          for (const file of item.files) {
            try {
              const content = await this.app.vault.read(file);
              parts.push(`[文件: ${file.path}]\n${content}`);
            } catch {
              parts.push(`[文件: ${file.path}]\n(无法读取文件)`);
            }
          }
        } else if (item.type === "file") {
          // 单个文件
          const file = this.app.vault.getFiles().find(f => f.path === item.path);
          if (file) {
            try {
              const content = await this.app.vault.read(file);
              parts.push(`[@ ${file.path}]\n${content}`);
            } catch {
              parts.push(`[@ ${file.path}]\n(无法读取文件)`);
            }
          }
        }
      }
    }

    // "Include current note" 也读取内容
    if (this.includeNoteEl.checked) {
      const activeFile = this.getActiveFile();
      if (!activeFile) {
        // 没有当前活动文件，跳过
        return parts.join("\n\n");
      }

      // 检查当前笔记是否已经在 mentionedItems 中
      const alreadyIncluded = this.mentionedItems.some(item => {
        if (item.type === "file") return item.path === activeFile.path;
        if (item.type === "folder" && item.files) {
          return item.files.some(f => f.path === activeFile.path);
        }
        return false;
      });
      if (!alreadyIncluded) {
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
    const preferredClaude = this.plugin.settings.claudePath.trim();
    const normalized = normalizeCommand(configured);
    const detectedClaude = configured ? "" : findClaudeBinary(preferredClaude);

    const basePath = this.getVaultBasePath();
    const cwd = this.plugin.settings.workingDir.trim() || basePath || undefined;
    const gitBashPath = this.plugin.settings.gitBashPath.trim();
    const env = buildEnv(this.plugin.settings.nodePath.trim(), gitBashPath);
    const timeoutMs = resolveClaudeTimeoutMs(env);

    // Debug logging
    console.debug("[Niki AI] Running Claude command:");
    console.debug("  Configured:", configured || "(empty)");
    console.debug("  Claude path:", preferredClaude || "(auto-detect)");
    console.debug("  Node path:", this.plugin.settings.nodePath.trim() || "(auto-detect)");
    console.debug("  Git Bash path:", gitBashPath || "(auto-detect/not set)");
    console.debug("  Detected claude:", detectedClaude || "(not found)");
    console.debug("  Normalized:", normalized || "(empty)");
    console.debug("  Working dir:", cwd || "(default)");
    console.debug("  PATH:", env.PATH ? env.PATH.substring(0, 200) + "..." : "(not set)");

    if (normalized) {
      const hasPlaceholder = normalized.includes("{prompt}");
      const finalCommand = hasPlaceholder
        ? replacePlaceholder(normalized, prompt)
        : normalized;

      console.debug("[Niki AI] Using configured command");
      console.debug("  Has placeholder:", hasPlaceholder);
      console.debug("  Final command:", finalCommand.substring(0, 200) + (finalCommand.length > 200 ? "..." : ""));

      // Windows 特殊处理：如果命令直接指向 .cmd/.bat 文件，需要 shell: true
      const isWindows = process.platform === "win32";
      // 提取命令的第一个 token（去掉引号）
      const firstToken = normalized.trim().split(/\s+/)[0].replace(/^["']|["']$/g, "");
      const isDirectCmdFile = isWindows && (
        firstToken.toLowerCase().endsWith(".cmd") ||
        firstToken.toLowerCase().endsWith(".bat")
      );

      // Determine shell: use Git Bash if configured, otherwise use default (cmd.exe or true)
      const shell: boolean | string = gitBashPath && isDirectCmdFile ? gitBashPath : isDirectCmdFile;

      return new Promise((resolve, reject) => {
        const child = exec(
          finalCommand,
          {
            cwd,
            maxBuffer: 1024 * 1024 * 10,
            env,
            timeout: timeoutMs,
            shell: shell  // Use Git Bash if configured, otherwise default shell
          },
          (error, stdout, stderr) => {
            this.currentProcess = null;
            if (error) {
              console.error("[Niki AI] Command failed:");
              console.error("  Error code:", error.code);
              console.error("  Error message:", error.message);
              console.error("  Signal:", error.signal);
              console.error("  Stderr:", stderr);
              console.error("  Stdout:", stdout ? stdout.substring(0, 500) : "(empty)");
              console.error("  Shell:", typeof shell === "string" ? shell : (shell ? "(default)" : "(none)"));
              reject(new Error(stderr || error.message));
              return;
            }
            console.debug("[Niki AI] Command succeeded, output length:", (stdout || stderr).length);
            resolve(stdout || stderr);
          }
        );

        this.currentProcess = child;

        if (!hasPlaceholder && child.stdin) {
          console.debug("[Niki AI] Writing prompt to stdin, length:", prompt.length);
          child.stdin.write(prompt);
          child.stdin.end();
        }
      });
    }

    if (detectedClaude) {
      console.debug("[Niki AI] Using auto-detected Claude:", detectedClaude);

      const isWindows = process.platform === "win32";
      const isCmdFile = detectedClaude.endsWith(".cmd") || detectedClaude.endsWith(".bat");

      // Windows 上 .cmd/.bat 文件需要使用 cmd /c 执行
      if (isWindows && isCmdFile) {
        console.debug("[Niki AI] Windows .cmd file detected, using shell execution");
        return new Promise((resolve, reject) => {
          const child = exec(
            `"${detectedClaude}"`,
            { cwd, maxBuffer: 1024 * 1024 * 10, env, timeout: timeoutMs, shell: true },
            (error, stdout, stderr) => {
              this.currentProcess = null;
              if (error) {
                console.error("[Niki AI] Command failed (Windows .cmd):");
                console.error("  Error code:", error.code);
                console.error("  Error message:", error.message);
                console.error("  Signal:", error.signal);
                console.error("  Stderr:", stderr);
                console.error("  Stdout:", stdout ? stdout.substring(0, 500) : "(empty)");
                reject(new Error(stderr || error.message));
                return;
              }
              console.debug("[Niki AI] Command succeeded, output length:", (stdout || stderr).length);
              resolve(stdout || stderr);
            }
          );
          this.currentProcess = child;
          if (child.stdin) {
            child.stdin.write(prompt);
            child.stdin.end();
          }
        });
      }

      const useNodeShim = isNodeScript(detectedClaude);
      const systemNode = useNodeShim
        ? findNodeBinary(this.plugin.settings.nodePath.trim())
        : "";
      const command = useNodeShim ? systemNode || process.execPath : detectedClaude;
      const args = useNodeShim ? [detectedClaude] : [];

      console.debug("[Niki AI] Execution details:");
      console.debug("  Use Node shim:", useNodeShim);
      console.debug("  Command:", command);
      console.debug("  Args:", args);

      return new Promise((resolve, reject) => {
        const child = execFile(
          command,
          args,
          { cwd, maxBuffer: 1024 * 1024 * 10, env, timeout: timeoutMs },
          (error, stdout, stderr) => {
            this.currentProcess = null;
            if (error) {
              console.error("[Niki AI] Command failed (execFile):");
              console.error("  Error code:", error.code);
              console.error("  Error message:", error.message);
              console.error("  Signal:", error.signal);
              console.error("  Stderr:", stderr);
              console.error("  Stdout:", stdout ? stdout.substring(0, 500) : "(empty)");
              reject(new Error(stderr || error.message));
              return;
            }
            console.debug("[Niki AI] Command succeeded, output length:", (stdout || stderr).length);
            resolve(stdout || stderr);
          }
        );
        this.currentProcess = child;
        // 使用 stdin 传递 prompt，而不是命令行参数
        if (child.stdin) {
          child.stdin.write(prompt);
          child.stdin.end();
        }
      });
    }

    console.error("[Niki AI] Claude CLI not found!");
    console.error("  Configured:", configured || "(empty)");
    console.error("  Preferred path:", preferredClaude || "(empty)");

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
    if ("getBasePath" in adapter && typeof adapter.getBasePath === "function") {
      return (adapter as { getBasePath: () => string }).getBasePath() ?? null;
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
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      void document.execCommand("copy");
      textarea.remove();
    }
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
      wrapper.createDiv({
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
      copyBtn.addEventListener("click", () => {
        void (async () => {
          await this.copyToClipboard(message.content);
          new Notice(this.plugin.t("copied"));
        })();
      });

      if (message.role === "assistant" && !message.isError && !message.isPending) {
        // 检查是否有文件被修改（用于撤销）
        if (message.fileModifications && message.fileModifications.length > 0) {
          const undoBtn = actions.createEl("button", {
            text: this.plugin.t("undoChanges"),
            cls: "claude-code-undo-btn",
          });
          undoBtn.addEventListener("click", () => {
            void this.undoFileModifications(message);
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
          viewChangesBtn.addEventListener("click", () => {
            void this.toggleDiffView(wrapper, message);
          });

          // 显示 "Apply all" 按钮
          const hasUnapplied = message.codeChanges.some((c) => !c.applied);
          if (hasUnapplied) {
            const applyBtn = actions.createEl("button", {
              text: this.plugin.t("applyAllChanges"),
              cls: "mod-cta",
            });
            applyBtn.addEventListener("click", () => {
              void this.applyAllChanges(message);
            });
          }
        } else if (!message.fileModifications || message.fileModifications.length === 0) {
          // 只有在没有文件修改时才显示 "Insert to note" 按钮
          const insertBtn = actions.createEl("button", {
            text: this.plugin.t("insertToNote"),
          });
          insertBtn.addEventListener("click", () => {
            void this.insertIntoActiveFile(message.content);
          });
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
  private toggleDiffView(
    wrapper: HTMLElement,
    message: ChatMessage
  ): void {
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
          this.addMentionedItem({
            type: "file",
            name: file.basename,
            path: file.path
          });
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

  // 添加被 @ 的文件/文件夹
  private addMentionedItem(item: MentionedItem): void {
    // 检查是否已存在（通过路径判断）
    const exists = this.mentionedItems.some(i => i.path === item.path);
    if (exists) {
      return;
    }
    this.mentionedItems.push(item);
    this.renderMentionTags();
    this.inputEl.focus();
  }

  // 移除被 @ 的文件/文件夹
  private removeMentionedItem(item: MentionedItem): void {
    this.mentionedItems = this.mentionedItems.filter(i => i.path !== item.path);
    this.renderMentionTags();
  }

  // 渲染 @ 标签
  private renderMentionTags(): void {
    this.mentionTagsEl.empty();
    this.mentionTagsEl.toggleClass("has-tags", this.mentionedItems.length > 0);

    for (const item of this.mentionedItems) {
      const tag = this.mentionTagsEl.createDiv("claude-code-mention-tag");

      // 文件夹用特殊图标
      const icon = tag.createSpan({ cls: "claude-code-mention-icon" });
      if (item.type === "folder") {
        icon.setText("📁");
      } else {
        icon.setText("@");
      }

      // 显示名称（文件夹显示文件数量）
      const displayName = item.type === "folder"
        ? `${item.name} (${item.files?.length || 0})`
        : item.name;

      const name = tag.createSpan({
        text: displayName,
        cls: "claude-code-mention-name",
      });
      name.setAttribute("title", item.path);

      const removeBtn = tag.createSpan({
        text: "×",
        cls: "claude-code-mention-remove",
      });
      removeBtn.addEventListener("click", () => this.removeMentionedItem(item));
    }
  }

  // 清空 @ 标签
  private clearMentionTags(): void {
    this.mentionedItems = [];
    this.renderMentionTags();
  }

  // 扫描文件夹，获取所有支持的文本文件
  private scanFolder(folderPath: string): TFile[] {
    const TEXT_EXTENSIONS = new Set([
      "md", "txt", "js", "ts", "jsx", "tsx", "py", "rs", "go", "java",
      "c", "cpp", "h", "hpp", "cs", "php", "rb", "swift", "kt", "scala",
      "json", "yaml", "yml", "toml", "xml", "html", "css", "scss", "less",
      "sh", "bash", "zsh", "fish", "ps1", "sql", "graphql", "wsdl", "rss"
    ]);

    const files: TFile[] = [];
    const allFiles = this.app.vault.getFiles();

    // 查找文件夹下的所有文件
    for (const file of allFiles) {
      // 检查文件是否在指定文件夹下
      if (file.path.startsWith(folderPath) || file.path.startsWith(folderPath + "/")) {
        // 检查是否为支持的文本文件
        const ext = file.extension?.toLowerCase();
        if (ext && TEXT_EXTENSIONS.has(ext)) {
          files.push(file);
        }
      }
    }

    return files;
  }

  // ============ 助手预设管理相关方法 ============

  // 切换助手
  private async switchAssistant(assistantId: string): Promise<void> {
    const assistant = this.plugin.settings.assistantPresets.find(a => a.id === assistantId);
    if (!assistant) return;

    this.plugin.settings.currentAssistantId = assistantId;
    await this.plugin.saveSettings();
    this.renderAssistantSelector();
  }

  // 渲染助手选择器
  private renderAssistantSelector(): void {
    if (!this.assistantSelectEl) return;

    this.assistantSelectEl.empty();

    const assistants = this.plugin.settings.assistantPresets;
    const currentAssistantId = this.plugin.settings.currentAssistantId;

    for (const assistant of assistants) {
      const option = this.assistantSelectEl.createEl("option", {
        value: assistant.id,
        text: assistant.name || "未命名助手",
      });

      if (assistant.id === currentAssistantId) {
        option.setAttribute("selected", "selected");
      }
    }
  }

  // ============ 话题管理相关方法 ============

  // 生成话题ID
  private generateTopicId(): string {
    return `topic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
  private generateTopicTitle(topic: ChatTopic): string {
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
      topic.title = this.generateTopicTitle(topic);
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

function findClaudeBinary(preferredPath?: string): string {
  if (preferredPath) {
    const candidate = preferredPath.trim();
    if (candidate && isExecutable(candidate)) {
      return candidate;
    }
  }
  const home = os.homedir();
  const isWindows = process.platform === "win32";

  // Windows 特定路径
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const windowsCandidates = [
      path.join(appData, "npm", "claude.cmd"),
      path.join(appData, "npm", "claude"),
    ];
    for (const candidate of windowsCandidates) {
      if (isExecutable(candidate)) {
        return candidate;
      }
    }
  }

  // Unix-like 系统 (macOS/Linux) 路径
  const unixCandidates = [
    path.join(home, ".npm-global", "bin", "claude"),
    path.join(home, ".local", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
  ];
  for (const candidate of unixCandidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return "";
}

/**
 * Convert Windows path to Git Bash format (e.g., C:\\path\\to\\file → /c/path/to/file)
 */
function windowsPathToGitBash(windowsPath: string): string {
  // Handle drive letter: C:\ → /c/
  const match = windowsPath.match(/^([A-Za-z]):\\(.*)$/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, "/");
    return `/${drive}/${rest}`;
  }
  // Handle UNC paths or already converted paths
  return windowsPath.replace(/\\/g, "/");
}

/**
 * Build environment variables for command execution.
 * When gitBashPath is provided on Windows, converts paths to Git Bash format.
 */
function buildEnv(preferredNodePath?: string, gitBashPath?: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const home = os.homedir();
  env.HOME = env.HOME || home;
  const nodeBinary = findNodeBinary(preferredNodePath);
  const nodeDir = nodeBinary ? path.dirname(nodeBinary) : "";

  const isWindows = process.platform === "win32";
  const usingGitBash = isWindows && gitBashPath && gitBashPath.trim();
  let extra: string[] = [];

  if (isWindows) {
    // Windows 特定路径
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const nvmHome = process.env.NVM_HOME;
    const nvmSymlink = process.env.NVM_SYMLINK;
    extra = [
      path.join(appData, "npm"),
      path.join(programFiles, "nodejs"),
      path.join(programFilesX86, "nodejs"),
      path.join(localAppData, "Programs", "nodejs"),
      ...(nvmSymlink ? [nvmSymlink] : []),
      ...(nvmHome ? [nvmHome] : []),
    ];
  } else {
    // Unix-like 系统 (macOS/Linux) 路径
    extra = [
      path.join(home, ".npm-global", "bin"),
      path.join(home, ".local", "bin"),
      path.join(home, ".volta", "bin"),
      path.join(home, ".asdf", "shims"),
      path.join(home, ".nvm", "versions", "node"),
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
    ];
  }

  const currentPath = env.PATH || "";
  const parts = currentPath.split(path.delimiter).filter(Boolean);
  const merged = [...(nodeDir ? [nodeDir] : []), ...extra, ...parts];

  // When using Git Bash, convert Windows paths to Unix format and use : as separator
  if (usingGitBash) {
    const convertedPaths = Array.from(new Set(merged)).map(windowsPathToGitBash);
    env.PATH = convertedPaths.join(":");
  } else {
    env.PATH = Array.from(new Set(merged)).join(path.delimiter);
  }
  return env;
}

function resolveClaudeTimeoutMs(env: NodeJS.ProcessEnv): number {
  const defaultTimeout = 300000;
  const settingsTimeout = readClaudeSettingsTimeoutMs();
  if (settingsTimeout !== null) {
    return settingsTimeout;
  }
  const envTimeout = parseTimeoutMs(env.API_TIMEOUT_MS);
  return envTimeout ?? defaultTimeout;
}

function readClaudeSettingsTimeoutMs(): number | null {
  const home = os.homedir();
  const settingsPath = path.join(home, ".claude", "settings.json");
  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as {
      env?: Record<string, string | number>;
    };
    const value = parsed.env?.API_TIMEOUT_MS;
    return parseTimeoutMs(value === undefined ? undefined : String(value));
  } catch {
    return null;
  }
}

function parseTimeoutMs(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function isExecutable(target: string): boolean {
  try {
    // 在 Windows 上，只检查文件是否存在（.cmd, .exe 等）
    // 在 Unix 系统上，检查文件是否可执行
    if (process.platform === "win32") {
      fs.accessSync(target, fs.constants.F_OK);
      return true;
    } else {
      fs.accessSync(target, fs.constants.X_OK);
      return true;
    }
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

function findNodeBinary(preferredPath?: string): string {
  if (preferredPath) {
    const candidate = preferredPath.trim();
    if (candidate && isExecutable(candidate)) {
      return candidate;
    }
  }
  const home = os.homedir();
  const isWindows = process.platform === "win32";
  const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const nvmHome = process.env.NVM_HOME;
  const nvmSymlink = process.env.NVM_SYMLINK;
  const direct = isWindows
    ? [
        nvmSymlink ? path.join(nvmSymlink, "node.exe") : "",
        nvmHome ? path.join(nvmHome, "node.exe") : "",
        path.join(programFiles, "nodejs", "node.exe"),
        path.join(programFilesX86, "nodejs", "node.exe"),
        path.join(localAppData, "Programs", "nodejs", "node.exe"),
      ].filter(Boolean)
    : [
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

  if (!isWindows) {
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
  }

  return "";
}

class PathHelpModal extends Modal {
  plugin: ClaudeSidebarPlugin;

  constructor(app: App, plugin: ClaudeSidebarPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.plugin.t("pathHelpTitle") });
    contentEl.createEl("pre", { text: this.plugin.t("pathHelpBody") });
  }

  onClose(): void {
    this.contentEl.empty();
  }
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
      .setName(this.plugin.t("settingClaudePathName"))
      .setDesc(this.plugin.t("settingClaudePathDesc"))
      .addText((text) =>
        text
          .setPlaceholder("C:\\Users\\<name>\\AppData\\Roaming\\npm\\claude.cmd")
          .setValue(this.plugin.settings.claudePath)
          .onChange(async (value) => {
            this.plugin.settings.claudePath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("settingNodePathName"))
      .setDesc(this.plugin.t("settingNodePathDesc"))
      .addText((text) =>
        text
          .setPlaceholder("C:\\Program Files\\nodejs\\node.exe")
          .setValue(this.plugin.settings.nodePath)
          .onChange(async (value) => {
            this.plugin.settings.nodePath = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("pathHelpButton")).onClick(() => {
          new PathHelpModal(this.app, this.plugin).open();
        })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("settingGitBashPathName"))
      .setDesc(this.plugin.t("settingGitBashPathDesc"))
      .addText((text) =>
        text
          .setPlaceholder("C:\\Program Files\\Git\\bin\\bash.exe")
          .setValue(this.plugin.settings.gitBashPath)
          .onChange(async (value) => {
            this.plugin.settings.gitBashPath = value;
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

    // 助手预设管理
    containerEl.createEl("h3", {
      text: this.plugin.t("assistantSectionName"),
      cls: "claude-code-about-header"
    });

    containerEl.createEl("p", {
      text: this.plugin.t("assistantSectionDesc"),
      cls: "setting-item-description"
    });

    // 渲染助手预设列表
    const renderAssistantPresets = () => {
      // 移除旧的助手列表（如果存在）
      const oldList = containerEl.querySelector(".claude-assistant-list");
      if (oldList) {
        oldList.remove();
      }

      const assistantList = containerEl.createDiv("claude-assistant-list");
      assistantList.style.marginTop = "12px";

      for (const assistant of this.plugin.settings.assistantPresets) {
        const assistantItem = assistantList.createDiv("claude-assistant-item");
        assistantItem.style.padding = "12px";
        assistantItem.style.marginBottom = "8px";
        assistantItem.style.border = "1px solid var(--background-modifier-border)";
        assistantItem.style.borderRadius = "8px";
        assistantItem.style.background = "var(--background-secondary)";

        // 助手名称（可编辑）
        const nameContainer = assistantItem.createDiv("claude-assistant-name-container");
        nameContainer.style.display = "flex";
        nameContainer.style.alignItems = "center";
        nameContainer.style.justifyContent = "space-between";
        nameContainer.style.marginBottom = "8px";

        const nameInput = nameContainer.createEl("input", {
          type: "text",
          value: assistant.name,
        });
        nameInput.style.flex = "1";
        nameInput.style.marginRight = "8px";
        nameInput.style.padding = "6px 10px";
        nameInput.style.border = "1px solid var(--background-modifier-border)";
        nameInput.style.borderRadius = "6px";
        nameInput.style.background = "var(--background-primary)";
        nameInput.style.color = "var(--text-normal)";

        nameInput.addEventListener("input", async () => {
          assistant.name = nameInput.value;
          await this.plugin.saveSettings();
        });

        // 删除按钮
        if (this.plugin.settings.assistantPresets.length > 1) {
          const deleteBtn = nameContainer.createEl("button", {
            text: this.plugin.t("assistantDelete"),
          });
          deleteBtn.style.padding = "4px 10px";
          deleteBtn.style.borderRadius = "6px";
          deleteBtn.style.border = "1px solid var(--background-modifier-border)";
          deleteBtn.style.background = "var(--background-modifier-form-field)";
          deleteBtn.style.color = "var(--text-normal)";
          deleteBtn.style.cursor = "pointer";

          deleteBtn.addEventListener("click", async () => {
            const index = this.plugin.settings.assistantPresets.findIndex(a => a.id === assistant.id);
            if (index > -1) {
              this.plugin.settings.assistantPresets.splice(index, 1);
              // 如果删除的是当前助手，切换到第一个助手
              if (this.plugin.settings.currentAssistantId === assistant.id) {
                this.plugin.settings.currentAssistantId = this.plugin.settings.assistantPresets[0].id;
              }
              await this.plugin.saveSettings();
              renderAssistantPresets();
            }
          });
        }

        // 系统提示词（可编辑）
        const promptLabel = assistantItem.createEl("label", {
          text: this.plugin.t("assistantSystemPrompt") + ":",
        });
        promptLabel.style.display = "block";
        promptLabel.style.fontSize = "12px";
        promptLabel.style.color = "var(--text-muted)";
        promptLabel.style.marginBottom = "4px";

        const promptTextarea = assistantItem.createEl("textarea", {
          value: assistant.systemPrompt,
        });
        promptTextarea.style.width = "100%";
        promptTextarea.style.minHeight = "80px";
        promptTextarea.style.padding = "8px";
        promptTextarea.style.border = "1px solid var(--background-modifier-border)";
        promptTextarea.style.borderRadius = "6px";
        promptTextarea.style.background = "var(--background-primary)";
        promptTextarea.style.color = "var(--text-normal)";
        promptTextarea.style.resize = "vertical";
        promptTextarea.style.fontFamily = "var(--font-monospace)";
        promptTextarea.style.fontSize = "12px";

        // 使用防抖，避免频繁保存
        let saveTimeout: ReturnType<typeof setTimeout> | null = null;
        promptTextarea.addEventListener("input", () => {
          // 实时更新到内存
          assistant.systemPrompt = promptTextarea.value;

          // 防抖保存到磁盘
          if (saveTimeout) {
            clearTimeout(saveTimeout);
          }
          saveTimeout = setTimeout(async () => {
            await this.plugin.saveSettings();
            // 闪烁边框表示已保存
            promptTextarea.style.borderColor = "var(--color-green)";
            setTimeout(() => {
              promptTextarea.style.borderColor = "var(--background-modifier-border)";
            }, 500);
          }, 500);
        });
      }
    };

    renderAssistantPresets();

    // 添加新助手按钮
    new Setting(containerEl)
      .addButton((button) =>
        button
          .setButtonText(this.plugin.t("assistantAddNew"))
          .setCta()
          .onClick(async () => {
            const newAssistant: AssistantPreset = {
              id: `assistant_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              name: this.plugin.t("assistantDefaultName"),
              systemPrompt: this.plugin.t("assistantDefaultPrompt"),
            };
            this.plugin.settings.assistantPresets.push(newAssistant);
            await this.plugin.saveSettings();
            renderAssistantPresets();
          })
      );

    // 关于本插件
    containerEl.createEl("h3", {
      text: this.plugin.t("aboutSectionName"),
      cls: "claude-code-about-header"
    });

    const aboutDiv = containerEl.createDiv("claude-code-about-section");

    // 版本
    aboutDiv.createEl("p", { cls: "claude-code-about-item" }).createEl("span", {
      text: `${this.plugin.t("aboutVersion")}: ${this.plugin.manifest.version}`,
    });

    // 作者
    aboutDiv.createEl("p", { cls: "claude-code-about-item" }).createEl("span", {
      text: `${this.plugin.t("aboutAuthor")}: ${this.plugin.manifest.author}`,
    });

    // 邮箱
    const emailDiv = aboutDiv.createEl("p", { cls: "claude-code-about-item" });
    emailDiv.createSpan({
      text: `${this.plugin.t("aboutEmail")}: `,
    });
    emailDiv.createEl("a", {
      text: "sloanenyra@gmail.com",
      href: "mailto:sloanenyra@gmail.com",
      cls: "claude-code-about-link"
    });

    // 开源协议
    aboutDiv.createEl("p", { cls: "claude-code-about-item" }).createEl("span", {
      text: `${this.plugin.t("aboutLicense")}: MIT`,
    });

    // 代码仓库
    const repoDiv = aboutDiv.createEl("p", { cls: "claude-code-about-item" });
    repoDiv.createSpan({
      text: `${this.plugin.t("aboutRepository")}: `,
    });
    const githubLink = repoDiv.createEl("a", {
      text: "GitHub",
      href: "https://github.com/KeloYuan/NIki-AI",
      cls: "claude-code-about-link"
    });
    githubLink.setAttribute("target", "_blank");
    repoDiv.createSpan({ text: " / " });
    const gitcodeLink = repoDiv.createEl("a", {
      text: "GitCode",
      href: "https://gitcode.com/KeloYuan/NIki-AI",
      cls: "claude-code-about-link"
    });
    gitcodeLink.setAttribute("target", "_blank");

    // 简介
    aboutDiv.createEl("p", { cls: "claude-code-about-desc" }).createEl("span", {
      text: this.plugin.t("aboutDescriptionText"),
    });
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
