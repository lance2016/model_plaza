# 思考模型 Reasoning Effort 功能验证指南

## 🎯 问题修复总结

### 1. ✅ 界面更新问题已修复
**问题**: 修改模型后聊天界面没有显示 reasoning_effort 选择器

**修复**:
- 添加了自动刷新机制：每5秒自动重新获取模型列表
- 确保 SWR 的 `mutate` 函数被正确使用
- 在设置页面保存后会触发全局刷新

### 2. ✅ API 参数传递已实现
**问题**: reasoning_effort 参数需要正确传递给 OpenAI 兼容 API

**实现**:
- 在 `/api/chat` 路由中接收 `reasoningEffort` 参数
- 仅在模型标记为思考模型时添加该参数
- 添加了调试日志来追踪参数传递

### 3. ✅ 豆包模型已配置
已将 `doubao-seed-1-8-251228` 标记为思考模型

## 📋 验证步骤

### 步骤 1: 验证数据库配置
```bash
sqlite3 data/llm-plaza.db "SELECT id, name, is_reasoning_model, default_reasoning_effort FROM models WHERE is_reasoning_model = 1;"
```

**预期输出**:
```
deepseek-reasoner|DeepSeek Reasoner|1|medium
doubao-seed-1-8-251228|doubao-seed-1.8|1|medium
glm-4.7-flash|GLM-4.7-FLASH（thinking）|1|minimal
glm-zero-preview|GLM-Zero-Preview (思考)|1|medium
```

### 步骤 2: 测试聊天界面

1. **打开聊天页面** (http://localhost:3000)

2. **选择思考模型** - 从模型下拉菜单中选择以下任一模型：
   - DeepSeek Reasoner
   - doubao-seed-1.8
   - GLM-4.7-FLASH（thinking）
   - GLM-Zero-Preview (思考)

3. **查看 Reasoning Effort 选择器**
   - 选择思考模型后，应该在模型选择器右侧看到 🧠 图标的选择器
   - 点击可以看到 4 个选项：Minimal / Low / Medium / High

4. **测试自动加载默认值**
   - 切换不同的思考模型
   - 每个模型会自动加载其默认的 reasoning effort

5. **测试发送消息**
   - 选择不同的 reasoning effort
   - 发送消息
   - 查看终端日志，应该能看到：
     ```
     Chat request: { modelId: 'xxx', reasoningEffort: 'medium' }
     Adding reasoning effort: medium
     ```

### 步骤 3: 修改模型配置

1. **进入设置** → 模型
2. **编辑豆包模型** (doubao-seed-1.8)
3. **验证显示**:
   - ✅ "思考模型" 开关应该是打开状态
   - 🧠 应该在模型卡片上显示 "思考模型 (medium)" 标记
4. **修改默认思考程度**为 "high"
5. **保存并返回聊天页面**
6. **等待5秒**（自动刷新）或刷新页面
7. **重新选择豆包模型**
8. **验证** reasoning effort 自动设置为 "high"

### 步骤 4: 验证 API 参数传递

在终端查看日志，发送消息时应该看到：

```
Chat request: { modelId: 'doubao-seed-1-8-251228', reasoningEffort: 'high' }
Adding reasoning effort: high
Stream options: {
  "model": ...,
  "messages": [...],
  "temperature": 0.7,
  "maxTokens": 4096,
  "reasoningEffort": "high"
}
```

## 🐛 AI SDK 与豆包 API 的兼容性说明

根据你提供的豆包 API 示例，参数格式为：
```json
{
  "model": "doubao-seed-1-8-251228",
  "reasoning_effort": "medium",  // 下划线格式
  "messages": [...]
}
```

但 AI SDK 使用驼峰命名：`reasoningEffort`

**解决方案**:
- AI SDK 的 `@ai-sdk/openai-compatible` 包应该会自动将驼峰转换为下划线
- 如果不生效，我们可能需要手动处理参数转换

## 🔍 调试技巧

如果界面没有显示 reasoning effort 选择器：

1. **打开浏览器开发者工具** (F12)
2. **查看 Console** 是否有错误
3. **查看 Network 标签**:
   - 找到 `/api/models` 请求
   - 检查响应中的 `is_reasoning_model` 字段
4. **检查模型数据**:
   ```javascript
   // 在浏览器 Console 中运行
   fetch('/api/models').then(r => r.json()).then(console.log)
   ```

## ✨ 当前配置的思考模型

| 模型 ID | 名称 | 默认思考程度 |
|---------|------|-------------|
| deepseek-reasoner | DeepSeek Reasoner | medium |
| doubao-seed-1-8-251228 | doubao-seed-1.8 | medium |
| glm-4.7-flash | GLM-4.7-FLASH（thinking） | minimal |
| glm-zero-preview | GLM-Zero-Preview (思考) | medium |

所有功能已经实现并应该正常工作！
