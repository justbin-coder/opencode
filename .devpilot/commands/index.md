---
name: index
description: 为指定 C++ 代码库构建离线语义索引，支持后续需求-代码关联检索
---

## 命令说明

`/index` 为指定的 C++ 代码库构建离线语义索引（Embedding），构建完成后可通过 `cpp-code-search` 工具进行需求-代码关联检索。

**用法：** `/index <C++代码库路径>`

**示例：**
```
/index /path/to/my-cpp-project
```

**前置条件：** 需要可用的 Embedding API 服务（OpenAI-compatible `/v1/embeddings` 端点）。
- devpilot 默认从 `~/.config/devpilot/devpilot.json` 中读取 provider 配置
- 也可通过环境变量覆盖：`EMBEDDING_API_URL`、`EMBEDDING_API_KEY`、`EMBEDDING_MODEL`

---

## 执行逻辑

如果 `$ARGUMENTS` 为空，向用户展示上述用法说明，**不执行任何命令**，等待用户提供路径后再执行。

如果 `$ARGUMENTS` 非空：

1. 先向用户说明即将执行的操作：为 `$ARGUMENTS` 构建语义索引，索引将写入 `$ARGUMENTS/.opencode-index/`，预计耗时数分钟。
2. 验证路径存在后，使用 BashTool 执行：
   ```
   devpilot index $ARGUMENTS
   ```
   **必须设置 timeout: 600000**（10 分钟，索引构建耗时较长）。
3. 构建完成后，报告：
   - 索引写入位置：`$ARGUMENTS/.opencode-index/`
   - 扫描的文件数和提取的代码单元数
4. 如果路径不存在，报错提示，不执行构建。
5. 如果 Embedding API 报错（如模型不存在、服务不可达），提示用户检查 Embedding 配置。
