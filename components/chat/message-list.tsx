'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Bot, Sparkles, Globe, Loader2, ExternalLink } from 'lucide-react';
import { AgentIcon } from '@/components/agents/agent-icon';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { MessageActions } from '@/components/chat/message-actions';
import type { ReadingWidth } from '@/components/chat/reading-width-selector';
import { widthOptions } from '@/components/chat/reading-width-selector';

export function MessageList({
  messages,
  status,
  onRegenerate,
  readingWidth = 'medium',
  agentName,
  agentIcon,
  agentIconColor,
}: {
  messages: UIMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  onRegenerate?: () => void;
  readingWidth?: ReadingWidth;
  agentName?: string;
  agentIcon?: string;
  agentIconColor?: string;
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
          {agentName ? (
            <>
              <div className="mx-auto mb-6">
                <AgentIcon icon={agentIcon || 'bot'} color={agentIconColor || '#3b82f6'} size="lg" className="mx-auto" />
              </div>
              <p className="text-lg font-medium text-foreground/90 tracking-tight">{agentName}</p>
              <p className="text-sm text-muted-foreground mt-1.5">输入消息，开始对话</p>
            </>
          ) : (
            <>
              <div className="relative mx-auto mb-6 w-16 h-16">
                <div className="absolute inset-0 rounded-2xl gradient-accent opacity-20 animate-subtle-pulse" />
                <div className="relative h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
              </div>
              <p className="text-lg font-medium text-foreground/90 tracking-tight">LLM Plaza</p>
              <p className="text-sm text-muted-foreground mt-1.5">选择一个模型，开始对话</p>
            </>
          )}
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
                      if (message.role === 'user') {
                        // User messages: plain text, no markdown
                        return <span key={i}>{part.text}</span>;
                      }
                      return <MarkdownRenderer key={i} content={part.text} />;
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
                    if (part.type === 'tool-web_search' || (part.type as string).startsWith('tool-')) {
                      const toolPart = part as unknown as {
                        type: string;
                        toolCallId: string;
                        input?: { query?: string };
                        state: string;
                        output?: {
                          results?: Array<{ title: string; url: string; content: string }>;
                        };
                      };
                      const query = toolPart.input?.query || '';
                      const isLoading = toolPart.state !== 'output-available';
                      const sources = toolPart.output?.results || [];
                      return (
                        <div key={i} className="text-xs border border-border/30 rounded-lg my-2 bg-muted/20 overflow-hidden">
                          <div className="flex items-center gap-2 p-2.5">
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />
                            ) : (
                              <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            )}
                            <span className="text-muted-foreground/70">
                              {isLoading ? '正在搜索' : '已搜索'}：{query}
                            </span>
                          </div>
                          {!isLoading && sources.length > 0 && (
                            <div className="border-t border-border/20 px-2.5 py-2 space-y-1">
                              {sources.map((source, si) => {
                                let domain = '';
                                try { domain = new URL(source.url).hostname.replace('www.', ''); } catch {}
                                return (
                                  <a
                                    key={si}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors group/src"
                                  >
                                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-40 group-hover/src:opacity-100" />
                                    <span className="truncate">{source.title}</span>
                                    {domain && <span className="text-muted-foreground/40 flex-shrink-0">({domain})</span>}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
