# 思考模型配置指南

## 🎯 核心功能

支持不同 AI 提供商的思考模型（Reasoning Models），包括：
- **通用**: 为所有模型添加 `stream_options` 用于计费追踪
- **智谱 AI (GLM)**: Binary 模式（启用/禁用思考）
- **千问 (Qwen)**: Binary 模式（启用/禁用思考）
- **豆包 (Doubao) / DeepSeek**: Levels 模式（四档思考强度）

## 📋 通用配置

### stream_options - 用于计费

**所有模型**在流式请求时都需要添加：

```json
{
  "stream": true,
  "stream_options": {
    "include_usage": true
  }
}
```

这个参数用于追踪 token 使用量，以便计费。

## 🧠 思考模型参数格式

### 1. 智谱 AI (GLM) - Binary Mode

**参数格式**:
```json
{
  "thinking": {
    "type": "enabled"  // 或 "disabled"
  }
}
```

**模型配置**:
- `is_reasoning_model`: 1
- `reasoning_type`: `'binary'`
- `default_reasoning_effort`: `'enabled'` 或 `'disabled'`

**UI 显示**: 二选一开关
- 禁用思考
- 启用思考

### 2. 千问 (Qwen) - Binary Mode

**参数格式**:
```json
{
  "enable_thinking": true  // 或 false
}
```

**API 示例**:
```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
-H "Authorization: Bearer $DASHSCOPE_API_KEY" \
-H "Content-Type: application/json" \
-d '{
    "model": "qwen-plus",
    "messages": [{"role": "user", "content": "你是谁"}],
    "stream": true,
    "stream_options": {"include_usage": true},
    "enable_thinking": true
}'
```

**模型配置**:
- `is_reasoning_model`: 1
- `reasoning_type`: `'binary'`
- `default_reasoning_effort`: `'enabled'` 或 `'disabled'`

**UI 显示**: 二选一开关
- 禁用思考
- 启用思考

### 3. 豆包 (Doubao) / DeepSeek - Levels Mode

**参数格式**:
```json
{
  "reasoning_effort": "medium"  // minimal/low/medium/high
}
```

**模型配置**:
- `is_reasoning_model`: 1
- `reasoning_type`: `'levels'`
- `default_reasoning_effort`: `'minimal'` / `'low'` / `'medium'` / `'high'`

**UI 显示**: 四档选择器
- Minimal (不思考)
- Low (低)
- Medium (中)
- High (高)

## 💻 技术实现

### 数据库表结构 (models)

```sql
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_reasoning_model INTEGER DEFAULT 0,
  reasoning_type TEXT DEFAULT 'levels',  -- 'binary' or 'levels'
  default_reasoning_effort TEXT DEFAULT 'medium',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);
```

### 当前配置

| Provider | Model | is_reasoning | reasoning_type | default_reasoning_effort |
|----------|-------|--------------|----------------|-------------------------|
| zhipu | glm-zero-preview | 1 | binary | enabled |
| qwen | qwen-plus | 1 | binary | enabled |
| qwen | qwen3-max | 1 | binary | enabled |
| deepseek | deepseek-reasoner | 1 | levels | medium |
| doubao | doubao-seed-* | 1 | levels | medium |

### 核心代码逻辑

#### lib/ai.ts - 请求拦截器

```typescript
const createLoggingFetch = (providerId: string, reasoningEffort?: string) => {
  return async (url: string | URL | Request, init?: RequestInit) => {
    if (init?.body) {
      const bodyJson = JSON.parse(bodyString);
      
      // 1. 为所有流式请求添加 usage tracking
      if (bodyJson.stream) {
        bodyJson.stream_options = {
          include_usage: true
        };
        console.log('✅ Added stream_options for usage tracking');
      }
      
      // 2. 根据 provider 添加思考参数
      if (reasoningEffort) {
        switch (providerId) {
          case 'zhipu':
            // GLM 使用 thinking 参数
            bodyJson.thinking = { 
              type: reasoningEffort === 'disabled' ? 'disabled' : 'enabled'
            };
            console.log(`✅ Injected thinking (${bodyJson.thinking.type}) for GLM model`);
            break;
          
          case 'qwen':
            // 千问使用 enable_thinking 参数
            bodyJson.enable_thinking = reasoningEffort !== 'disabled' && reasoningEffort !== 'minimal';
            console.log(`✅ Injected enable_thinking (${bodyJson.enable_thinking}) for Qwen model`);
            break;
          
          case 'doubao':
          case 'deepseek':
          default:
            // 其他提供商使用 reasoning_effort 参数
            bodyJson.reasoning_effort = reasoningEffort;
            console.log('✅ Injected reasoning_effort:', reasoningEffort);
            break;
        }
      }
      
      init = { ...init, body: JSON.stringify(bodyJson) };
    }
    
    return fetch(url, init);
  };
};
```

