'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Trash2, Star, Globe, CheckCircle2 } from 'lucide-react';
import { AgentForm, type AgentFormData } from '@/components/agents/agent-form';
import { AgentIcon } from '@/components/agents/agent-icon';
import { useToast } from '@/hooks/use-toast';
import type { Agent } from '@/lib/db';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type FilterTab = 'all' | 'favorited';

export function AgentsManagement() {
  const { data: agents = [], mutate } = useSWR<Agent[]>('/api/agents', fetcher);
  const { data: settings } = useSWR<Record<string, string>>('/api/settings', fetcher);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Get default agent ID from settings
  const defaultAgentId = settings?.default_agent_id;

  // Filtered agents
  const displayAgents = useMemo(() => {
    let list = agents;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }

    // Filter by tab
    if (filterTab === 'favorited') {
      list = list.filter(a => a.is_favorited === 1);
    }

    return list;
  }, [agents, searchQuery, filterTab]);

  const handleEdit = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setFormOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingAgent(null);
    setFormOpen(true);
  }, []);

  const handleSave = useCallback(async (data: AgentFormData) => {
    try {
      if (editingAgent) {
        await fetch(`/api/agents/${encodeURIComponent(editingAgent.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        toast({ variant: 'success', description: '更新成功' });
      } else {
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        toast({ variant: 'success', description: '创建成功' });
      }
      mutate();
      setFormOpen(false);
      setEditingAgent(null);
    } catch (e) {
      console.error('Failed to save agent:', e);
      toast({ variant: 'destructive', description: '操作失败' });
    }
  }, [editingAgent, mutate, toast]);

  const handleDelete = useCallback(async (agent: Agent) => {
    if (!confirm(`确定删除智能体 "${agent.name}"？`)) return;
    try {
      await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, { method: 'DELETE' });
      mutate();
      toast({ variant: 'success', description: '删除成功' });
    } catch (e) {
      console.error('Failed to delete agent:', e);
      toast({ variant: 'destructive', description: '删除失败' });
    }
  }, [mutate, toast]);

  const handleToggleFavorite = useCallback(async (agent: Agent) => {
    try {
      await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorited: agent.is_favorited ? 0 : 1 }),
      });
      mutate();
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  }, [mutate]);

  const handleSetDefault = useCallback(async (agentId: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_agent_id', value: agentId }),
      });
      // Refresh settings using global mutate
      globalMutate('/api/settings');
      toast({ variant: 'success', description: '已设置为默认智能体' });
    } catch (e) {
      console.error('Failed to set default agent:', e);
      toast({ variant: 'destructive', description: '设置失败' });
    }
  }, [toast]);

  // Parse tools
  const getAgentTools = (agent: Agent) => {
    try {
      const tools = JSON.parse(agent.enabled_tools);
      return tools.length > 0 ? tools : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">智能体管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理和配置您的智能体
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          创建智能体
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索智能体..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTab('all')}
          >
            全部 ({agents.length})
          </Button>
          <Button
            variant={filterTab === 'favorited' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTab('favorited')}
          >
            收藏 ({agents.filter(a => a.is_favorited).length})
          </Button>
        </div>
      </div>

      {/* Agent Cards Grid */}
      {displayAgents.length === 0 ? (
        <Card className="border-border/50">
          <div className="p-12 text-center text-muted-foreground">
            {searchQuery ? '未找到匹配的智能体' : '还没有创建任何智能体'}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAgents.map((agent) => {
            const tools = getAgentTools(agent);
            return (
              <Card
                key={agent.id}
                className={cn(
                  'border-border/50 hover:border-primary/30 transition-all duration-200 overflow-hidden',
                  'hover:shadow-md flex flex-col h-full'
                )}
              >
                <div className="p-5 flex flex-col flex-1">
                  {/* Header - Fixed height */}
                  <div className="flex items-start gap-3 mb-3">
                    <AgentIcon
                      icon={agent.icon}
                      color={agent.icon_color}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{agent.name}</h3>
                      <div className="h-10 mt-1">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {agent.description || '\u00A0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Middle section - Flexible */}
                  <div className="space-y-3 mb-4">
                    {/* Model */}
                    <div className="flex items-center gap-2 text-sm min-h-[24px]">
                      <span className="text-muted-foreground text-xs">模型:</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded truncate">
                        {agent.model_id || '-'}
                      </code>
                    </div>

                    {/* Tools */}
                    <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
                      {tools.length > 0 ? (
                        tools.map((tool: string) => (
                          <Badge key={tool} variant="secondary" className="text-xs gap-1">
                            {tool === 'web_search' && <Globe className="h-3 w-3" />}
                            {tool === 'web_search' ? '搜索' : tool}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">无工具</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom section - Fixed position */}
                  <div className="mt-auto">
                    {/* Status & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        {defaultAgentId === agent.id && (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            默认
                          </Badge>
                        )}
                        {agent.is_published === 1 && (
                          <Badge variant="secondary" className="text-xs">公开</Badge>
                        )}
                        {agent.is_favorited === 1 && (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600/30">
                            <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                            收藏
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {defaultAgentId !== agent.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(agent.id)}
                            title="设为默认"
                          >
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleFavorite(agent)}
                          title={agent.is_favorited === 1 ? '取消收藏' : '收藏'}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4 transition-colors',
                              agent.is_favorited === 1 
                                ? 'fill-yellow-500 text-yellow-500' 
                                : 'text-muted-foreground hover:text-yellow-500'
                            )}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(agent)}
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(agent)}
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Agent Form */}
      {formOpen && (
        <AgentForm
          agent={editingAgent}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
