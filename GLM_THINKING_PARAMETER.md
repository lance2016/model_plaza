# 智谱GLM思考参数格式修复

## 🎯 问题描述

智谱GLM模型使用的思考参数格式与豆包、DeepSeek不同：
- **豆包/DeepSeek**: 使用 `reasoning_effort` 参数，支持四级可调（minimal/low/medium/high）
- **智谱GLM**: 使用 `thinking` 参数，只有二进制开关（enabled/disabled）

## ✅ 已修复

更新了 `lib/ai.ts` 中的 `createLoggingFetch` 函数，根据不同的 provider ID 注入对应格式的参数。

### 代码逻辑

```typescript
switch (providerId) {
  case 'zhipu':
    // GLM models use thinking parameter
    if (reasoningEffort === 'minimal') {
      bodyJson.thinking = { type: 'disabled' };
    } else {
      bodyJson.thinking = { type: 'enabled' };
    }
    break;
  
  case 'doubao':
  case 'deepseek':
  default:
    // Most providers use reasoning_effort parameter
    bodyJson.reasoning_effort = reasoningEffort;
    break;
}
```

## 📋 不同Provider的参数对比

### 1. 智谱AI (GLM)

**参数格式**:
```json
{
  "thinking": {
    "type": "enabled" | "disabled"
  }
}
```

**Reasoning Effort 映射**:
- `minimal` → `{"thinking": {"type": "disabled"}}`
- `low` → `{"thinking": {"type": "enabled"}}`
- `medium` → `{"thinking": {"type": "enabled"}}`
- `high` → `{"thinking": {"type": "enabled"}}`

**说明**: GLM只有开关，没有程度调节。选择 minimal 会禁用思考，其他任何选项都会启用。

### 2. 豆包 (Doubao)

**参数格式**:
```json
{
  "reasoning_effort": "minimal" | "low" | "medium" | "high"
}
```

**完整示例**:
```json
{
  "model": "doubao-seed-1-8-251228",
  "reasoning_effort": "high",
  "messages": [...],
  "temperature": 0.7,
  "stream": true
}
```

### 3. DeepSeek

**参数格式**:
```json
{
  "reasoning_effort": "minimal" | "low" | "medium" | "high"
}
```

**完整示例**:
```json
{
  "model": "deepseek-reasoner",
  "reasoning_effort": "medium",
  "messages": [...],
  "temperature": 0.7,
  "stream": true
}
```

## 🔍 如何验证

### 智谱GLM模型

1. 选择 GLM-Zero-Preview 或 GLM-4.7-FLASH 模型
2. 设置 Reasoning Effort 为 "minimal"
3. 发送消息
4. 查看日志:
   ```
   ✅ Injected thinking (disabled) for GLM model
   Request Body: {
     "thinking": {"type": "disabled"}
   }
   ```

5. 改为 "high"
6. 发送消息
7. 查看日志:
   ```
   ✅ Injected thinking (enabled) for GLM model
   Request Body: {
     "thinking": {"type": "enabled"}
   }
   ```

### 豆包模型

1. 选择 doubao-seed-1.8 模型
2. 设置不同的 Reasoning Effort
3. 查看日志:
   ```
   ✅ Injected reasoning_effort: high
   Request Body: {
     "reasoning_effort": "high"
   }
   ```

## 📊 UI 行为

虽然智谱GLM只有二进制开关，但UI上仍然保留四个选项：

- **Minimal**: 禁用思考 → `{"type": "disabled"}`
- **Low**: 启用思考 → `{"type": "enabled"}`
- **Medium**: 启用思考 → `{"type": "enabled"}`
- **High**: 启用思考 → `{"type": "enabled"}`

这样做的好处：
1. ✅ UI统一，用户体验一致
2. ✅ 如果GLM未来支持程度调节，不需要改UI
3. ✅ 用户可以通过选择 minimal 来明确禁用思考

## 🎯 测试清单

- [ ] 智谱GLM + minimal → 日志显示 `thinking: disabled`
- [ ] 智谱GLM + high → 日志显示 `thinking: enabled`
- [ ] 豆包 + high → 日志显示 `reasoning_effort: high`
- [ ] DeepSeek + medium → 日志显示 `reasoning_effort: medium`

## 📝 相关文件

- `lib/ai.ts` - 修改了 `createLoggingFetch` 函数
- `DEBUG_REASONING_LOGS.md` - 更新了文档说明不同provider的格式

## 🎉 完成

现在系统支持不同provider的不同思考参数格式！
