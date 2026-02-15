'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Trash2, Plus, Eye, Sparkles, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProviderForm } from '@/components/settings/provider-form';
import { ModelForm } from '@/components/settings/model-form';
import { cn } from '@/lib/utils';
import { cache, cachedFetcher } from '@/lib/cache';
import { providersConfig, modelsConfig } from '@/lib/swr-config';

interface ProviderItem {
  id: string;
  name: string;
  type: string;
  base_url: string;
  api_key: string;
  api_format: string;
  has_api_key: boolean;
  enabled: number;
  sort_order: number;
}

interface ModelItem {
  id: string;
  provider_id: string;
  provider_name: string;
  name: string;
  enabled: number;
  temperature: number;
  max_tokens: number;
  sort_order: number;
  is_reasoning_model?: number;
  default_reasoning_effort?: string;
  reasoning_type?: string;
  supports_vision?: number;
}

export function ModelsManagement() {
  const { data: providers, isLoading: providersLoading, mutate: mutateProviders } = useSWR<ProviderItem[]>(
    '/api/providers',
    () => cachedFetcher<ProviderItem[]>('/api/providers', cache.keys().providers),
    providersConfig
  );
  const { data: models, isLoading: modelsLoading, mutate: mutateModels } = useSWR<ModelItem[]>(
    '/api/models',
    () => cachedFetcher<ModelItem[]>('/api/models', cache.keys().models),
    modelsConfig
  );
  const { toast } = useToast();

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [modelFormOpen, setModelFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);
  const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null);
  const [dragOverProviderId, setDragOverProviderId] = useState<string | null>(null);

  // Sort providers by sort_order - memoized
  const sortedProviders = useMemo(() => {
    return providers?.sort((a, b) => a.sort_order - b.sort_order) || [];
  }, [providers]);

  // Auto-select first provider
  useEffect(() => {
    if (sortedProviders.length > 0 && !selectedProviderId) {
      setSelectedProviderId(sortedProviders[0].id);
    }
  }, [sortedProviders, selectedProviderId]);

  // Get selected provider
  const selectedProvider = sortedProviders.find(p => p.id === selectedProviderId);

  // Filter models: only show models from enabled providers or selected provider
  const filteredModels = models?.filter(m => {
    if (m.provider_id === selectedProviderId) return true;
    const provider = providers?.find(p => p.id === m.provider_id);
    return provider?.enabled === 1;
  }) || [];

  // Models for selected provider
  const providerModels = filteredModels.filter(m => m.provider_id === selectedProviderId) || [];

  const handleProviderToggle = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/providers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
      });
      cache.invalidate(cache.keys().providers);
      cache.invalidate(cache.keys().models);
      mutateProviders();
      mutateModels();
      toast({ variant: 'success', description: enabled ? '已启用' : '已禁用' });
    } catch {
      toast({ variant: 'destructive', description: '操作失败' });
    }
  };

  const handleProviderDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除 Provider "${name}"？相关模型也会被删除。`)) return;
    try {
      await fetch(`/api/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      cache.invalidate(cache.keys().providers);
      cache.invalidate(cache.keys().models);
      cache.invalidate(cache.keys().enabledModels);
      mutateProviders();
      mutateModels();
      if (selectedProviderId === id) {
        setSelectedProviderId(sortedProviders[0]?.id || null);
      }
      toast({ variant: 'success', description: '删除成功' });
    } catch {
      toast({ variant: 'destructive', description: '删除失败' });
    }
  };

  const handleProviderEdit = (provider: ProviderItem) => {
    setEditingProvider(provider);
    setProviderFormOpen(true);
  };

  const handleProviderAdd = () => {
    setEditingProvider(null);
    setProviderFormOpen(true);
  };

  // Provider sorting
  const handleProviderMove = async (id: string, direction: 'up' | 'down') => {
    const index = sortedProviders.findIndex(p => p.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedProviders.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const provider = sortedProviders[index];
    const swapProvider = sortedProviders[swapIndex];

    try {
      await Promise.all([
        fetch(`/api/providers/${encodeURIComponent(provider.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: swapProvider.sort_order }),
        }),
        fetch(`/api/providers/${encodeURIComponent(swapProvider.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: provider.sort_order }),
        }),
      ]);
      cache.invalidate(cache.keys().providers);
      mutateProviders();
      toast({ variant: 'success', description: '排序已更新' });
    } catch {
      toast({ variant: 'destructive', description: '排序失败' });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, providerId: string) => {
    setDraggedProviderId(providerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', providerId);
  };

  const handleDragOver = (e: React.DragEvent, providerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedProviderId !== providerId) {
      setDragOverProviderId(providerId);
    }
  };

  const handleDragEnd = () => {
    setDraggedProviderId(null);
    setDragOverProviderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetProviderId: string) => {
    e.preventDefault();
    
    if (!draggedProviderId || draggedProviderId === targetProviderId) {
      setDraggedProviderId(null);
      setDragOverProviderId(null);
      return;
    }

    const draggedIndex = sortedProviders.findIndex(p => p.id === draggedProviderId);
    const targetIndex = sortedProviders.findIndex(p => p.id === targetProviderId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newProviders = [...sortedProviders];
    const [draggedItem] = newProviders.splice(draggedIndex, 1);
    newProviders.splice(targetIndex, 0, draggedItem);

    // Update sort_order for all affected providers
    try {
      await Promise.all(
        newProviders.map((provider, index) =>
          fetch(`/api/providers/${encodeURIComponent(provider.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: index }),
          })
        )
      );
      cache.invalidate(cache.keys().providers);
      mutateProviders();
      toast({ variant: 'success', description: '排序已更新' });
    } catch {
      toast({ variant: 'destructive', description: '排序失败' });
    }

    setDraggedProviderId(null);
    setDragOverProviderId(null);
  };

  const handleModelToggle = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/models/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
      });
      cache.invalidate(cache.keys().models);
      cache.invalidate(cache.keys().enabledModels);
      mutateModels();
      toast({ variant: 'success', description: enabled ? '已启用' : '已禁用' });
    } catch {
      toast({ variant: 'destructive', description: '操作失败' });
    }
  };

  const handleModelDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除模型 "${name}"？`)) return;
    try {
      await fetch(`/api/models/${encodeURIComponent(id)}`, { method: 'DELETE' });
      cache.invalidate(cache.keys().models);
      cache.invalidate(cache.keys().enabledModels);
      mutateModels();
      toast({ variant: 'success', description: '删除成功' });
    } catch {
      toast({ variant: 'destructive', description: '删除失败' });
    }
  };

  const handleModelEdit = (model: ModelItem) => {
    setEditingModel(model);
    setModelFormOpen(true);
  };

  const handleModelAdd = () => {
    setEditingModel(null);
    setModelFormOpen(true);
  };

  if (providersLoading || modelsLoading) {
    return (
      <div className="flex gap-6">
        <Skeleton className="w-64 h-96" />
        <Skeleton className="flex-1 h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">大模型管理</h2>
          <p className="text-sm text-muted-foreground">
            管理 Provider 和模型配置
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleProviderAdd} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            添加 Provider
          </Button>
          <Button onClick={handleModelAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            添加模型
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-4">
        {/* Left: Provider List */}
        <Card className="w-72 border-border/50">
          <CardContent className="p-0">
            <div className="p-3 border-b border-border/50">
              <h3 className="text-sm font-semibold">Provider 顺序</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {providers?.length || 0} 个 · {providers?.filter(p => p.enabled).length || 0} 已启用
              </p>
              <p className="text-xs text-primary/80 mt-1.5 flex items-center gap-1">
                <span>💡</span>
                <span>拖拽或点击箭头调整，影响聊天界面显示顺序</span>
              </p>
            </div>
            <ScrollArea className="h-[calc(100vh-24rem)]">
              <div className="p-2 space-y-1">
                {sortedProviders.map((provider, index) => (
                  <div
                    key={provider.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, provider.id)}
                    onDragOver={(e) => handleDragOver(e, provider.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, provider.id)}
                    onClick={() => setSelectedProviderId(provider.id)}
                    className={cn(
                      'w-full flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all group',
                      selectedProviderId === provider.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-accent',
                      draggedProviderId === provider.id && 'opacity-50',
                      dragOverProviderId === provider.id && 'border-t-2 border-primary'
                    )}
                  >
                    {/* Order Number */}
                    <div className="text-xs font-medium opacity-50 w-4 flex-shrink-0">
                      {index + 1}
                    </div>
                    
                    {/* Drag Handle */}
                    <GripVertical 
                      className="h-4 w-4 opacity-30 group-hover:opacity-60 flex-shrink-0 cursor-grab active:cursor-grabbing" 
                      onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                      onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    />
                    
                    {/* Sort Buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProviderMove(provider.id, 'up');
                        }}
                        disabled={index === 0}
                        className="opacity-40 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed transition-opacity"
                        title="上移"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProviderMove(provider.id, 'down');
                        }}
                        disabled={index === sortedProviders.length - 1}
                        className="opacity-40 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed transition-opacity"
                        title="下移"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    
                    {/* Provider Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{provider.name}</div>
                      <div className="text-xs opacity-70">
                        {models?.filter(m => m.provider_id === provider.id).length || 0} 个模型
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    {provider.enabled === 0 && (
                      <Badge variant="outline" className="text-xs">禁用</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Models List */}
        <div className="flex-1 space-y-4">
          {selectedProvider && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedProvider.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {providerModels.length} 个模型 · {providerModels.filter(m => m.enabled).length} 已启用
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedProvider.enabled === 1}
                      onCheckedChange={(checked) => handleProviderToggle(selectedProvider.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleProviderEdit(selectedProvider)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleProviderDelete(selectedProvider.id, selectedProvider.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedProvider && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  {providerModels.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">暂无模型</p>
                      <Button
                        onClick={handleModelAdd}
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        添加模型
                      </Button>
                    </div>
                  ) : (
                    providerModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{model.name}</span>
                            <div className="flex items-center gap-1">
                              {model.supports_vision === 1 && (
                                <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                                  <Eye className="h-3 w-3" />
                                  视觉
                                </Badge>
                              )}
                              {model.is_reasoning_model === 1 && (
                                <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                                  <Sparkles className="h-3 w-3" />
                                  推理
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            温度: {model.temperature} · 最大令牌: {model.max_tokens}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={model.enabled === 1}
                            onCheckedChange={(checked) => handleModelToggle(model.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleModelEdit(model)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleModelDelete(model.id, model.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedProvider && providers && providers.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">还没有添加任何 Provider</p>
                  <Button onClick={handleProviderAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    添加第一个 Provider
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Forms */}
      {providerFormOpen && (
        <ProviderForm
          initialData={editingProvider || undefined}
          isEdit={!!editingProvider}
          open={providerFormOpen}
          onOpenChange={setProviderFormOpen}
          onSave={() => {
            cache.invalidate(cache.keys().providers);
            cache.invalidate(cache.keys().models);
            cache.invalidate(cache.keys().enabledModels);
            mutateProviders();
            mutateModels();
            setProviderFormOpen(false);
            setEditingProvider(null);
          }}
        />
      )}

      {modelFormOpen && (
        <ModelForm
          initialData={editingModel || undefined}
          isEdit={!!editingModel}
          open={modelFormOpen}
          onOpenChange={setModelFormOpen}
          onSave={() => {
            cache.invalidate(cache.keys().models);
            cache.invalidate(cache.keys().enabledModels);
            mutateModels();
            setModelFormOpen(false);
            setEditingModel(null);
          }}
        />
      )}
    </div>
  );
}
