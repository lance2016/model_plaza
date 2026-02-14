'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Trash2, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
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
  const [globalPromptEnabled, setGlobalPromptEnabled] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (settings?.default_model_id) {
      setDefaultModelId(settings.default_model_id);
    }
    if (settings?.global_system_prompt_enabled !== undefined) {
      setGlobalPromptEnabled(settings.global_system_prompt_enabled === 'true');
    }
    if (settings?.global_system_prompt !== undefined) {
      setGlobalPrompt(settings.global_system_prompt);
    }
    if (settings?.tavily_api_key !== undefined) {
      setTavilyApiKey(settings.tavily_api_key);
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

  const handleSaveGlobalPrompt = async () => {
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'global_system_prompt_enabled', value: String(globalPromptEnabled) }),
        }),
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'global_system_prompt', value: globalPrompt }),
        }),
      ]);
      mutate('/api/settings');
      setMessage({ type: 'success', text: '全局提示词已保存' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save global prompt:', error);
      setMessage({ type: 'error', text: '保存失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveTavilyKey = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tavily_api_key', value: tavilyApiKey }),
      });
      mutate('/api/settings');
      setMessage({ type: 'success', text: 'Tavily API Key 已保存' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save Tavily key:', error);
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

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">全局系统提示词</CardTitle>
              <CardDescription className="text-muted-foreground/70">
                注入到所有对话中的系统提示词，优先级高于对话级提示词
              </CardDescription>
            </div>
            <Switch
              checked={globalPromptEnabled}
              onCheckedChange={setGlobalPromptEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="global-prompt">提示词内容</Label>
            <Textarea
              id="global-prompt"
              placeholder="例如：请始终使用中文回答，保持简洁明了的风格..."
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              rows={5}
              disabled={!globalPromptEnabled}
              className="resize-none border-border/50 bg-card/50 focus:border-primary/30 disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              启用后，此提示词会自动注入到每次对话中。如果对话本身也配置了系统提示词，两者会合并，且全局提示词具有最高优先级。
            </p>
          </div>
          <Button onClick={handleSaveGlobalPrompt}>
            保存
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">联网搜索</CardTitle>
              <CardDescription className="text-muted-foreground/70">
                配置 Tavily API Key 后，智能体将支持联网搜索功能
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tavily-key">Tavily API Key</Label>
            <Input
              id="tavily-key"
              type="password"
              placeholder="tvly-..."
              value={tavilyApiKey}
              onChange={(e) => setTavilyApiKey(e.target.value)}
              className="border-border/50 bg-card/50 focus:border-primary/30"
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              前往 <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">tavily.com</a> 获取 API Key，配置后智能体可自动搜索网络获取最新信息
            </p>
          </div>
          <Button onClick={handleSaveTavilyKey}>
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
