'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { mutate as globalMutate } from 'swr';
import { MessageList } from '@/components/chat/message-list';
import { ChatPanel } from '@/components/chat/chat-panel';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChatConfig } from '@/components/chat/advanced-settings';

interface ChatSessionProps {
  sessionId: string;
  initialConversationId?: string;
  initialMessages?: UIMessage[];
  selectedModelId: string;
  reasoningEffort: string;
  chatConfig: ChatConfig;
  isActive: boolean;
  onConversationCreated: (sessionId: string, conversationId: string) => void;
  onStatusChange: (sessionId: string, status: string) => void;
}

export function ChatSession({
  sessionId,
  initialConversationId,
  initialMessages,
  selectedModelId,
  reasoningEffort,
  chatConfig,
  isActive,
  onConversationCreated,
  onStatusChange,
}: ChatSessionProps) {
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  // Refs for latest values to avoid stale closures
  const selectedModelIdRef = useRef(selectedModelId);
  const reasoningEffortRef = useRef(reasoningEffort);
  const chatConfigRef = useRef(chatConfig);
  const conversationIdRef = useRef(conversationId);
  const onConversationCreatedRef = useRef(onConversationCreated);
  selectedModelIdRef.current = selectedModelId;
  reasoningEffortRef.current = reasoningEffort;
  chatConfigRef.current = chatConfig;
  conversationIdRef.current = conversationId;
  onConversationCreatedRef.current = onConversationCreated;

  const [transport] = useState(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      modelId: selectedModelIdRef.current,
      reasoningEffort: reasoningEffortRef.current,
      chatConfig: chatConfigRef.current,
    }),
  }));

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    messages: initialMessages,
    onFinish: async ({ messages: updatedMessages, isAbort }) => {
      if (isAbort) return;
      const convId = conversationIdRef.current;
      if (!convId) return;
      try {
        await fetch(`/api/conversations/${convId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: JSON.stringify(updatedMessages),
            model_id: selectedModelIdRef.current,
          }),
        });
        globalMutate('/api/conversations');
      } catch (e) {
        console.error('Failed to save conversation:', e);
      }
    },
  });

  // Notify parent of status changes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      onStatusChange(sessionId, status);
    }
  }, [status, sessionId, onStatusChange]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !selectedModelIdRef.current) return;
    if (status === 'submitted' || status === 'streaming') return;

    const text = input;
    setInput('');

    if (!conversationIdRef.current) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: selectedModelIdRef.current,
            title: text.slice(0, 50),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.id);
          conversationIdRef.current = data.id;
          onConversationCreatedRef.current(sessionId, data.id);
          globalMutate('/api/conversations');
        }
      } catch (e) {
        console.error('Failed to create conversation:', e);
      }
    }

    sendMessage({ text });
  }, [input, status, sendMessage, sessionId]);

  return (
    <div className={isActive ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
      {error && (
        <Alert variant="destructive" className="m-4 mb-0 border-destructive/50 bg-destructive/10">
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
        disabled={!selectedModelIdRef.current}
      />
    </div>
  );
}
