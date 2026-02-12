# 高级聊天参数配置指南

## 🎯 功能概述

新增了高级设置面板，允许用户在聊天时动态配置以下参数：

- **系统提示词 (System Prompt)**: 定义 AI 的角色和行为方式
- **温度 (Temperature)**: 控制输出的随机性和创造性
- **最大 Tokens**: 限制生成内容的最大长度
- **Top P**: 核采样，控制词汇选择的多样性
- **频率惩罚 (Frequency Penalty)**: 减少重复内容
- **存在惩罚 (Presence Penalty)**: 鼓励谈论新话题

## 🚀 使用方法

### 1. 打开高级设置

在聊天界面头部右上角，点击齿轮图标 <Settings /> 打开高级设置面板。

### 2. 配置参数

#### 系统提示词
```
你是一个专业的Python编程助手，擅长解释代码并提供最佳实践建议。
```

**使用场景**:
- 角色扮演：让 AI 扮演特定角色（如老师、医生、编程助手）
- 风格控制：指定回答的语气和风格（如正式、幽默、简洁）
- 行为约束：限制 AI 的行为范围（如"只回答技术问题"）

#### 温度 (Temperature)
**范围**: 0.0 - 2.0  
**默认**: 0.7

| 值 | 效果 | 适用场景 |
|----|------|---------|
| 0.0 - 0.3 | 非常确定和一致 | 事实性问答、代码生成、数学计算 |
| 0.4 - 0.7 | 平衡创造性和确定性 | 日常对话、解释说明 |
| 0.8 - 1.2 | 更有创造性 | 创意写作、头脑风暴 |
| 1.3 - 2.0 | 非常随机 | 艺术创作、实验性内容 |

**示例**:
```
Temperature = 0.2
Q: 1+1等于几？
A: 2

Temperature = 1.5
Q: 1+1等于几？
A: 这个问题让我想到了数字的和谐...可能是2，也可能是一个全新的概念...
```

#### 最大 Tokens
**范围**: 256 - 32000  
**默认**: 4096

控制生成内容的最大长度。注意：
- 较小的值响应更快，成本更低
- 较大的值适合长文本生成
- 不同模型对 token 的支持上限不同

**参考**:
- 256 tokens ≈ 短段落
- 1024 tokens ≈ 1-2 页文字
- 4096 tokens ≈ 3-4 页文字
- 16000+ tokens ≈ 长文档

#### Top P (核采样)
**范围**: 0.0 - 1.0  
**默认**: 1.0

控制模型考虑的词汇范围：
- **1.0**: 考虑所有可能的词（最高多样性）
- **0.9**: 只考虑概率总和达到90%的词（推荐）
- **0.5**: 只考虑最可能的50%词（较低多样性）

**建议**:
- 与 Temperature 二选一调整
- 创意任务：保持 1.0
- 精确任务：降低到 0.9 或更低

#### 频率惩罚 (Frequency Penalty)
**范围**: -2.0 - 2.0  
**默认**: 0

| 值 | 效果 |
|----|------|
| 负值 (-2 到 -0.1) | 鼓励重复 |
| 0 | 无影响 |
| 正值 (0.1 到 2) | 减少重复 |

**使用场景**:
- **0.5 - 1.0**: 避免重复表述（推荐用于长文本）
- **1.0 - 2.0**: 强制多样化表达（创意写作）

#### 存在惩罚 (Presence Penalty)
**范围**: -2.0 - 2.0  
**默认**: 0

| 值 | 效果 |
|----|------|
| 负值 | 倾向于深入讨论当前话题 |
| 0 | 无影响 |
| 正值 | 鼓励引入新话题 |

**使用场景**:
- **0.3 - 0.6**: 保持话题多样性（对话助手）
- **-0.5 - 0**: 深入分析单一话题（技术讨论）

## 💡 常用配置预设

### 代码助手
```
系统提示词: 你是一个专业的编程助手，提供清晰、准确的代码和解释。
Temperature: 0.2
Max Tokens: 4096
Top P: 0.9
Frequency Penalty: 0
Presence Penalty: 0
```

### 创意写作
```
系统提示词: 你是一位富有想象力的作家，善于创作引人入胜的故事。
Temperature: 1.0
Max Tokens: 8192
Top P: 1.0
Frequency Penalty: 0.5
Presence Penalty: 0.3
```

