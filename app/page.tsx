'use client';

import { useState, useCallback, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageList } from '@/components/chat/message-list';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ModelSelector } from '@/components/chat/model-selector';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');

  // Use ref so the transport body closure always reads the latest modelId
  const selectedModelIdRef = useRef(selectedModelId);
  selectedModelIdRef.current = selectedModelId;

  const [transport] = useState(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({ modelId: selectedModelIdRef.current }),
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
      const newId = uuidv4();
      try {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: selectedModelId,
            title: text.slice(0, 50),
          }),
        });
        setConversationId(newId);
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
