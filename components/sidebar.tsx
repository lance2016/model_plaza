'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus, Settings, Trash2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

interface ConversationItem {
  id: string;
  title: string;
  model_id: string;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function Sidebar({
  currentConversationId,
  onNewChat,
  onSelectConversation,
  streamingConversationIds = [],
}: {
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  streamingConversationIds?: string[];
}) {
  const pathname = usePathname();
  const { data: conversations = [], mutate } = useSWR<ConversationItem[]>('/api/conversations', fetcher);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      mutate();
      if (currentConversationId === id) {
        onNewChat();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2.5 mb-4 group">
          <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center shadow-sm">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight">LLM Plaza</span>
        </Link>
        <Button
          onClick={onNewChat}
          className="w-full justify-center gap-2 h-9 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all duration-200"
          variant="ghost"
        >
          <MessageSquarePlus className="h-4 w-4" />
          新对话
        </Button>
      </div>

      <div className="mx-4 h-px bg-border/50" />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {conversations.map((conv) => {
            const isStreaming = streamingConversationIds.includes(conv.id);
            return (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-all duration-200',
                currentConversationId === conv.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {isStreaming && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium">{conv.title || '新对话'}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{formatTime(conv.updated_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity duration-200 hover:text-destructive"
                onClick={(e) => handleDelete(conv.id, e)}
                disabled={deletingId === conv.id}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
          })}
        </div>
      </ScrollArea>

      <div className="mx-4 h-px bg-border/50" />

      {/* Footer */}
      <div className="p-4 flex items-center gap-1">
        <Link href="/settings/general" className="flex-1">
          <Button variant="ghost" className={cn(
            'w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground transition-colors duration-200',
            pathname?.startsWith('/settings') && 'bg-accent text-accent-foreground'
          )}>
            <Settings className="h-4 w-4" />
            <span className="text-sm">设置</span>
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
