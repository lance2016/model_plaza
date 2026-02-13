'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ProviderForm } from '@/components/settings/provider-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Plus, Key, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ProvidersPage() {
  const { data: providers, isLoading, mutate } = useSWR<ProviderItem[]>('/api/providers', fetcher);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const { toast } = useToast();

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/providers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
      });
      mutate();
      toast({ title: enabled ? 'Provider 已启用' : 'Provider 已禁用' });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`确定删除 Provider "${id}"？相关模型也会被删除。`)) return;
    try {
      await fetch(`/api/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      mutate();
      toast({ title: 'Provider 已删除' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleEdit = (provider: ProviderItem) => {
    setEditingProvider(provider);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setFormOpen(true);
  };

  const typeLabel: Record<string, string> = {
    openai_compatible: 'OpenAI Compatible',
    anthropic: 'Anthropic',
    google: 'Google',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Provider 管理</h1>
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Provider 管理</h1>
        <Button onClick={handleAdd} className="gap-1.5 gradient-accent text-white shadow-sm hover:shadow-md transition-all duration-200">
          <Plus className="h-4 w-4" />
          添加 Provider
        </Button>
      </div>

      {providers?.map(provider => (
        <Card key={provider.id} className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{provider.name}</CardTitle>
                <Badge variant="secondary">{typeLabel[provider.type] || provider.type}</Badge>
                {provider.api_format === 'responses' && (
                  <Badge variant="outline" className="text-xs">Responses</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={provider.enabled === 1}
                  onCheckedChange={(checked) => handleToggle(provider.id, checked)}
                />
                <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(provider.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="truncate">{provider.base_url}</span>
              <span className="flex items-center gap-1">
                {provider.has_api_key ? (
                  <>
                    <Key className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400 text-xs">已配置</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-amber-400" />
                    <span className="text-amber-400 text-xs">未配置 API Key</span>
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      <ProviderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={() => {
          mutate();
          toast({ title: editingProvider ? 'Provider 已更新' : 'Provider 已添加' });
        }}
        initialData={editingProvider || undefined}
        isEdit={!!editingProvider}
      />
    </div>
  );
}