### 学术研究
```
系统提示词: 你是一位严谨的学术研究助手，提供准确、有据可查的信息。
Temperature: 0.3
Max Tokens: 4096
Top P: 0.9
Frequency Penalty: 0.2
Presence Penalty: 0.1
```

### 客服机器人
```
系统提示词: 你是一位友好、专业的客服代表，致力于解决客户问题。
Temperature: 0.5
Max Tokens: 2048
Top P: 1.0
Frequency Penalty: 0.3
Presence Penalty: 0.2
```

### 头脑风暴
```
系统提示词: 你是一位创新思维专家，善于提出独特的想法和解决方案。
Temperature: 1.2
Max Tokens: 4096
Top P: 1.0
Frequency Penalty: 0.7
Presence Penalty: 0.5
```

## 🔧 技术实现

### 前端组件
- **文件**: `/components/chat/advanced-settings.tsx`
- **功能**: 侧边栏面板，包含所有参数的 UI 控件
- **组件**:
  - `Slider`: 用于数值参数（温度、Top P、惩罚值）
  - `Textarea`: 用于系统提示词输入

### 主页面集成
- **文件**: `/app/page.tsx`
- **变化**:
  - 添加 `chatConfig` 状态管理
  - 使用 `useRef` 确保 transport 始终读取最新配置
  - 在头部添加高级设置按钮
  - 新对话时重置配置为默认值

### 后端 API
- **文件**: `/app/api/chat/route.ts`
- **处理**:
  - 接收 `chatConfig` 参数
  - 系统提示词注入到消息列表开头
  - 覆盖模型默认参数（如果用户自定义）
  - 传递 `topP`, `frequencyPenalty`, `presencePenalty` 到 AI SDK

### 数据流

```
用户配置
  ↓
[AdvancedSettings 组件]
  ↓
chatConfig state (app/page.tsx)
  ↓
chatConfigRef (useRef)
  ↓
DefaultChatTransport body
  ↓
POST /api/chat (chatConfig 参数)
  ↓
注入 system message (如果有)
  ↓
streamText({
  messages: [system, ...userMessages],
  temperature: config.temperature,
  maxTokens: config.maxTokens,
  topP: config.topP,
  frequencyPenalty: config.frequencyPenalty,
  presencePenalty: config.presencePenalty,
})
  ↓
AI Provider API
```

## 📝 注意事项

1. **参数兼容性**:
   - 不是所有 AI 提供商都支持所有参数
   - 例如某些模型可能不支持 `frequencyPenalty`
   - AI SDK 会自动忽略不支持的参数

2. **成本影响**:
   - `maxTokens` 直接影响 API 调用成本
   - 建议根据实际需求设置合理的上限

3. **性能权衡**:
   - 较高的 `temperature` 和 `topP` 可能导致不一致的结果
   - 对于需要确定性输出的场景，使用较低的值

4. **系统提示词**:
   - 会在每次对话时添加到消息开头
   - 会消耗额外的 token
   - 不同模型对系统提示词的遵循程度不同

5. **配置重置**:
   - 点击"新对话"时，所有配置会重置为默认值
   - 确保在开始新对话前检查配置

## 🔍 调试

后端会打印详细日志：

```
=== Chat API Request ===
Model ID: gpt-4o
Reasoning Effort: undefined
Chat Config: {
  systemPrompt: '你是一个编程助手',
  temperature: 0.2,
  maxTokens: 4096,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0
}
Messages count: 2

Stream options (without model object): {
  messages: 3 messages,  // +1 for system prompt
  hasSystemPrompt: true,
  temperature: 0.2,
  maxTokens: 4096,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0
}
```

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `/components/chat/advanced-settings.tsx` | 高级设置 UI 组件 |
| `/app/page.tsx` | 主聊天页面，集成配置 |
| `/app/api/chat/route.ts` | 聊天 API，处理配置参数 |

## 🚀 未来改进

- [ ] 支持保存配置预设
- [ ] 从数据库加载用户的默认配置
- [ ] 为不同模型提供推荐配置
- [ ] 显示参数对成本的影响
- [ ] 支持导入/导出配置
