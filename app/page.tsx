'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { ChatSession } from '@/components/chat/chat-session';
import { ModelSelector } from '@/components/chat/model-selector';
import { AdvancedSettings, type ChatConfig } from '@/components/chat/advanced-settings';
import { ReadingWidthSelector, type ReadingWidth } from '@/components/chat/reading-width-selector';
import { ConfigSummary } from '@/components/chat/config-summary';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Session } from '@/lib/types';
import { DEFAULT_CHAT_CONFIG } from '@/lib/types';
import type { UIMessage } from 'ai';

interface Model {
  id: string;
  name: string;
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

let nextSessionId = 1;
function createSessionId() {
  return `session-${nextSessionId++}-${Date.now()}`;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [streamingSessionIds, setStreamingSessionIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [readingWidth, setReadingWidth] = useState<ReadingWidth>('medium');
  const [defaultModelId, setDefaultModelId] = useState<string>('');

  const { data: models = [] } = useSWR<Model[]>('/api/models', fetcher);

  // Refs for stable callbacks
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

  // Load default model and create initial session
  useEffect(() => {
    const init = async () => {
      let modelId = '';
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings.default_model_id) {
            modelId = settings.default_model_id;
          }
        }
      } catch (error) {
        console.error('Failed to load default model:', error);
      }
      setDefaultModelId(modelId);
      
      // Wait for models to load to get correct reasoning effort
      const model = modelsRef.current.find(m => m.id === modelId);
      const defaultReasoningEffort = model?.is_reasoning_model === 1 
        ? (model.default_reasoning_effort || 'medium')
        : 'medium';
      
      const id = createSessionId();
      setSessions([{
        id,
        selectedModelId: modelId,
        reasoningEffort: defaultReasoningEffort,
        chatConfig: { ...DEFAULT_CHAT_CONFIG },
      }]);
      setActiveSessionId(id);
    };
    
    // Only initialize when models are loaded
    if (models.length > 0) {
      init();
    }
  }, [models]);

  // Update reasoning effort when model changes for active session
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

  // Cleanup: remove sessions that are not active and not streaming
  useEffect(() => {
    setSessions(prev => {
      const filtered = prev.filter(s =>
        s.id === activeSessionIdRef.current || streamingSessionIdsRef.current.has(s.id)
      );
      // Always keep at least the active session
      return filtered.length > 0 ? filtered : prev;
    });
  }, [activeSessionId, streamingSessionIds]);

  // --- Session property updaters ---

  const updateActiveSession = useCallback((updates: Partial<Session>) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionIdRef.current ? { ...s, ...updates } : s
    ));
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    updateActiveSession({ selectedModelId: modelId });
    // Reasoning effort will be updated by the useEffect above
  }, [updateActiveSession]);

  const handleReasoningEffortChange = useCallback((effort: string) => {
    updateActiveSession({ reasoningEffort: effort });
  }, [updateActiveSession]);

  const handleChatConfigChange = useCallback((config: ChatConfig) => {
    updateActiveSession({ chatConfig: config });
  }, [updateActiveSession]);

  // --- Session lifecycle handlers ---

  const handleNewChat = useCallback(() => {
    const currentModel = sessionsRef.current.find(s => s.id === activeSessionIdRef.current);
    const modelId = currentModel?.selectedModelId || defaultModelIdRef.current;
    const id = createSessionId();
    setSessions(prev => [...prev, {
      id,
      selectedModelId: modelId,
      reasoningEffort: 'medium',
      chatConfig: { ...DEFAULT_CHAT_CONFIG },
    }]);
    setActiveSessionId(id);
    setSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback(async (convId: string) => {
    // Check if already mounted
    const existing = sessionsRef.current.find(s => s.conversationId === convId);
    if (existing) {
      setActiveSessionId(existing.id);
      setSidebarOpen(false);
      return;
    }

    // Load from DB and create new session
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(convId)}`);
      if (res.ok) {
        const conv = await res.json();
        const id = createSessionId();
        const parsedMessages: UIMessage[] = JSON.parse(conv.messages);
        const modelId = conv.model_id || defaultModelIdRef.current;

        // Find model info for reasoning effort
        const model = modelsRef.current.find(m => m.id === modelId);
        const effort = model?.is_reasoning_model === 1
          ? (model.default_reasoning_effort || 'medium')
          : 'medium';

        setSessions(prev => [...prev, {
          id,
          conversationId: convId,
          selectedModelId: modelId,
          reasoningEffort: effort,
          chatConfig: { ...DEFAULT_CHAT_CONFIG },
          initialMessages: parsedMessages,
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
      if (status === 'streaming' || status === 'submitted') {
        next.add(sessionId);
      } else {
        next.delete(sessionId);
      }
      return next;
    });
  }, []);

  // Compute streaming conversation IDs for sidebar
  const streamingConversationIds = sessions
    .filter(s => streamingSessionIds.has(s.id) && s.conversationId)
    .map(s => s.conversationId!);

  if (!activeSessionId) {
    return null; // Still initializing
  }

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar - collapsible */}
      {!desktopSidebarCollapsed && (
        <aside className="w-64 border-r border-border/50 glass flex-shrink-0 hidden md:flex flex-col">
          <Sidebar
            currentConversationId={activeSession?.conversationId}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            streamingConversationIds={streamingConversationIds}
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
            <SheetContent side="left" className="w-64 p-0 glass border-r border-border/50">
              <Sidebar
                currentConversationId={activeSession?.conversationId}
                onNewChat={handleNewChat}
                onSelectConversation={handleSelectConversation}
                streamingConversationIds={streamingConversationIds}
              />
            </SheetContent>
          </Sheet>
          
          <ModelSelector
            value={activeSession?.selectedModelId || ''}
            onChange={handleModelChange}
          />
          <div className="ml-auto flex items-center gap-1">
            <ConfigSummary
              modelName={currentModel?.name || '未选择'}
              reasoningEffort={activeSession?.reasoningEffort}
              config={activeSession?.chatConfig || DEFAULT_CHAT_CONFIG}
              isReasoningModel={isReasoningModel}
            />
            <ReadingWidthSelector value={readingWidth} onChange={setReadingWidth} />
            <ThemeToggle />
            <AdvancedSettings
              config={activeSession?.chatConfig || DEFAULT_CHAT_CONFIG}
              onChange={handleChatConfigChange}
              disabled={!activeSession?.selectedModelId}
            />
          </div>
        </header>

        {/* Chat sessions - all mounted, only active visible */}
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
              onConversationCreated={handleConversationCreated}
              onStatusChange={handleStatusChange}
              onReasoningEffortChange={handleReasoningEffortChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
