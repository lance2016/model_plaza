'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Loader2 } from 'lucide-react';

export function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">LLM Plaza</p>
          <p className="text-sm mt-1">选择一个模型，开始对话</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">
                {message.role === 'user' ? '你' : '助手'}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {message.parts?.map((part, i) => {
                  if (part.type === 'text') {
                    return (
                      <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
                        {part.text}
                      </ReactMarkdown>
                    );
                  }
                  if (part.type === 'reasoning') {
                    return (
                      <details key={i} className="text-muted-foreground text-xs border rounded p-2 my-2 bg-muted/50">
                        <summary className="cursor-pointer font-medium">💭 思考过程</summary>
                        <div className="whitespace-pre-wrap mt-2 leading-relaxed">{part.text}</div>
                      </details>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}
        {status === 'submitted' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">正在思考...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
