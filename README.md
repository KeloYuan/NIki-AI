# Niki AI

在 Obsidian 侧边栏里使用 Claude Code 的对话体验，并把生成内容直接写回当前笔记。

## 支持作者
我是一个穷学生，如果这个插件对你有帮助的话，请尽力支持我。下面是两个打赏二维码，万分感谢！

<div style="display:flex;gap:16px;flex-wrap:wrap;">
  <img src="asset/wx.png" alt="微信赞赏码" width="220" />
  <img src="asset/zfb.jpg" alt="支付宝收款码" width="220" />
</div>

## 功能亮点
- 侧边栏原生对话 UI
- 支持把当前笔记内容作为上下文发送
- 一键把回复插入到当前笔记
- 默认提示词可自定义
- 通过本地 Claude Code CLI 运行（可用 {prompt} 或 stdin）

## 安装方式（开发版）
目前提供开发版安装，适合自用或调试。

1. 进入插件项目目录并安装依赖
   - `npm install`
2. 构建插件
   - `npm run build`
3. 把以下文件复制到你的 Obsidian vault 的
   `.obsidian/plugins/niki-ai/` 目录下
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. 在 Obsidian 的第三方插件里启用 Niki AI

## 使用教程
1. 打开右侧边栏，点击插件图标或命令面板执行
   `Open Niki AI Sidebar`
2. 在侧边栏输入问题并发送
3. 勾选 `Include current note` 可把当前笔记作为上下文
4. 如果需要把回复写入当前笔记，点击 `Insert to note`

## 配置教程
打开 Obsidian 设置 -> 插件 -> Niki AI：

### Claude command
用于运行 Claude Code 的命令。两种模式二选一：

- 直接内联 prompt：
  - 示例：`claude -p "{prompt}"`
  - 适合一次性请求
- 通过 stdin：
  - 示例：`claude`
  - 插件会把 prompt 写入 stdin

### Default prompt
每次请求都会自动拼在最前面的系统提示词。
你可以在这里写你的笔记风格、输出格式或写作偏好。

### Working directory
Claude 命令的工作目录。默认使用当前 vault 路径。
如果你的 Claude 工具依赖某个项目路径，可以在这里手动指定。

## 常见问题
### 1) 没有任何输出
请先确认 `Claude command` 是否正确可用，并确保在终端里能正常运行。

### 2) 提示找不到命令
请检查命令是否在 PATH 里，或使用绝对路径。

### 3) 插件能直接改文件吗？
目前支持把回复插入到当前笔记。
如果你希望自动应用 patch 或精确替换，可以继续扩展插件逻辑。

## 计划中的增强
- 自动应用补丁
- 会话历史持久化
- 更强的上下文选择（多文件、多标签）
- 与 Claude Code 配置文件自动对接

## 开发
开发模式构建（自动 watch）：
- `npm run dev`

## License
MIT
