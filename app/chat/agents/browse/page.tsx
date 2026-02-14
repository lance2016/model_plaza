'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Sparkles, ArrowLeft } from 'lucide-react';
import { AgentCard } from '@/components/agents/agent-card';
import { AgentForm, type AgentFormData } from '@/components/agents/agent-form';
import { AgentDetail } from '@/components/agents/agent-detail';
import type { Agent } from '@/lib/db';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type FilterTab = 'all' | 'favorited';

export default function AgentsBrowsePage() {
  const router = useRouter();
  const { data: agents = [], mutate } = useSWR<Agent[]>('/api/agents', fetcher);
  const { data: settings, mutate: mutateSettings } = useSWR<Record<string, string>>('/api/settings', fetcher);
  const defaultAgentId = settings?.default_agent_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Agent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/agents?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    agents.forEach(a => {
      try { (JSON.parse(a.tags) as string[]).forEach(t => tagSet.add(t)); } catch {}
    });
    return Array.from(tagSet);
  }, [agents]);

  // Filtered agents
  const displayAgents = useMemo(() => {
    let list = searchQuery.trim() ? searchResults : agents;

    if (filterTab === 'favorited') {
      list = list.filter(a => a.is_favorited === 1);
    }

    if (selectedTag) {
      list = list.filter(a => {
        try { return (JSON.parse(a.tags) as string[]).includes(selectedTag); } catch { return false; }
      });
    }

    return list;
  }, [agents, searchResults, searchQuery, filterTab, selectedTag]);

  const handleUse = useCallback((agent: Agent) => {
    router.push(`/chat/agents?agent=${encodeURIComponent(agent.id)}`);
  }, [router]);

  const handleToggleFavorite = useCallback(async (agent: Agent) => {
    try {
      await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorited: agent.is_favorited ? 0 : 1 }),
      });
      mutate();
      if (detailAgent?.id === agent.id) {
        setDetailAgent({ ...agent, is_favorited: agent.is_favorited ? 0 : 1 });
      }
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  }, [mutate, detailAgent]);

  const handleSave = useCallback(async (data: AgentFormData) => {
    try {
      if (editingAgent) {
        await fetch(`/api/agents/${encodeURIComponent(editingAgent.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      mutate();
      setFormOpen(false);
      setEditingAgent(null);
    } catch (e) {
      console.error('Failed to save agent:', e);
    }
  }, [editingAgent, mutate]);

  const handleEdit = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (agent: Agent) => {
    if (!confirm(`确定要删除「${agent.name}」吗？`)) return;
    try {
      await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, { method: 'DELETE' });
      mutate();
    } catch (e) {
      console.error('Failed to delete agent:', e);
    }
  }, [mutate]);

  const handleSetDefault = useCallback(async (agent: Agent) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_agent_id', value: agent.id }),
      });
      mutateSettings();
    } catch (e) {
      console.error('Failed to set default agent:', e);
    }
  }, [mutateSettings]);

  const handleDetail = useCallback((agent: Agent) => {
    setDetailAgent(agent);
    setDetailOpen(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setEditingAgent(null);
    setFormOpen(true);
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-8">
          <Link href="/chat/agents">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200">
              <ArrowLeft className="h-4 w-4" />
              返回对话
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">智能体广场</h1>
          </div>
          <Button onClick={handleCreateNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            创建智能体
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索智能体..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-10 border-border/50 bg-card/50"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-1">
            {([
              ['all', '全部'],
              ['favorited', '收藏'],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                variant={filterTab === key ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setFilterTab(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className="cursor-pointer flex-shrink-0 text-xs"
              onClick={() => setSelectedTag(null)}
            >
              全部
            </Badge>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer flex-shrink-0 text-xs"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Agent grid */}
        {isSearching ? (
          <div className="text-center py-12 text-muted-foreground">搜索中...</div>
        ) : displayAgents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? '未找到匹配的智能体' : filterTab === 'favorited' ? '暂无收藏的智能体' : '暂无智能体'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isDefault={defaultAgentId === agent.id}
                onUse={handleUse}
                onToggleFavorite={handleToggleFavorite}
                onSetDefault={handleSetDefault}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDetail={handleDetail}
              />
            ))}
          </div>
        )}

        {/* Form dialog */}
        <AgentForm
          open={formOpen}
          onOpenChange={v => { setFormOpen(v); if (!v) setEditingAgent(null); }}
          agent={editingAgent}
          onSave={handleSave}
        />

        {/* Detail dialog */}
        <AgentDetail
          open={detailOpen}
          onOpenChange={setDetailOpen}
          agent={detailAgent}
          onUse={handleUse}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </div>
  );
}
