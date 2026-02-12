'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ProviderFormData {
  id: string;
  name: string;
  type: string;
  base_url: string;
  api_key: string;
  enabled: number;
}

function makeInitForm(data?: Partial<ProviderFormData>): ProviderFormData {
  return {
    id: data?.id || '',
    name: data?.name || '',
    type: data?.type || 'openai_compatible',
    base_url: data?.base_url || '',
    api_key: '',
    enabled: data?.enabled ?? 1,
  };
}

export function ProviderForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  initialData?: Partial<ProviderFormData>;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState<ProviderFormData>(() => makeInitForm(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form state when dialog opens with new initialData
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
      const url = isEdit ? `/api/providers/${form.id}` : '/api/providers';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, unknown> = { ...form };
      // Don't send empty api_key on edit (means unchanged)
      if (isEdit && !form.api_key) {
        delete body.api_key;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          <DialogTitle>{isEdit ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              value={form.id}
              onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              placeholder="e.g. openai, deepseek"
              disabled={isEdit}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">显示名称</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. OpenAI"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">类型</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              大多数国内厂商（DeepSeek、通义千问、豆包等）兼容 OpenAI 接口
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              id="base_url"
              value={form.base_url}
              onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
              placeholder="https://api.openai.com/v1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={form.api_key}
              onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
              placeholder={isEdit ? '留空则不修改' : '输入 API Key'}
            />
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
