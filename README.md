# LLM Plaza

一个功能强大的多模型 AI 聊天平台，支持多家主流 AI 提供商，提供丰富的配置选项和思考模型支持。

## 已实现功能

### 对话核心

- [x] 多轮对话，实时流式输出
- [x] Markdown 渲染（GFM 表格、列表、引用等）
- [x] 代码块语法高亮（Prism.js oneDark 主题）+ 一键复制
- [x] 图片上传（多图、Base64、10MB 限制、缩略图预览）
- [x] 思考过程折叠展示（点击展开）
- [x] 重新生成最后一条回复
- [x] 消息内容一键复制
- [x] 对话自动保存 / 历史加载
- [x] 对话标题搜索（全文检索，标题 + 内容）
- [x] 一键清空所有对话记录

### 模型 & 提供商

- [x] 8 家预置提供商：OpenAI / Anthropic / Google / DeepSeek / 通义千问 / 豆包 / 智谱 AI / Moonshot
- [x] 自定义添加提供商（ID、名称、类型、Base URL、API Key）
- [x] API 格式切换：Chat Completions（默认）/ Responses
- [x] API Key 加密存储（AES-256-GCM）
- [x] 模型 CRUD 管理，按提供商分组展示
- [x] 思考模型支持：Binary 模式（启用/禁用）和 Levels 模式（关闭/低/中/高）
- [x] 按提供商自动注入思考参数（thinking / enable_thinking / reasoning_effort）
- [x] 默认模型设置

### 对话参数

- [x] 系统提示词（对话级）
- [x] 全局系统提示词（设置级，优先级最高，自动合并）
- [x] Temperature / Max Tokens / Top P / Frequency Penalty / Presence Penalty
- [x] 一键重置为默认值
- [x] 配置摘要悬浮卡预览

### 界面 & 体验

- [x] 亮色 / 暗色主题切换
- [x] 阅读宽度调节（窄屏 / 中等 / 宽屏）
- [x] 侧边栏折叠 / 展开
- [x] 移动端抽屉式侧边栏
- [x] 输入框自动伸缩，Enter 发送 / Shift+Enter 换行
- [x] 流式传输状态指示（脉冲动画 + "正在思考..."）
- [x] 消息入场动画

### 数据 & 安全

- [x] SQLite 本地存储（WAL 模式）
- [x] API Key AES-256-GCM 加密
- [x] 请求日志（自动截断 Base64 图片数据）
- [x] 自动添加 `stream_options.include_usage` 用于用量追踪

---

## 未来计划

### 对话增强

- [ ] 对话分支（从任意消息重新生成，保留历史分支）
- [ ] 对话标题自动摘要（调用 LLM 生成标题）
- [ ] 导出对话为 Markdown / PDF
- [ ] 消息编辑（编辑已发送的用户消息并重新生成）
- [ ] 多模型同时对比回答（同一问题发给多个模型）
- [ ] 消息内引用回复（引用某条历史消息）
- [ ] 拖拽上传文件（图片 / 文档）
- [ ] 支持文件类型扩展（PDF、Word 等文档解析）
- [ ] 语音输入 / TTS 语音播放

### 提示词 & 模板

- [ ] 提示词模板库（预置常用角色 / 场景模板）
- [ ] 快捷模板一键填充（输入框工具栏已预留入口）
- [ ] 提示词收藏夹（收藏常用提示词组合）
- [ ] 提示词变量（支持 `{{variable}}` 占位符）

### 模型 & 提供商

- [ ] 模型能力标签（视觉、长上下文、函数调用等）
- [ ] 自动检测 API Key 可用性（一键测试连通性）
- [ ] Token 用量统计与可视化
- [ ] 费用估算 / 历史费用追踪
- [ ] 自定义模型参数预设（保存不同场景的参数组合）
- [ ] 支持更多提供商类型（Azure OpenAI、AWS Bedrock、Ollama 本地模型）

### 界面 & 体验

- [ ] 国际化（i18n，英语 / 中文切换）
- [ ] 键盘快捷键体系（Ctrl+N 新建、Ctrl+K 搜索等）
- [ ] 对话列表文件夹 / 标签分类
- [ ] 对话固定置顶
- [ ] 全屏专注模式
- [ ] 自定义主题色

### 部署 & 安全

- [ ] Docker 一键部署 / docker-compose
- [ ] 用户认证（登录 / 注册）
- [ ] 多用户支持与数据隔离
- [ ] 速率限制 / 使用配额
- [ ] 操作审计日志

### 开发者

- [ ] Plugin / MCP 扩展机制
- [ ] Function Calling / Tool Use 支持
- [ ] API 接口对外暴露（供第三方调用）
- [ ] 自动化测试（单元测试 + E2E）

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
git clone https://github.com/yourusername/llm-plaza.git
cd llm-plaza
npm install
```

### 配置

1. 复制环境变量：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 配置 API Key，或在应用设置页面中配置。

### 运行

```bash
# 开发模式
npm run dev

# 生产构建
npm run build && npm start
```

打开 [http://localhost:3000](http://localhost:3000) 开始使用。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 前端 | React 19, TypeScript |
| 样式 | TailwindCSS, shadcn/ui, Radix UI |
| AI SDK | Vercel AI SDK 4.x |
| 数据库 | SQLite (better-sqlite3) |
| 状态 | React Hooks, SWR |
| 代码高亮 | react-syntax-highlighter (Prism.js) |
| Markdown | react-markdown, remark-gfm |

## 项目结构

```
llm-plaza/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── chat/          #   聊天流式接口
│   │   ├── models/        #   模型 CRUD
│   │   ├── providers/     #   提供商 CRUD
│   │   ├── conversations/ #   对话 CRUD + 搜索
│   │   └── settings/      #   设置读写
│   ├── settings/          # 设置页面 (general / providers / models)
│   └── page.tsx           # 主聊天页面
├── components/
│   ├── chat/              # 聊天组件 (消息列表、输入框、Markdown、模型选择等)
│   ├── settings/          # 设置表单组件
│   └── ui/                # shadcn/ui 基础组件
├── lib/
│   ├── ai.ts              # AI SDK 集成 & 提供商路由
│   ├── db.ts              # SQLite 数据库操作
│   ├── crypto.ts          # AES-256-GCM 加解密
│   └── utils.ts           # 工具函数
└── data/
    └── llm-plaza.db       # SQLite 数据库文件
```

## 许可证

MIT License
