'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Model {
  id: string;
  provider_id: string;
  name: string;
  enabled: number;
  provider_name?: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function GeneralSettingsPage() {
  const { data: models } = useSWR<Model[]>('/api/models?enabled=true', fetcher);
  const { data: settings } = useSWR<Record<string, string>>('/api/settings', fetcher);
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (settings?.default_model_id) {
      setDefaultModelId(settings.default_model_id);
    }
  }, [settings]);

  const handleSaveDefaultModel = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_model_id', value: defaultModelId }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      mutate('/api/settings');
      setMessage({ type: 'success', text: '默认模型已保存' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save default model:', error);
      setMessage({ type: 'error', text: '保存失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleClearConversations = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_conversations' }),
      });

      if (!res.ok) throw new Error('Failed to clear conversations');

      mutate('/api/conversations');
      setShowClearDialog(false);
      setMessage({ type: 'success', text: '所有聊天记录已清空' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      setMessage({ type: 'error', text: '清空失败' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">默认模型</CardTitle>
          <CardDescription className="text-muted-foreground/70">选择新建对话时默认使用的模型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-model">默认模型</Label>
            <Select value={defaultModelId} onValueChange={setDefaultModelId}>
              <SelectTrigger id="default-model">
                <SelectValue placeholder="选择默认模型" />
              </SelectTrigger>
              <SelectContent>
                {models?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.provider_name} - {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveDefaultModel} disabled={!defaultModelId}>
            保存
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">数据管理</CardTitle>
          <CardDescription className="text-muted-foreground/70">管理您的聊天记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">清空所有聊天记录</h3>
              <p className="text-sm text-muted-foreground mt-1">
                此操作将删除所有对话记录,且无法恢复
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空记录
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认清空聊天记录</DialogTitle>
            <DialogDescription>
              此操作将删除所有对话记录,且无法恢复。您确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={isClearing}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConversations}
              disabled={isClearing}
            >
              {isClearing ? '清空中...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
