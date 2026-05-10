# 需求：TUI 内索引构建（REQ-16）

REQ-16: /index 斜杠命令触发索引构建
描述：用户在 devpilot TUI 聊天界面输入 `/index /path/to/cpp-project`，devpilot 自动识别意图，调用索引构建流程，在 TUI 内展示构建进度（实时输出），完成后提示用户可开始使用代码检索功能
验收标准：
  - /index 命令在命令面板可见
  - 输入路径后触发索引构建，进度实时展示
  - 构建完成后自动激活 cpp-code-search 工具可用
  - 无需用户离开 TUI 或手动运行任何 CLI 命令
优先级：P1
