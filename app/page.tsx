'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import useSWR, { mutate as globalMutate } from 'swr';
import { MessageList } from '@/components/chat/message-list';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ModelSelector } from '@/components/chat/model-selector';
import { ReasoningEffortSelector } from '@/components/chat/reasoning-effort-selector';
import { AdvancedSettings, type ChatConfig } from '@/components/chat/advanced-settings';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Model {
  id: string;
  name: string;
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ChatPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState<string>('medium');
  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  });
  
  const { data: models = [], mutate: mutateModels } = useSWR<Model[]>('/api/models', fetcher);
  const currentModel = models.find(m => m.id === selectedModelId);
  const isReasoningModel = currentModel?.is_reasoning_model === 1;

  // Load default model from settings
  useEffect(() => {
    const loadDefaultModel = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings.default_model_id) {
            setSelectedModelId(settings.default_model_id);
          }
        }
      } catch (error) {
        console.error('Failed to load default model:', error);
      }
    };
    
    if (!selectedModelId) {
      loadDefaultModel();
    }
  }, [selectedModelId]);

  // Update reasoning effort when model changes
  useEffect(() => {
    if (currentModel && currentModel.is_reasoning_model === 1) {
      setReasoningEffort(currentModel.default_reasoning_effort || 'medium');
    }
  }, [currentModel]);

  // Use ref so the transport body closure always reads the latest values
  const selectedModelIdRef = useRef(selectedModelId);
  const reasoningEffortRef = useRef(reasoningEffort);
  const chatConfigRef = useRef(chatConfig);
  selectedModelIdRef.current = selectedModelId;
  reasoningEffortRef.current = reasoningEffort;
  chatConfigRef.current = chatConfig;

  const [transport] = useState(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({ 
      modelId: selectedModelIdRef.current,
      reasoningEffort: reasoningEffortRef.current,
      chatConfig: chatConfigRef.current,
    }),
  }));

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    transport,
    onFinish: async (message) => {
      if (!conversationId) return;
      try {
        await fetch(`/api/conversations/${conversationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: JSON.stringify([...messages, message]),
            model_id: selectedModelId,
          }),
        });
        // Refresh conversation list to update timestamp
        globalMutate('/api/conversations');
      } catch (e) {
        console.error('Failed to save conversation:', e);
      }
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !selectedModelId) return;
    const text = input;
    setInput('');

    if (!conversationId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: selectedModelId,
            title: text.slice(0, 50),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.id);
          // Refresh conversation list immediately after creating
          globalMutate('/api/conversations');
        }
      } catch (e) {
        console.error('Failed to create conversation:', e);
      }
    }

    sendMessage({ text });
  }, [input, selectedModelId, conversationId, sendMessage]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setInput('');
    setSidebarOpen(false);
    // Reset chat config to defaults
    setChatConfig({
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });
  }, [setMessages]);

  const handleSelectConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const conv = await res.json();
        setConversationId(id);
        setMessages(JSON.parse(conv.messages));
        if (conv.model_id) {
          setSelectedModelId(conv.model_id);
        }
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
    setSidebarOpen(false);
  }, [setMessages]);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r bg-muted/40 flex-shrink-0 hidden md:flex flex-col">
        <Sidebar
          currentConversationId={conversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-2 p-3 border-b">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar
                currentConversationId={conversationId}
                onNewChat={handleNewChat}
                onSelectConversation={handleSelectConversation}
              />
            </SheetContent>
          </Sheet>
          <ModelSelector value={selectedModelId} onChange={setSelectedModelId} />
          {isReasoningModel && (
            <ReasoningEffortSelector 
              value={reasoningEffort} 
              onChange={setReasoningEffort}
              disabled={!selectedModelId}
              reasoningType={currentModel?.reasoning_type}
            />
          )}
          <div className="ml-auto">
            <AdvancedSettings 
              config={chatConfig}
              onChange={setChatConfig}
              disabled={!selectedModelId}
            />
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="m-3 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          <MessageList messages={messages} status={status} />
        </div>

        <ChatPanel
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onStop={stop}
          status={status}
          disabled={!selectedModelId}
        />
      </div>
    </div>
  );
}
