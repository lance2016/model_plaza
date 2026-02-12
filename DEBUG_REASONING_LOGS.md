# 调试 Reasoning Effort 请求日志指南

## 📋 更新内容

### ✅ 已添加详细的请求日志

1. **自定义 fetch 拦截器**: 拦截所有发送到 AI API 的请求
2. **自动注入思考参数**: 根据不同 provider 注入对应的参数格式
3. **详细的请求和响应日志**: 包括 URL、Headers、Body 和响应流

### 🔧 不同 Provider 的参数格式

#### 智谱AI (GLM)
使用 `thinking` 参数（二进制开关）：
```json
{
  "model": "glm-zero-preview",
  "thinking": {
    "type": "enabled"   // 或 "disabled"
  },
  "messages": [...]
}
```

- **minimal**: `{"thinking": {"type": "disabled"}}` - 禁用思考
- **low/medium/high**: `{"thinking": {"type": "enabled"}}` - 启用思考

#### 豆包 (Doubao)
使用 `reasoning_effort` 参数（四级可调）：
```json
{
  "model": "doubao-seed-1-8-251228",
  "reasoning_effort": "medium",  // minimal/low/medium/high
  "messages": [...]
}
```

#### DeepSeek
使用 `reasoning_effort` 参数（四级可调）：
```json
{
  "model": "deepseek-reasoner",
  "reasoning_effort": "high",  // minimal/low/medium/high
  "messages": [...]
}
```

## 🔍 如何查看日志

### 步骤 1: 打开终端查看服务器日志

在运行 `npm run dev` 的终端中，你会看到以下日志：

### 步骤 2: 发送测试消息

1. 选择一个思考模型（如豆包 doubao-seed-1.8）
2. 选择 reasoning effort（如 "high"）
3. 发送一条消息

### 步骤 3: 查看日志输出

你应该会看到类似以下的日志：

#### 豆包模型示例:
```
=== Chat API Request ===
Model ID: doubao-seed-1-8-251228
Reasoning Effort: high
Messages count: 1

Creating language model: { providerId: 'doubao', modelId: 'doubao-seed-1-8-251228', reasoningEffort: 'high' }

=== AI SDK HTTP Request ===
URL: https://ark.cn-beijing.volces.com/api/v3/chat/completions
Method: POST
✅ Injected reasoning_effort: high
Request Body: {
  "model": "doubao-seed-1-8-251228",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true,
  "reasoning_effort": "high"     <-- 豆包使用这个参数
}
```

#### 智谱GLM模型示例:
```
=== Chat API Request ===
Model ID: glm-zero-preview
Reasoning Effort: medium
Messages count: 1

Creating language model: { providerId: 'zhipu', modelId: 'glm-zero-preview', reasoningEffort: 'medium' }

=== AI SDK HTTP Request ===
URL: https://open.bigmodel.cn/api/paas/v4/chat/completions
Method: POST
✅ Injected thinking (enabled) for GLM model
Request Body: {
  "model": "glm-zero-preview",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true,
  "thinking": {
    "type": "enabled"     <-- GLM使用这个参数
  }
}
```

#### 如果选择 minimal (不思考):
```
✅ Injected thinking (disabled) for GLM model
Request Body: {
  ...
  "thinking": {
    "type": "disabled"
  }
}
```

## 🎯 重点关注

### 1. 请求 URL
```
# 豆包
URL: https://ark.cn-beijing.volces.com/api/v3/chat/completions

# 智谱GLM
URL: https://open.bigmodel.cn/api/paas/v4/chat/completions

# DeepSeek
URL: https://api.deepseek.com/v1/chat/completions
```

### 2. 请求体中的思考参数

#### 豆包和DeepSeek: reasoning_effort
```json
{
  "model": "...",
  "reasoning_effort": "high",  <-- 确认这个字段存在
  ...
}
```

#### 智谱GLM: thinking
```json
{
  "model": "glm-zero-preview",
  "thinking": {
    "type": "enabled"  <-- 确认这个字段存在
  },
  ...
}
```

### 3. 响应流中的类型

豆包返回的思考内容类型：
```json
{"type": "reasoning-content", "content": "..."}  <-- 豆包格式
```

智谱GLM返回的思考内容类型：
```json
{"type": "reasoning-delta", "delta": "..."}  <-- GLM格式
```

DeepSeek返回的思考内容类型：
```json
{"type": "reasoning-delta", "delta": "..."}  <-- DeepSeek格式
```

AI SDK 期望的标准格式：
```json
{"type": "reasoning-delta", "text": "..."}  <-- AI SDK 格式
```

## ⚠️ reasoning-content vs reasoning-delta 的问题

你发现的关键问题：
- **豆包返回**: `{"type":"reasoning-content"}`
- **浏览器看到**: `{"type":"reasoning-delta"}`

这说明 AI SDK 正在将豆包的 `reasoning-content` 转换为标准的 `reasoning-delta` 格式。

### 可能的原因：

1. **AI SDK 自动转换**: `@ai-sdk/openai-compatible` 包可能会自动将不同 provider 的格式标准化
2. **命名不一致**: 豆包使用 `reasoning-content`，但 AI SDK 规范使用 `reasoning-delta`

### 验证方法：

在终端日志中查找：
```
📦 Stream chunk: data: {"type":"reasoning-content",...}
```

如果看到 `reasoning-content`，说明豆包确实返回了思考内容，但 AI SDK 做了转换。

## 🔧 如果没有看到思考参数

如果日志中没有显示 `✅ Injected ...` 消息，请：

1. **检查是否选择了思考模型**
2. **检查 reasoning effort 是否为空**
3. **查看是否有错误日志**
4. **确认 provider ID**:
   - 豆包: `doubao`
   - 智谱: `zhipu`
   - DeepSeek: `deepseek`

## 📊 不同模型的响应格式对比

### DeepSeek
```json
{"type": "reasoning-delta", "delta": "思考内容"}
```

### 豆包 (Doubao)
```json
{"type": "reasoning-content", "content": "思考内容"}
```

### 智谱 (Zhipu GLM)
```json
{"type": "reasoning-delta", "delta": "思考内容"}
```

## 🎯 下一步

1. 发送一条消息到豆包模型
2. 复制终端中的完整日志
3. 查看 `Request Body` 是否包含 `reasoning_effort`
4. 查看 `Stream chunk` 的具体格式

如果需要更详细的调试，可以增加日志级别或使用浏览器的 Network 标签查看实际的 HTTP 请求。
