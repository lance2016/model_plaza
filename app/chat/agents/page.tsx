'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChatSession } from '@/components/chat/chat-session';
import { ReadingWidthSelector, type ReadingWidth } from '@/components/chat/reading-width-selector';
import { AgentSidebar } from '@/components/agents/agent-sidebar';
import { AgentIcon } from '@/components/agents/agent-icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ModuleRail } from '@/components/layout/module-rail';
import type { Session } from '@/lib/types';
import { DEFAULT_CHAT_CONFIG } from '@/lib/types';
import type { UIMessage } from 'ai';

interface Model {
  id: string;
  name: string;
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string;
  supports_vision: number;
}

interface AgentData {
  id: string;
  name: string;
  icon: string;
  icon_color: string;
  system_prompt: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

let nextSessionId = 1;
function createSessionId() {
  return `agent-session-${nextSessionId++}-${Date.now()}`;
}

function createAgentSession(agent: AgentData, models: Model[], defaultModelId: string): Session {
  const modelId = agent.model_id || defaultModelId;
  const model = models.find(m => m.id === modelId);
  const effort = model?.is_reasoning_model === 1
    ? (model.default_reasoning_effort || 'medium')
    : 'medium';

  return {
    id: createSessionId(),
    selectedModelId: modelId,
    reasoningEffort: effort,
    chatConfig: {
      systemPrompt: agent.system_prompt || '',
      temperature: agent.temperature ?? 0.7,
      maxTokens: agent.max_tokens ?? 4096,
      topP: agent.top_p ?? 1.0,
      frequencyPenalty: agent.frequency_penalty ?? 0,
      presencePenalty: agent.presence_penalty ?? 0,
    },
    agentId: agent.id,
    agentName: agent.name,
    agentIcon: agent.icon,
    agentIconColor: agent.icon_color,
  };
}

export default function AgentsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AgentsPage />
    </Suspense>
  );
}

function AgentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [streamingSessionIds, setStreamingSessionIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [readingWidth, setReadingWidth] = useState<ReadingWidth>('medium');
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const agentHandledRef = useRef(false);

  const { data: models = [] } = useSWR<Model[]>('/api/models', fetcher);

  const sessionsRef = useRef(sessions);
  const activeSessionIdRef = useRef(activeSessionId);
  const streamingSessionIdsRef = useRef(streamingSessionIds);
  const defaultModelIdRef = useRef(defaultModelId);
  const modelsRef = useRef(models);
  sessionsRef.current = sessions;
  activeSessionIdRef.current = activeSessionId;
  streamingSessionIdsRef.current = streamingSessionIds;
  defaultModelIdRef.current = defaultModelId;
  modelsRef.current = models;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentModel = models.find(m => m.id === activeSession?.selectedModelId);
  const isReasoningModel = currentModel?.is_reasoning_model === 1;

  // Load default model + default agent, create initial session
  useEffect(() => {
    const init = async () => {
      let modelId = '';
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings.default_model_id) modelId = settings.default_model_id;
        }
      } catch (error) {
        console.error('Failed to load default model:', error);
      }
      setDefaultModelId(modelId);

      // Load default agent
      let agent: AgentData | null = null;
      try {
        const agentRes = await fetch('/api/agents?default=true');
        if (agentRes.ok) {
          const data = await agentRes.json();
          if (data && data.id) agent = data;
        }
      } catch {}

      if (agent) {
        const session = createAgentSession(agent, modelsRef.current, modelId);
        setSessions([session]);
        setActiveSessionId(session.id);
      } else {
        // No agent available, redirect to browse
        router.replace('/chat/agents/browse');
      }
    };

    if (models.length > 0) init();
  }, [models, router]);

  // Handle ?agent= parameter from browse page
  useEffect(() => {
    const agentId = searchParams.get('agent');
    if (!agentId || agentHandledRef.current || !activeSessionId) return;
    agentHandledRef.current = true;

    const loadAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/use`, { method: 'POST' });
        if (!res.ok) return;
        const { agent } = await res.json();

        const session = createAgentSession(agent, modelsRef.current, defaultModelIdRef.current);
        setSessions(prev => [...prev, session]);
        setActiveSessionId(session.id);

        router.replace('/chat/agents', { scroll: false });
      } catch (e) {
        console.error('Failed to load agent:', e);
      }
    };

    loadAgent();
  }, [searchParams, activeSessionId, router]);

  // Update reasoning effort when model changes
  useEffect(() => {
    if (currentModel && currentModel.is_reasoning_model === 1) {
      const id = activeSessionIdRef.current;
      setSessions(prev => {
        const session = prev.find(s => s.id === id);
        if (!session) return prev;
        return prev.map(s =>
          s.id === id
            ? { ...s, reasoningEffort: currentModel.default_reasoning_effort || 'medium' }
            : s
        );
      });
    }
  }, [currentModel]);

  // Cleanup unused sessions
  useEffect(() => {
    setSessions(prev => {
      const filtered = prev.filter(s =>
        s.id === activeSessionIdRef.current || streamingSessionIdsRef.current.has(s.id)
      );
      return filtered.length > 0 ? filtered : prev;
    });
  }, [activeSessionId, streamingSessionIds]);

  const handleReasoningEffortChange = useCallback((effort: string) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionIdRef.current ? { ...s, reasoningEffort: effort } : s
    ));
  }, []);

  const handleNewChat = useCallback(() => {
    const currentSession = sessionsRef.current.find(s => s.id === activeSessionIdRef.current);
    if (!currentSession?.agentId) return;

    const id = createSessionId();
    setSessions(prev => [...prev, {
      id,
      selectedModelId: currentSession.selectedModelId,
      reasoningEffort: currentSession.reasoningEffort || 'medium',
      chatConfig: { ...currentSession.chatConfig },
      agentId: currentSession.agentId,
      agentName: currentSession.agentName,
      agentIcon: currentSession.agentIcon,
      agentIconColor: currentSession.agentIconColor,
    }]);
    setActiveSessionId(id);
    setSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback(async (convId: string) => {
    const existing = sessionsRef.current.find(s => s.conversationId === convId);
    if (existing) {
      setActiveSessionId(existing.id);
      setSidebarOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(convId)}`);
      if (res.ok) {
        const conv = await res.json();
        const id = createSessionId();
        const parsedMessages: UIMessage[] = JSON.parse(conv.messages);
        const modelId = conv.model_id || defaultModelIdRef.current;
        const model = modelsRef.current.find(m => m.id === modelId);
        const effort = model?.is_reasoning_model === 1
          ? (model.default_reasoning_effort || 'medium')
          : 'medium';

        // Load agent data if available
        let agentData: Partial<Session> = {};
        if (conv.agent_id) {
          try {
            const agentRes = await fetch(`/api/agents/${encodeURIComponent(conv.agent_id)}`);
            if (agentRes.ok) {
              const agent = await agentRes.json();
              agentData = {
                agentId: agent.id,
                agentName: agent.name,
                agentIcon: agent.icon,
                agentIconColor: agent.icon_color,
                chatConfig: {
                  systemPrompt: agent.system_prompt || '',
                  temperature: agent.temperature ?? 0.7,
                  maxTokens: agent.max_tokens ?? 4096,
                  topP: agent.top_p ?? 1.0,
                  frequencyPenalty: agent.frequency_penalty ?? 0,
                  presencePenalty: agent.presence_penalty ?? 0,
                },
              };
            }
          } catch {}
        }

        setSessions(prev => [...prev, {
          id,
          conversationId: convId,
          selectedModelId: modelId,
          reasoningEffort: effort,
          chatConfig: agentData.chatConfig || { ...DEFAULT_CHAT_CONFIG },
          initialMessages: parsedMessages,
          ...(agentData.agentId ? {
            agentId: agentData.agentId,
            agentName: agentData.agentName,
            agentIcon: agentData.agentIcon,
            agentIconColor: agentData.agentIconColor,
          } : {}),
        }]);
        setActiveSessionId(id);
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
    setSidebarOpen(false);
  }, []);

  const handleConversationCreated = useCallback((sessionId: string, convId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, conversationId: convId } : s
    ));
  }, []);

  const handleStatusChange = useCallback((sessionId: string, status: string) => {
    setStreamingSessionIds(prev => {
      const next = new Set(prev);
      if (status === 'streaming' || status === 'submitted') next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
  }, []);

  const streamingConversationIds = sessions
    .filter(s => streamingSessionIds.has(s.id) && s.conversationId)
    .map(s => s.conversationId!);

  if (!activeSessionId) return null;

  return (
    <>
      {/* Desktop sidebar */}
      {!desktopSidebarCollapsed && (
        <aside className="w-64 border-r border-border/50 glass flex-shrink-0 hidden md:flex flex-col">
          <AgentSidebar
            currentConversationId={activeSession?.conversationId}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            streamingConversationIds={streamingConversationIds}
            currentAgentName={activeSession?.agentName}
            currentAgentIcon={activeSession?.agentIcon}
            currentAgentIconColor={activeSession?.agentIconColor}
          />
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8"
            onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
          >
            {desktopSidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          {/* Mobile menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 glass border-r border-border/50">
              <div className="flex h-full">
                <ModuleRail />
                <div className="flex-1 flex flex-col">
                  <AgentSidebar
                    currentConversationId={activeSession?.conversationId}
                    onNewChat={handleNewChat}
                    onSelectConversation={handleSelectConversation}
                    streamingConversationIds={streamingConversationIds}
                    currentAgentName={activeSession?.agentName}
                    currentAgentIcon={activeSession?.agentIcon}
                    currentAgentIconColor={activeSession?.agentIconColor}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <AgentIcon icon={activeSession?.agentIcon || 'bot'} color={activeSession?.agentIconColor || '#3b82f6'} size="sm" />
            <span className="font-medium text-sm">{activeSession?.agentName}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ReadingWidthSelector value={readingWidth} onChange={setReadingWidth} />
          </div>
        </header>

        {/* Chat sessions */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {sessions.map(session => (
            <ChatSession
              key={session.id}
              sessionId={session.id}
              initialConversationId={session.conversationId}
              initialMessages={session.initialMessages}
              selectedModelId={session.selectedModelId}
              reasoningEffort={session.reasoningEffort}
              chatConfig={session.chatConfig}
              readingWidth={readingWidth}
              isActive={session.id === activeSessionId}
              isReasoningModel={session.id === activeSessionId ? isReasoningModel : false}
              reasoningType={session.id === activeSessionId ? currentModel?.reasoning_type : undefined}
              supportsVision={session.id === activeSessionId ? (currentModel?.supports_vision === 1) : false}
              agentId={session.agentId}
              agentName={session.agentName}
              agentIcon={session.agentIcon}
              agentIconColor={session.agentIconColor}
              onConversationCreated={handleConversationCreated}
              onStatusChange={handleStatusChange}
              onReasoningEffortChange={handleReasoningEffortChange}
            />
          ))}
        </div>
      </div>
    </>
  );
}