#### components/chat/reasoning-effort-selector.tsx - UI 组件

```tsx
export function ReasoningEffortSelector({ 
  reasoningEffort, 
  setReasoningEffort,
  reasoningType = 'levels'
}: Props) {
  return (
    <ToggleGroup type="single" value={reasoningEffort} onValueChange={setReasoningEffort}>
      {reasoningType === 'binary' ? (
        <>
          <ToggleGroupItem value="disabled">禁用思考</ToggleGroupItem>
          <ToggleGroupItem value="enabled">启用思考</ToggleGroupItem>
        </>
      ) : (
        <>
          <ToggleGroupItem value="minimal">Minimal</ToggleGroupItem>
          <ToggleGroupItem value="low">Low</ToggleGroupItem>
          <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
          <ToggleGroupItem value="high">High</ToggleGroupItem>
        </>
      )}
    </ToggleGroup>
  );
}
```

## 🔍 调试方法

### 查看终端日志

发送消息时，终端会打印：

```
=== AI SDK HTTP Request ===
URL: https://...
Method: POST
Request Body: {
  "model": "qwen-plus",
  "messages": [...],
  "stream": true,
  "stream_options": {"include_usage": true},  ✅ 所有模型都有
  "enable_thinking": true  ✅ 千问特有
}
=== End Request ===

✅ Added stream_options for usage tracking
✅ Injected enable_thinking (true) for Qwen model
```

### 测试验证清单

- [ ] **GLM 模型**
  - [ ] 选择"禁用思考" → 日志显示 `thinking (disabled)`
  - [ ] 选择"启用思考" → 日志显示 `thinking (enabled)`
  - [ ] 请求体包含 `"thinking": {"type": "..."}`

- [ ] **千问模型**
  - [ ] 选择"禁用思考" → 日志显示 `enable_thinking (false)`
  - [ ] 选择"启用思考" → 日志显示 `enable_thinking (true)`
  - [ ] 请求体包含 `"enable_thinking": true/false`

- [ ] **豆包/DeepSeek**
  - [ ] 选择不同档位 → 日志显示 `reasoning_effort: medium`
  - [ ] 请求体包含 `"reasoning_effort": "..."`

- [ ] **所有模型**
  - [ ] 每个流式请求都包含 `"stream_options": {"include_usage": true}`

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `/lib/ai.ts` | 请求拦截器，注入参数 |
| `/lib/db.ts` | 数据库模型定义 |
| `/app/api/chat/route.ts` | 聊天 API 路由 |
| `/app/page.tsx` | 主聊天界面 |
| `/components/chat/reasoning-effort-selector.tsx` | 思考程度选择器 |
| `/components/settings/model-form.tsx` | 模型配置表单 |
| `/app/settings/models/page.tsx` | 模型管理页面 |

## 🚀 如何添加新的思考模型

1. **更新数据库**:
   ```sql
   UPDATE models 
   SET is_reasoning_model = 1,
       reasoning_type = 'binary',  -- 或 'levels'
       default_reasoning_effort = 'enabled'  -- 或 'medium'
   WHERE id = 'your-model-id';
   ```

2. **更新 lib/db.ts**:
   ```typescript
   const PRESET_MODELS = [
     { 
       id: 'your-model-id', 
       provider_id: 'your-provider', 
       name: 'Model Name',
       is_reasoning: true, 
       reasoning_type: 'binary'  // 或 'levels'
     },
   ];
   ```

3. **如果有特殊参数格式，更新 lib/ai.ts**:
   ```typescript
   switch (providerId) {
     case 'your-provider':
       bodyJson.your_custom_param = reasoningEffort;
       break;
   }
   ```

4. **刷新页面验证**

## 📝 版本历史

- **2026-02-12**: 
  - 添加千问 (Qwen) 支持，使用 `enable_thinking` 参数
  - 为所有模型添加 `stream_options.include_usage` 用于计费
  - 更新文档结构

- **2026-02-11**: 
  - 智谱 AI (GLM) 支持 `thinking` 参数
  - 添加 `reasoning_type` 字段区分 binary/levels 模式
  - 实现动态 UI 适配
