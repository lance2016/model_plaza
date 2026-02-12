'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ModelForm } from '@/components/settings/model-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface ModelItem {
  id: string;
  provider_id: string;
  provider_name: string;
  name: string;
  enabled: number;
  temperature: number;
  max_tokens: number;
  sort_order: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ModelsPage() {
  const { data: models, isLoading, mutate } = useSWR<ModelItem[]>('/api/models', fetcher);
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
    });
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`确定删除模型 "${id}"？`)) return;
    await fetch(`/api/models/${id}`, { method: 'DELETE' });
    mutate();
  };

  const handleEdit = (model: ModelItem) => {
    setEditingModel(model);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingModel(null);
    setFormOpen(true);
  };

  // Group models by provider
  const grouped = (models || []).reduce<Record<string, ModelItem[]>>((acc, model) => {
    const key = model.provider_name || model.provider_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(model);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">模型管理</h1>
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">模型管理</h1>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          添加模型
        </Button>
      </div>

      {Object.entries(grouped).map(([providerName, providerModels]) => (
        <div key={providerName} className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">{providerName}</h2>
          {providerModels.map(model => (
            <Card key={model.id}>
              <CardHeader className="py-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">{model.id}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={model.enabled === 1}
                      onCheckedChange={(checked) => handleToggle(model.id, checked)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(model)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(model.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Temperature: {model.temperature}</span>
                  <span>Max Tokens: {model.max_tokens}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <ModelForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={() => mutate()}
        initialData={editingModel || undefined}
        isEdit={!!editingModel}
      />
    </div>
  );
}
