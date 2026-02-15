'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChatSession } from '@/components/chat/chat-session';
import { ModelSelector } from '@/components/chat/grouped-model-selector';
import { AdvancedSettings, type ChatConfig } from '@/components/chat/advanced-settings';
import { ReadingWidthSelector, type ReadingWidth } from '@/components/chat/reading-width-selector';
import { ConfigSummary } from '@/components/chat/config-summary';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
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

const fetcher = (url: string) => fetch(url).then(r => r.json());

let nextSessionId = 1;
function createSessionId() {
  return `model-session-${nextSessionId++}-${Date.now()}`;
}

function ModelsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [streamingSessionIds, setStreamingSessionIds] = useState<Set<string>>(new Set());
  const [readingWidth, setReadingWidth] = useState<ReadingWidth>('medium');
  const [defaultModelId, setDefaultModelId] = useState<string>('');

  const { data: models = [] } = useSWR<Model[]>('/api/models', fetcher);

  const initializedRef = useRef(false);
  const loadedConvIdRef = useRef<string | null>(null);
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

  // Calculate streaming conversation IDs for sidebar display
  const streamingConversationIds = new Set<string>();
  sessions.forEach(session => {
    if (streamingSessionIds.has(session.id) && session.conversationId) {
      streamingConversationIds.add(session.conversationId);
    }
  });

  // Initialize or load conversation (single effect to avoid race conditions)
  // IMPORTANT: Do NOT call router.replace inside conversation loading —
  // it can cause the Suspense boundary to remount this component, losing all state.
  useEffect(() => {
    if (!models.length) return;

    const convId = searchParams?.get('conversation');

    if (convId) {
      // Skip if we already loaded this conversation
      if (convId === loadedConvIdRef.current) return;

      // Load conversation from history
      const loadConversation = async () => {
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

            const newSession: Session = {
              id,
              conversationId: convId,
              selectedModelId: modelId,
              reasoningEffort: effort,
              chatConfig: { ...DEFAULT_CHAT_CONFIG },
              initialMessages: parsedMessages,
            };
            setSessions(prev => [
              ...prev.filter(s => streamingSessionIdsRef.current.has(s.id)),
              newSession,
            ]);
            setActiveSessionId(id);
            loadedConvIdRef.current = convId;
            initializedRef.current = true;
          }
        } catch (e) {
          console.error('Failed to load conversation:', e);
        }
      };

      loadConversation();
      return;
    }

    // Initialize with default model (only once)
    if (initializedRef.current) return;
    initializedRef.current = true;

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

      // Check if model is specified in URL
      const urlModelId = searchParams?.get('model');
      if (urlModelId) {
        modelId = urlModelId;
        router.replace('/chat/models');
      }

      setDefaultModelId(modelId);

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

    init();
  }, [models, searchParams, router]);

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

  // Cleanup unused sessions (with delay to avoid flicker)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessions(prev => {
        const filtered = prev.filter(s =>
          s.id === activeSessionIdRef.current || streamingSessionIdsRef.current.has(s.id)
        );
        return filtered.length > 0 ? filtered : prev;
      });
    }, 3000); // Delay 3 seconds to avoid flicker when streaming completes

    return () => clearTimeout(timer);
  }, [activeSessionId, streamingSessionIds]);

  const updateActiveSession = useCallback((updates: Partial<Session>) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionIdRef.current ? { ...s, ...updates } : s
    ));
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    updateActiveSession({ selectedModelId: modelId });
  }, [updateActiveSession]);

  const handleReasoningEffortChange = useCallback((effort: string) => {
    updateActiveSession({ reasoningEffort: effort });
  }, [updateActiveSession]);

  const handleChatConfigChange = useCallback((config: ChatConfig) => {
    updateActiveSession({ chatConfig: config });
  }, [updateActiveSession]);

  const handleNewChat = useCallback(() => {
    const currentSession = sessionsRef.current.find(s => s.id === activeSessionIdRef.current);
    const modelId = currentSession?.selectedModelId || defaultModelIdRef.current;
    const id = createSessionId();
    setSessions(prev => [...prev, {
      id,
      selectedModelId: modelId,
      reasoningEffort: 'medium',
      chatConfig: { ...DEFAULT_CHAT_CONFIG },
    }]);
    setActiveSessionId(id);
    loadedConvIdRef.current = null;
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

  // Debug logging
  useEffect(() => {
    console.log('[ModelsPage] activeSessionId:', activeSessionId);
    console.log('[ModelsPage] sessions:', sessions.map(s => ({ id: s.id, conversationId: s.conversationId })));
    console.log('[ModelsPage] streamingSessionIds:', Array.from(streamingSessionIds));
  }, [activeSessionId, sessions, streamingSessionIds]);

  if (!activeSessionId) return null;

  // Background streaming sessions (excluding active one)
  const backgroundStreamingSessions = sessions.filter(s => 
    streamingSessionIds.has(s.id) && s.id !== activeSessionId && s.conversationId
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <ModelSelector
          value={activeSession?.selectedModelId || ''}
          onChange={handleModelChange}
        />
        {backgroundStreamingSessions.length > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {backgroundStreamingSessions.length} 个对话正在回复中
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleNewChat}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            新对话
          </Button>
          <ConfigSummary
            modelName={currentModel?.name || '未选择'}
            reasoningEffort={activeSession?.reasoningEffort}
            config={activeSession?.chatConfig || DEFAULT_CHAT_CONFIG}
            isReasoningModel={isReasoningModel}
          />
          <ReadingWidthSelector value={readingWidth} onChange={setReadingWidth} />
          <AdvancedSettings
            config={activeSession?.chatConfig || DEFAULT_CHAT_CONFIG}
            onChange={handleChatConfigChange}
            disabled={!activeSession?.selectedModelId}
          />
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
            onConversationCreated={handleConversationCreated}
            onStatusChange={handleStatusChange}
            onReasoningEffortChange={handleReasoningEffortChange}
          />
        ))}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <Suspense fallback={null}>
      <ModelsPageContent />
    </Suspense>
  );
}
