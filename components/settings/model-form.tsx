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
  is_reasoning_model: number;
  default_reasoning_effort: string;
  reasoning_type: string;
  supports_vision: number;
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
    is_reasoning_model: data?.is_reasoning_model ?? 0,
    default_reasoning_effort: data?.default_reasoning_effort || 'medium',
    reasoning_type: data?.reasoning_type || 'levels',
    supports_vision: data?.supports_vision ?? 1, // Default to support vision
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
          <div className="flex items-center gap-2">
            <Switch
              checked={form.supports_vision === 1}
              onCheckedChange={checked => setForm(f => ({ ...f, supports_vision: checked ? 1 : 0 }))}
            />
            <div>
              <Label>支持图片输入</Label>
              <p className="text-xs text-muted-foreground">允许用户上传图片进行多模态对话</p>
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_reasoning_model === 1}
                onCheckedChange={checked => setForm(f => ({ ...f, is_reasoning_model: checked ? 1 : 0 }))}
              />
              <div>
                <Label>思考模型</Label>
                <p className="text-xs text-muted-foreground">支持显示推理思考过程</p>
              </div>
            </div>
            {form.is_reasoning_model === 1 && (
              <div className="space-y-4 ml-11">
                <div className="space-y-2">
                  <Label htmlFor="reasoning-type">思考类型</Label>
                  <Select 
                    value={form.reasoning_type} 
                    onValueChange={v => setForm(f => ({ 
                      ...f, 
                      reasoning_type: v,
                      // Reset default effort when changing type
                      default_reasoning_effort: v === 'binary' ? 'enabled' : 'medium'
                    }))}
                  >
                    <SelectTrigger id="reasoning-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="binary">
                        <div className="flex flex-col items-start">
                          <span>二进制开关</span>
                          <span className="text-xs text-muted-foreground">仅启用/禁用（如智谱GLM）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="levels">
                        <div className="flex flex-col items-start">
                          <span>多级可调</span>
                          <span className="text-xs text-muted-foreground">支持四个级别（如豆包、DeepSeek）</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reasoning-effort">默认设置</Label>
                  {form.reasoning_type === 'binary' ? (
                    <Select 
                      value={form.default_reasoning_effort} 
                      onValueChange={v => setForm(f => ({ ...f, default_reasoning_effort: v }))}
                    >
                      <SelectTrigger id="reasoning-effort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">禁用思考</SelectItem>
                        <SelectItem value="enabled">启用思考</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select 
                      value={form.default_reasoning_effort} 
                      onValueChange={v => setForm(f => ({ ...f, default_reasoning_effort: v }))}
                    >
                      <SelectTrigger id="reasoning-effort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal (不思考)</SelectItem>
                        <SelectItem value="low">Low (低)</SelectItem>
                        <SelectItem value="medium">Medium (中等)</SelectItem>
                        <SelectItem value="high">High (高)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {form.reasoning_type === 'binary' 
                      ? '默认启用或禁用思考功能'
                      : '思考程度越高，响应时间越长，但推理质量越好'
                    }
                  </p>
                </div>
              </div>
            )}
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
