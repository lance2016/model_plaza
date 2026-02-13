'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Sparkles } from 'lucide-react';
import { MessageActions } from '@/components/chat/message-actions';
import type { ReadingWidth } from '@/components/chat/reading-width-selector';
import { widthOptions } from '@/components/chat/reading-width-selector';

export function MessageList({
  messages,
  status,
  onRegenerate,
  readingWidth = 'medium',
}: {
  messages: UIMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  onRegenerate?: () => void;
  readingWidth?: ReadingWidth;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const maxWidthClass = widthOptions.find(w => w.value === readingWidth)?.maxWidth || 'max-w-3xl';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Extract text content from message parts
  const getMessageText = (message: UIMessage): string => {
    if (!message.parts) return '';
    return message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n');
  };

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
      <div className={`${maxWidthClass} mx-auto px-4 py-8 space-y-6`}>
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`group flex gap-3 animate-fade-in-up ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
            style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: 'backwards' }}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`${message.role === 'user' ? 'max-w-[65%]' : 'flex-1 max-w-[85%]'}`}>
              {/* Images — rendered above the text bubble */}
              {(() => {
                const imageFiles = (message.parts?.filter(p => p.type === 'file') || [])
                  .map(p => p as unknown as { type: 'file'; url?: string; mediaType?: string })
                  .filter(p => p.mediaType?.startsWith('image/') && p.url);
                if (imageFiles.length === 0) return null;
                return (
                  <div className={`flex flex-wrap gap-1.5 mb-1.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {imageFiles.map((file, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={file.url}
                        alt={`图片 ${i + 1}`}
                        className="rounded-lg object-cover border border-border/30 shadow-sm max-h-48 max-w-[200px]"
                      />
                    ))}
                  </div>
                );
              })()}
              {/* Text bubble */}
              <div className={`shadow-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground px-3.5 py-1.5 rounded-lg inline-block'
                  : 'bg-card/80 backdrop-blur-sm border border-border/50 px-4 py-3 rounded-2xl'
              }`}>
                <div className={`prose prose-sm max-w-none leading-[1.7] ${
                  message.role === 'user' ? 'prose-user' : 'dark:prose-invert'
                }`} style={{ fontSize: '14.5px' }}>
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
                        <details key={i} className="text-muted-foreground text-xs border border-border/30 rounded-lg p-3 my-3 bg-muted/20 backdrop-blur-sm transition-all hover:bg-muted/30 hover:border-border/40">
                          <summary className="cursor-pointer font-medium text-muted-foreground/60 select-none hover:text-muted-foreground/80 transition-colors flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 transition-transform details-marker" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span>思考过程 (点击展开)</span>
                          </summary>
                          <div className="whitespace-pre-wrap mt-3 pt-3 leading-relaxed text-muted-foreground/60 border-t border-border/20 text-[11px]">
                            {part.text}
                          </div>
                        </details>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              {message.role === 'assistant' && (
                <div className="mt-1">
                  <MessageActions
                    content={getMessageText(message)}
                    role={message.role}
                    onRegenerate={index === messages.length - 1 ? onRegenerate : undefined}
                    canRegenerate={index === messages.length - 1 && status === 'ready'}
                  />
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-sm">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {status === 'submitted' && (
          <div className="flex gap-3 animate-fade-in justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground pt-2">
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
