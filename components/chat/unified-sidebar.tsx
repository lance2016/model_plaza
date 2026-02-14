'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquarePlus, Trash2, Search, X, Sparkles, MessageSquare, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentIcon } from '@/components/agents/agent-icon';

interface ConversationItem {
  id: string;
  title: string;
  model_id: string;
  agent_id?: string;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function UnifiedSidebar({
  currentConversationId,
  onNewChat,
  onSelectConversation,
  streamingConversationIds = [],
  mode = 'agent',
  currentAgentName,
  currentAgentIcon,
  currentAgentIconColor,
}: {
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  streamingConversationIds?: string[];
  mode?: 'agent' | 'model';
  currentAgentName?: string;
  currentAgentIcon?: string;
  currentAgentIconColor?: string;
}) {
  const { data: allConversations = [], mutate } = useSWR<ConversationItem[]>('/api/conversations', fetcher);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter conversations by agent_id presence
  const agentConversations = allConversations.filter(conv => conv.agent_id);
  const modelConversations = allConversations.filter(conv => !conv.agent_id);

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
      if (currentConversationId === id) onNewChat();
    } finally {
      setDeletingId(null);
    }
  };

  const renderConversationList = (conversations: ConversationItem[]) => (
    <div className="p-2 space-y-0.5">
      {conversations.length === 0 && !searchQuery && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          暂无对话记录
        </div>
      )}
      {conversations.length === 0 && searchQuery && !isSearching && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          未找到匹配的对话
        </div>
      )}
      {isSearching && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          搜索中...
        </div>
      )}
      {conversations.map((conv) => {
        const isStreaming = streamingConversationIds.includes(conv.id);
        const isAgent = !!conv.agent_id;
        return (
          <div
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={cn(
              'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all duration-200',
              currentConversationId === conv.id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {isStreaming ? (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            ) : (
              isAgent ? (
                <Sparkles className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
              )
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
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {mode === 'agent' && currentAgentIcon ? (
            <AgentIcon icon={currentAgentIcon} color={currentAgentIconColor || '#3b82f6'} size="xs" />
          ) : mode === 'agent' ? (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="font-semibold text-sm truncate">
            {mode === 'agent' ? (currentAgentName || '智能体对话') : '大模型对话'}
          </span>
        </div>

        {mode === 'agent' && (
          <Link href="/chat/agents/browse">
            <Button
              variant="ghost"
              className="w-full justify-center gap-2 h-8 bg-accent/50 hover:bg-accent text-foreground border border-border/30 transition-all duration-200 mb-2"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              浏览智能体
            </Button>
          </Link>
        )}

        <Button
          onClick={onNewChat}
          className="w-full justify-center gap-2 h-8 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all duration-200 mb-3"
          variant="ghost"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          新对话
        </Button>

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

      <div className="mx-4 h-px bg-border/50 mb-2" />

      {/* Unified conversation list with tabs */}
      {searchQuery ? (
        <ScrollArea className="flex-1">
          {renderConversationList(searchResults)}
        </ScrollArea>
      ) : (
        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mb-2 grid w-[calc(100%-2rem)] grid-cols-3 h-7">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            <TabsTrigger value="agent" className="text-xs">智能体</TabsTrigger>
            <TabsTrigger value="model" className="text-xs">大模型</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {renderConversationList(allConversations)}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="agent" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {renderConversationList(agentConversations)}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="model" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {renderConversationList(modelConversations)}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
