# UI 重构说明

## 主要改动

### 1. 智能体优先级提升
- ✅ **左侧导航栏顺序调整**：将智能体图标放在大模型之前
- ✅ **默认首页更改**：访问根路径 `/` 时，现在默认跳转到 `/chat/agents` 而非 `/chat/models`
- ✅ **Logo 链接更新**：点击顶部 Logo 现在跳转到智能体页面

### 2. 统一聊天记录展示
- ✅ **创建统一侧边栏组件** (`components/chat/unified-sidebar.tsx`)
  - 合并大模型和智能体的聊天记录在同一个侧边栏中
  - 添加标签切换功能：全部、智能体、大模型
  - 统一搜索功能：可以同时搜索两种类型的对话
  - 自动根据 `agent_id` 字段区分对话类型

- ✅ **替换原有侧边栏**
  - `app/chat/agents/page.tsx` 现在使用 `UnifiedSidebar`
  - `app/chat/models/page.tsx` 现在使用 `UnifiedSidebar`
  - 保留原有 `AgentSidebar` 和 `ModelSidebar` 组件以防需要回滚

### 3. 图标尺寸优化
- ✅ **左侧导航栏图标**
  - Logo: `h-8 w-8` → `h-7 w-7`，内部图标 `h-4 w-4` → `h-3.5 w-3.5`
  - 模块按钮: `h-9 w-9` → `h-8 w-8`，图标 `h-4.5 w-4.5` → `h-4 w-4`
  - 设置按钮: 同上调整

- ✅ **侧边栏图标**
  - 标题图标: `h-4 w-4` → `h-3.5 w-3.5`
  - 按钮高度: `h-9` → `h-8`
  - 搜索框高度: `h-9` → `h-8`
  - Tab 高度: `h-8` → `h-7`

- ✅ **AgentIcon 组件**
  - 新增 `xs` 尺寸: `h-6 w-6` 容器，`h-3.5 w-3.5` 图标
  - 用于页面 header 中的智能体图标显示

- ✅ **移动端菜单图标**
  - Menu 图标: `h-5 w-5` → `h-4 w-4`

## 技术细节

### 统一侧边栏组件接口

```typescript
interface UnifiedSidebarProps {
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  streamingConversationIds?: string[];
  mode?: 'agent' | 'model';  // 决定显示哪种模式的 header
  currentAgentName?: string;
  currentAgentIcon?: string;
  currentAgentIconColor?: string;
}
```

### 对话分类逻辑

- 通过 `agent_id` 字段判断对话类型
- `agent_id` 存在 → 智能体对话
- `agent_id` 不存在 → 大模型对话

### API 兼容性

- `/api/conversations` 不传 mode 参数时返回所有对话
- `/api/conversations/search` 不传 mode 参数时搜索所有对话
- 现有 API 无需修改，完全向后兼容

## 视觉效果改进

1. **更精致的图标尺寸**：整体减小约 10-15%，让界面看起来更加现代和精致
2. **统一的交互体验**：无论在哪个模式下，都能看到和访问所有对话记录
3. **更好的信息架构**：智能体作为主要功能放在更显眼的位置

## 测试检查点

- ✅ 项目构建成功 (`npm run build`)
- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 错误
- ✅ 保持原有功能完整性

## 可能的后续优化

1. 考虑在统一侧边栏中显示对话的类型图标（智能体/大模型）
2. 可以添加更多过滤选项（按日期、按模型等）
3. 考虑添加拖拽排序功能
4. 可以为不同类型的对话使用不同的配色方案
