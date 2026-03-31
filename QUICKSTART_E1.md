# 快速入门：E1 需求理解与结构化

> **时间:** 5 分钟快速开始

## 🎯 30 秒了解 E1

E1 将自然语言需求转换为**结构化卡片**（JSON + Markdown），包含：
- 清晰的验收标准（BDD 格式）
- 业务约束和非功能需求
- 时序图和接口定义
- 自动编号（REQ-YYYY-MM-NNN）

## 💻 最简单的例子

### 1️⃣ 运行命令

```bash
/structurize-req "用户可以通过手机应用查看账户余额"
```

### 2️⃣ 查看输出

```bash
cat .opencode/requirements/REQ-2026-03-001.md
```

### 3️⃣ 得到结果

一个完整的需求卡片文件，包含：
```markdown
# REQ-2026-03-001: 用户查看账户余额

**优先级:** P1 (高)
**状态:** 未分配

## 目标
用户能快速查看账户当前余额...

## 验收标准

当用户成功登录后：
- **Given** 用户已登录应用
- **When** 用户点击"账户"标签页
- **Then** 立即显示当前账户余额
- **And** 余额更新延迟 ≤ 2 秒

## 约束条件
- 应该支持至少 10 种货币
- 余额查询响应时间 ≤ 500ms

## 业务接口定义
```
GET /api/account/balance
Response: { balance: number, currency: string }
```
```

✅ **完成！** 自动生成的需求卡片可直接使用。

---

## 📋 常用命令速查

```bash
# 单条需求
/structurize-req "需求文本"

# 批量处理 (5 条)
/structurize-req --batch 5 --markdown requirements.txt

# 指定输出目录
/structurize-req "需求" --output reqs/

# 指定优先级
/structurize-req "需求" --priority P0

# 输出为 JSON
/structurize-req "需求" --format json

# 关联项目
/structurize-req "需求" --project "航电核心"
```

---

## 📊 批量生成示例

### 场景: 有 5 条需求，一次性生成卡片

**创建 requirements.txt:**
```
1. 用户可以通过手机应用查看账户余额
2. 用户可以转账给其他账户持有人
3. 系统应该在转账后发送确认短信
4. 转账金额必须在 1000-100000 之间
5. 系统应该记录所有交易历史
```

**运行命令:**
```bash
/structurize-req --batch 5 --markdown requirements.txt
```

**结果:**
```
✓ REQ-2026-03-001: 用户查看账户余额
✓ REQ-2026-03-002: 用户转账功能
✓ REQ-2026-03-003: 确认短信通知
✓ REQ-2026-03-004: 转账金额限制
✓ REQ-2026-03-005: 交易历史记录

✓ 全部完成 (耗时: 32s)
```

---

## 🎓 理解生成的卡片

### 优先级含义

| 优先级 | 含义 | 示例 |
|-------|------|------|
| P0 | 🔴 关键，必须做 | 支付、登录、安全 |
| P1 | 🟡 重要，应该做 | 查询、转账、报表 |
| P2 | 🟢 普通，可延后 | 搜索、快捷菜单 |
| P3 | ⚪ 可选，有空再做 | 动画、主题 |

### 验收标准的 BDD 格式

```
Given [前置条件]       ← 测试开始时的状态
When  [执行操作]       ← 触发的动作
Then  [期望结果]       ← 应该发生什么
And   [额外检查]       ← 其他需要验证的
```

**示例:**
```
Given 用户已登录应用
When  用户点击"账户"标签页
Then  立即显示当前账户余额
And   余额更新延迟 ≤ 2 秒
```

---

## ⚡ 技巧和建议

### 💡 Tip 1: 写出好的需求文本

```
✗ 差: "做个登录功能"
✓ 好: "用户使用用户名和密码登录系统，支持3次失败锁定，登录成功后显示主页"
```

### 💡 Tip 2: 重复使用生成的卡片

E1 生成的卡片可用于：
- ✓ 开发的需求参考
- ✓ E2 测试生成的输入（--req 选项）
- ✓ 团队协作和评审
- ✓ 变更跟踪和追溯

### 💡 Tip 3: 定期更新

```bash
# 需求有变更时，重新生成
/structurize-req "更新的需求文本" \
  --output .opencode/requirements/REQ-2026-03-001.md \
  --overwrite
```

---

## 🔗 后续步骤

✅ **E1 完成** → 用结构化卡片生成测试

```bash
# 将需求关联到 E2 测试生成
/gen-test src/api.cpp --req REQ-2026-03-001
```

更多详情，查看完整文档：
- [`USER_GUIDE.md`](USER_GUIDE.md) - 详细用户手册
- [`.opencode/commands/structurize-req.md`](.opencode/commands/structurize-req.md) - 命令文档

---

**祝你使用愉快！** 🎉
