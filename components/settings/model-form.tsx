'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ModelFormData {
  id: string;
  provider_id: string;
  name: string;
  enabled: number;
  temperature: number;
  max_tokens: number;
}

interface ProviderItem {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

function makeInitForm(data?: Partial<ModelFormData>): ModelFormData {
  return {
    id: data?.id || '',
    provider_id: data?.provider_id || '',
    name: data?.name || '',
    enabled: data?.enabled ?? 1,
    temperature: data?.temperature ?? 0.7,
    max_tokens: data?.max_tokens ?? 4096,
  };
}

export function ModelForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  initialData?: Partial<ModelFormData>;
  isEdit?: boolean;
}) {
  const { data: providers = [] } = useSWR<ProviderItem[]>('/api/providers', fetcher);

  const [form, setForm] = useState<ModelFormData>(() => makeInitForm(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setForm(makeInitForm(initialData));
      setError('');
    }
    prevOpenRef.current = open;
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/models/${form.id}` : '/api/models';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to save';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          // response body might be empty
        }
        throw new Error(errorMsg);
      }

      onSave();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑模型' : '添加模型'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">模型 ID</Label>
            <Input
              id="model-id"
              value={form.id}
              onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              placeholder="e.g. gpt-4o, claude-sonnet-4"
              disabled={isEdit}
              required
            />
            <p className="text-xs text-muted-foreground">
              需要与 API 实际的模型名称一致
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-name">显示名称</Label>
            <Input
              id="model-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. GPT-4o"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={form.provider_id} onValueChange={v => setForm(f => ({ ...f, provider_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="选择 Provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p: ProviderItem) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={e => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                step="1"
                min="1"
                value={form.max_tokens}
                onChange={e => setForm(f => ({ ...f, max_tokens: parseInt(e.target.value) || 4096 }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled === 1}
              onCheckedChange={checked => setForm(f => ({ ...f, enabled: checked ? 1 : 0 }))}
            />
            <Label>启用</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
