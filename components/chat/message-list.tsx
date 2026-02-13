'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Sparkles } from 'lucide-react';

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
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-2xl gradient-accent opacity-20 animate-subtle-pulse" />
            <div className="relative h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
          </div>
          <p className="text-lg font-medium text-foreground/90 tracking-tight">LLM Plaza</p>
          <p className="text-sm text-muted-foreground mt-1.5">选择一个模型，开始对话</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="flex gap-3.5 animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: 'backwards' }}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              message.role === 'user'
                ? 'bg-primary/15 text-primary'
                : 'bg-accent text-muted-foreground'
            }`}>
              {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-xs text-muted-foreground/70 mb-1.5 font-medium uppercase tracking-wider">
                {message.role === 'user' ? '你' : '助手'}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-[14px] leading-relaxed">
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
                      <details key={i} open className="text-muted-foreground text-xs border border-border/50 rounded-lg p-3 my-3 bg-muted/30 backdrop-blur-sm transition-colors hover:bg-muted/50">
                        <summary className="cursor-pointer font-medium text-muted-foreground/80 select-none">
                          <span className="ml-1">思考过程</span>
                        </summary>
                        <div className="whitespace-pre-wrap mt-2.5 leading-relaxed text-muted-foreground/70 border-t border-border/30 pt-2.5">
                          {part.text}
                        </div>
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
          <div className="flex gap-3.5 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-muted-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground pt-1">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-subtle-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-subtle-pulse" style={{ animationDelay: '300ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-subtle-pulse" style={{ animationDelay: '600ms' }} />
              </div>
              <span className="text-sm text-muted-foreground/70">正在思考...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
