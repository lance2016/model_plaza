# LLM Plaza

🎯 一个功能强大的多模型 AI 聊天平台，支持多家主流 AI 提供商，提供丰富的配置选项和思考模型支持。

## ✨ 主要特性

### 🤖 多模型支持
- **OpenAI**: GPT-4o, GPT-4o Mini
- **Anthropic**: Claude Sonnet 4, Claude 3.5 Haiku
- **Google**: Gemini 2.0 Flash
- **DeepSeek**: DeepSeek Chat, DeepSeek Reasoner
- **智谱 AI (GLM)**: GLM-4-Flash, GLM-Zero-Preview
- **千问 (Qwen)**: Qwen Plus, Qwen3-MAX
- **月之暗面 (Moonshot)**: Moonshot v1 8K
- **豆包 (Doubao)**: 支持思考模型

### 🧠 思考模型支持
- **Binary 模式** (GLM, Qwen): 启用/禁用思考
- **Levels 模式** (DeepSeek, Doubao): Minimal/Low/Medium/High 四档
- 实时显示思考过程
- 可动态切换思考程度

### ⚙️ 高级参数配置
- **系统提示词**: 自定义 AI 角色和行为
- **Temperature**: 0.0-2.0，控制输出随机性
- **Max Tokens**: 256-32000，限制生成长度
- **Top P**: 0.0-1.0，核采样控制
- **Frequency Penalty**: -2.0-2.0，减少重复
- **Presence Penalty**: -2.0-2.0，鼓励新话题

### 💬 对话管理
- 多对话历史记录
- 自动保存对话
- 一键清空历史
- 快速切换对话

### 🎨 用户体验
- 响应式设计，支持移动端
- 实时流式输出
- 暗色模式支持
- 直观的配置界面

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/llm-plaza.git
cd llm-plaza

# 安装依赖
npm install

# 初始化数据库
npm run seed
```

### 配置

1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local`，配置你需要的 API Keys

3. 或者在应用中通过设置页面配置 API Keys

### 运行

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

打开 [http://localhost:3000](http://localhost:3000) 开始使用。

## 📖 功能详解

详细的配置说明和使用方法请参考下方各个章节。

## 🗂️ 项目结构

```
llm-plaza/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── chat/         # 聊天 API
│   │   ├── models/       # 模型管理
│   │   ├── providers/    # 提供商管理
│   │   ├── conversations/# 对话管理
│   │   └── settings/     # 设置管理
│   ├── settings/         # 设置页面
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 主聊天页面
├── components/            # React 组件
│   ├── chat/             # 聊天相关组件
│   ├── settings/         # 设置相关组件
│   ├── ui/               # UI 基础组件 (shadcn/ui)
│   └── sidebar.tsx       # 侧边栏
├── lib/                   # 核心逻辑
│   ├── ai.ts             # AI SDK 集成
│   ├── db.ts             # 数据库操作
│   └── utils.ts          # 工具函数
├── data/                  # 数据存储
│   └── llm-plaza.db      # SQLite 数据库
└── public/               # 静态资源
```

## 🔧 技术栈

- **框架**: Next.js 15 (App Router)
- **UI**: React 19, TailwindCSS, shadcn/ui
- **AI SDK**: Vercel AI SDK 4.x
- **数据库**: SQLite (better-sqlite3)
- **状态管理**: React Hooks, SWR
- **样式**: TailwindCSS, Radix UI
- **类型**: TypeScript

## 🎯 核心功能说明

### 思考模型

支持两种思考模式：

1. **Binary 模式** (智谱 GLM, 千问 Qwen)
   - 参数: `thinking: {type: 'enabled'/'disabled'}` 或 `enable_thinking: true/false`
   - UI: 启用思考 / 禁用思考

2. **Levels 模式** (DeepSeek, 豆包)
   - 参数: `reasoning_effort: 'minimal'/'low'/'medium'/'high'`
   - UI: Minimal / Low / Medium / High

### 高级参数

所有流式请求自动添加 `stream_options: {include_usage: true}` 用于计费追踪。

#### 参数说明

| 参数 | 范围 | 默认值 | 说明 |
|------|------|--------|------|
| Temperature | 0.0-2.0 | 0.7 | 控制随机性，低值更确定，高值更创造 |
| Max Tokens | 256-32000 | 4096 | 限制生成长度 |
| Top P | 0.0-1.0 | 1.0 | 核采样，控制词汇多样性 |
| Frequency Penalty | -2.0-2.0 | 0 | 正值减少重复 |
| Presence Penalty | -2.0-2.0 | 0 | 正值鼓励新话题 |

## 🛠️ 开发

### 数据库

使用 SQLite 作为本地数据库，存储：
- 提供商配置
- 模型配置
- 对话历史
- 应用设置

```bash
# 重新初始化数据库
npm run seed
```

### API 路由

所有 API 路由都在 `app/api` 目录下：

- `POST /api/chat` - 聊天流式响应
- `GET /api/models` - 获取模型列表
- `POST /api/models` - 创建模型
- `PUT /api/models/[id]` - 更新模型
- `GET /api/providers` - 获取提供商列表
- `PUT /api/providers/[id]` - 更新提供商（配置 API Key）
- `GET /api/conversations` - 获取对话列表
- `POST /api/conversations` - 创建对话
- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置

## 🎨 使用示例

### 场景 1: 代码助手
```typescript
系统提示词: "你是一个专业的编程助手，提供清晰、准确的代码和解释。"
Temperature: 0.2
Max Tokens: 4096
思考模式: 根据需要选择
```

### 场景 2: 创意写作
```typescript
系统提示词: "你是一位富有想象力的作家，善于创作引人入胜的故事。"
Temperature: 1.0
Max Tokens: 8192
Frequency Penalty: 0.5
Presence Penalty: 0.3
```

## 🔧 调试

所有请求都会在终端打印详细日志：

```
=== AI SDK HTTP Request ===
Model ID: qwen-plus
Chat Config: { systemPrompt: '...', temperature: 0.7, ... }
Stream options: { temperature: 0.7, maxTokens: 4096, ... }
```

## 📝 待办事项

- [ ] 配置预设管理
- [ ] 图片上传和多模态输入
- [ ] 导出对话为 Markdown
- [ ] Docker 部署
- [ ] 用户认证

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

如有问题或建议，欢迎提 Issue！
