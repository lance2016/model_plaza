'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus, Settings, Trash2, Bot, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search conversations (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Display search results if searching, otherwise show all conversations
  const displayConversations = searchQuery.trim() ? searchResults : conversations;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      mutate();
      if (currentConversationId === id) {
        onNewChat();
      }
    } finally {
      setDeletingId(null);
    }
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
          className="w-full justify-center gap-2 h-9 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all duration-200 mb-3"
          variant="ghost"
        >
          <MessageSquarePlus className="h-4 w-4" />
          新对话
        </Button>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索标题或内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-9 text-sm bg-background/50 border-border/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 h-px bg-border/50" />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {displayConversations.length === 0 && searchQuery && !isSearching && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              未找到匹配的对话
            </div>
          )}
          {isSearching && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              搜索中...
            </div>
          )}
          {displayConversations.map((conv) => {
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
