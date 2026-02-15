'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Star, MessageSquare, Sparkles, Settings, Search, X, Trash2, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationItem {
  id: string;
  title: string;
  model_id: string;
  agent_id?: string;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface MainSidebarProps {
  currentConversationId?: string;
  onSelectConversation?: (id: string, hasAgent: boolean) => void;
  defaultAgentName?: string;
  onCollapse?: () => void;
}

export function MainSidebar({
  currentConversationId,
  onSelectConversation,
  defaultAgentName = '默认智能体',
  onCollapse
}: MainSidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: conversations = [], mutate } = useSWR<ConversationItem[]>('/api/conversations', fetcher);

  // Search functionality
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
        if (res.ok) setSearchResults(await res.json());
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      mutate();
    } finally {
      setDeletingId(null);
    }
  };

  const displayConversations = searchQuery.trim() ? searchResults : conversations.slice(0, 10);

  return (
    <div className="w-full h-full border-r border-border/50 bg-background flex flex-col">
      {/* Header with Logo */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <Link href="/chat" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-accent flex items-center justify-center shadow-sm">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">LLM Plaza</span>
          </Link>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onCollapse}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Navigation Buttons */}
      <div className="px-3 pb-3 space-y-1.5">
        <Link href="/chat">
          <button
            className={cn(
              'w-full h-10 rounded-lg flex items-center gap-3 px-3 text-sm font-medium transition-all duration-200',
              pathname === '/chat'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-accent'
            )}
          >
            <Star className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{defaultAgentName}</span>
          </button>
        </Link>

        <Link href="/chat/models">
          <button
            className={cn(
              'w-full h-10 rounded-lg flex items-center gap-3 px-3 text-sm font-medium transition-all duration-200',
              pathname?.startsWith('/chat/models')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-accent'
            )}
          >
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span>大模型对话</span>
          </button>
        </Link>

        <Link href="/chat/agents/browse">
          <button
            className={cn(
              'w-full h-10 rounded-lg flex items-center gap-3 px-3 text-sm font-medium transition-all duration-200',
              pathname?.startsWith('/chat/agents/browse')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-accent'
            )}
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span>智能体广场</span>
          </button>
        </Link>
      </div>

      <div className="mx-4 h-px bg-border/50 mb-3" />

      {/* Chat History Section */}
      <div className="flex-1 flex flex-col min-h-0 px-3">
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            聊天记录
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索对话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 pr-9 text-sm bg-background/50 border-border/50"
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

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 pr-1">
            {displayConversations.length === 0 && !searchQuery && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                暂无对话记录
              </div>
            )}
            {displayConversations.length === 0 && searchQuery && !isSearching && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                未找到匹配的对话
              </div>
            )}
            {isSearching && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                搜索中...
              </div>
            )}
            {displayConversations.map((conv) => {
              const isAgent = !!conv.agent_id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation?.(conv.id, !!conv.agent_id)}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-all duration-200',
                    currentConversationId === conv.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isAgent ? (
                    <Sparkles className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium">{conv.title || '新对话'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity duration-200 hover:text-destructive"
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
      </div>

      {/* Footer Actions */}
      <div className="p-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Link href="/settings/general" className="flex-1">
            <button
              className={cn(
                'w-full h-8 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200',
                pathname?.startsWith('/settings')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Settings className="h-4 w-4" />
              <span>设置</span>
            </button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
