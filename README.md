# Niki AI

> 在 Obsidian 侧边栏中使用 Claude Code，享受流畅的 AI 辅助写作体验。

![GitHub release](https://img.shields.io/github/v/release/KeloYuan/NIki-AI)
![License](https://img.shields.io/github/license/KeloYuan/NIki-AI)

## ✨ 功能亮点

### 核心功能
- 🎨 **侧边栏原生对话 UI** - 无缝集成 Obsidian 界面
- 📝 **智能上下文** - 自动包含当前笔记或指定文件内容
- 🔄 **撤销功能** - AI 修改文件后可一键恢复
- 💬 **多话题管理** - 支持创建多个独立对话话题

### 交互方式
- ⌨️ **@ 文件引用** - 输入 @ 或拖拽文件快速添加上下文
- 📋 **代码块差异** - 可视化预览修改内容
- 🎯 **一键插入** - 将 AI 回复直接插入当前笔记

## 📦 安装

### 方式一：手动安装
1. 下载最新版本的 [Release](https://github.com/KeloYuan/NIki-AI/releases)
2. 将 `main.js`、`manifest.json`、`styles.css` 放入：
   ```
   你的仓库/.obsidian/plugins/niki-ai/
   ```
3. 在 Obsidian 设置中启用 Niki AI 插件

### 方式二：开发构建
```bash
git clone https://github.com/KeloYuan/NIki-AI.git
cd niki-ai
npm install
npm run build
```

## ⚙️ 配置

### 1. Claude Code 配置（推荐）

在 Claude Code 配置文件（通常位于 `~/.claude/settings.json`）中添加以下内容：

**最简配置**：
```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

这样 AI 修改文件时不会弹出确认对话框，修改后插件会显示"撤销修改"按钮。

**完整配置示例**：
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "你的 API Key",
    "API_TIMEOUT_MS": "300000"
  },
  "permissions": {
    "defaultMode": "bypassPermissions"
  },
  "model": "opus"
}
```

**配置说明**：
- `permissions.defaultMode`: 设置为 `bypassPermissions` 绕过文件修改确认
- `model`: 使用的 AI 模型（`opus` / `sonnet` / `haiku`）
- `env.API_TIMEOUT_MS`: API 超时时间（毫秒）

### 2. 插件设置

打开 **Obsidian 设置 → 插件 → Niki AI**：

#### Claude command
用于运行 Claude Code 的命令，支持两种模式：

**内联模式**（推荐）：
```
claude -p "{prompt}"
```

**Stdin 模式**：
```
claude
```
插件会自动将 prompt 写入 stdin。

#### Default prompt
每次请求前自动附加的系统提示词，例如：
```
你是嵌入 Obsidian 的 Claude Code 助手，帮助我编辑 Markdown 笔记。
修改内容时保持风格一致。
```

#### Working directory
Claude 命令的工作目录，默认使用当前 vault 路径。

## 💡 使用技巧

### @ 文件引用
- **输入 @**：自动弹出文件选择器
- **拖拽文件**：直接拖入输入框
- **支持多个**：可同时引用多个文件

### 多话题管理
点击左上角话题下拉菜单：
- **切换话题**：快速切换不同对话
- **新建话题**：点击 `+` 创建新对话
- **删除话题**：点击 `×` 删除当前对话

### 撤销修改
当 AI 修改文件后，会自动显示"撤销修改"按钮：
- 点击即可恢复到修改前的内容
- 支持多文件批量撤销

### 代码块差异
AI 返回代码块时：
- 点击"查看变更"预览差异
- 点击"应用全部变更"写入文件

## ❓ 常见问题

<details>
<summary><b>没有任何输出</b></summary>

请先确认 `Claude command` 是否正确，并在终端中测试该命令是否正常运行。
</details>

<details>
<summary><b>提示找不到命令</b></summary>

请检查命令是否在 PATH 中，或使用绝对路径。常见路径：
- `~/.npm-global/bin/claude`
- `/opt/homebrew/bin/claude`
</details>

<details>
<summary><b>AI 说修改了但文件没变？</b></summary>

请检查 Claude Code 配置中是否添加了 `bypassPermissions`。
</details>

<details>
<summary><b>撤销按钮在哪？</b></summary>

只有当 AI 通过 @ 引用或"包含当前笔记"真正修改了文件后，才会显示"撤销修改"按钮。
</details>

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（自动 watch）
npm run dev

# 生产构建
npm run build
```

## 📄 License

MIT License - 详见 [LICENSE](LICENSE)

## ❤️ 支持作者

如果你觉得这个插件有帮助，请考虑：
- ⭐ 给个 Star
- 🐛 提交 Issue 或 PR
- ☕ 请我喝杯咖啡

<div style="display:flex;gap:16px;flex-wrap:wrap;">
  <img src="asset/wx.png" alt="微信赞赏码" width="180" />
  <img src="asset/zfb.jpg" alt="支付宝收款码" width="180" />
</div>

---

Made with ❤️ by [KeloYuan](https://github.com/KeloYuan)
