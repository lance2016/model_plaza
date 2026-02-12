'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquarePlus, Settings, Trash2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}: {
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
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
        <Link href="/" className="flex items-center gap-2 mb-4">
          <Bot className="h-6 w-6" />
          <span className="font-semibold text-lg">LLM Plaza</span>
        </Link>
        <Button onClick={onNewChat} className="w-full" variant="outline">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          新对话
        </Button>
      </div>

      <Separator />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                'group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-accent',
                currentConversationId === conv.id && 'bg-accent'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate">{conv.title || '新对话'}</p>
                <p className="text-xs text-muted-foreground">{formatTime(conv.updated_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => handleDelete(conv.id, e)}
                disabled={deletingId === conv.id}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4">
        <Link href="/settings/general">
          <Button variant="ghost" className={cn('w-full justify-start', pathname?.startsWith('/settings') && 'bg-accent')}>
            <Settings className="h-4 w-4 mr-2" />
            设置
          </Button>
        </Link>
      </div>
    </div>
  );
}
