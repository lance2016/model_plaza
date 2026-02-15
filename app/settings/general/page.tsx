'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Trash2, Globe, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [globalPromptEnabled, setGlobalPromptEnabled] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');

  // Load location settings
  useEffect(() => {
    const enabled = localStorage.getItem('location_sharing_enabled') === 'true';
    setLocationEnabled(enabled);
    
    if (enabled) {
      const cached = localStorage.getItem('user_location');
      if (cached) {
        try {
          const loc = JSON.parse(cached);
          if (loc.city && loc.country) {
            setCurrentLocation(`${loc.country} ${loc.city}`);
          } else {
            setCurrentLocation(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
          }
        } catch (e) {
          console.error('Failed to parse location:', e);
        }
      }
    }
  }, []);

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
      toast({
        variant: 'success',
        description: '保存成功',
      });
    } catch (error) {
      console.error('Failed to save default model:', error);
      toast({
        variant: 'destructive',
        description: '保存失败',
      });
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
      toast({
        variant: 'success',
        description: '保存成功',
      });
    } catch (error) {
      console.error('Failed to save global prompt:', error);
      toast({
        variant: 'destructive',
        description: '保存失败',
      });
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
      toast({
        variant: 'success',
        description: '保存成功',
      });
    } catch (error) {
      console.error('Failed to save Tavily key:', error);
      toast({
        variant: 'destructive',
        description: '保存失败',
      });
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
      toast({
        variant: 'success',
        description: '聊天记录已清空',
      });
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      toast({
        variant: 'destructive',
        description: '操作失败',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    setLocationEnabled(enabled);
    localStorage.setItem('location_sharing_enabled', String(enabled));
    
    if (enabled) {
      // Request location permission
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now(),
            };
            
            // Try to reverse geocode
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${loc.latitude}&lon=${loc.longitude}&format=json&accept-language=zh-CN`
              );
              if (res.ok) {
                const data = await res.json();
                loc.city = data.address?.city || data.address?.town || data.address?.village;
                loc.country = data.address?.country;
                
                if (loc.city && loc.country) {
                  setCurrentLocation(`${loc.country} ${loc.city}`);
                } else {
                  setCurrentLocation(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
                }
              }
            } catch (e) {
              console.error('Failed to reverse geocode:', e);
              setCurrentLocation(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
            }
            
            localStorage.setItem('user_location', JSON.stringify(loc));
            toast({
              variant: 'success',
              description: '位置获取成功',
            });
          },
          (error) => {
            console.error('Location permission denied:', error);
            setLocationEnabled(false);
            localStorage.setItem('location_sharing_enabled', 'false');
            toast({
              variant: 'destructive',
              description: '位置权限被拒绝',
            });
          },
          { timeout: 5000 }
        );
      } else {
        toast({
          variant: 'destructive',
          description: '浏览器不支持定位',
        });
        setLocationEnabled(false);
        localStorage.setItem('location_sharing_enabled', 'false');
      }
    } else {
      setCurrentLocation('');
      localStorage.removeItem('user_location');
      toast({
        variant: 'success',
        description: '已禁用位置共享',
      });
    }
  };

  return (
    <div className="space-y-6">
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

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">位置共享</CardTitle>
                <CardDescription className="text-muted-foreground/70">
                  允许 AI 获取您的位置信息以提供更精准的建议
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={locationEnabled}
              onCheckedChange={handleLocationToggle}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentLocation && (
              <div className="text-sm text-muted-foreground">
                当前位置: <span className="font-medium text-foreground">{currentLocation}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              启用后，AI 将能够获取您的地理位置(经纬度、城市、国家)以提供本地化建议。位置信息会缓存 1 小时。您可以随时禁用此功能。
            </p>
          </div>
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
