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
import { Separator } from '@/components/ui/separator';
import { Trash2, Clock, MapPin, Globe, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cache, cachedFetcher } from '@/lib/cache';
import { settingsConfig, modelsConfig } from '@/lib/swr-config';

interface Model {
  id: string;
  provider_id: string;
  name: string;
  enabled: number;
  provider_name?: string;
}

export function GeneralSettings() {
  const { data: models } = useSWR<Model[]>(
    '/api/models?enabled=true',
    () => cachedFetcher<Model[]>('/api/models?enabled=true', cache.keys().enabledModels),
    modelsConfig
  );
  const { data: settings } = useSWR<Record<string, string>>(
    '/api/settings',
    () => cachedFetcher<Record<string, string>>('/api/settings', cache.keys().settings),
    settingsConfig
  );
  const { toast } = useToast();
  
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [globalPromptEnabled, setGlobalPromptEnabled] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [timeEnabled, setTimeEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
      const timeStr = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setCurrentTime(`${dateStr} ${timeStr} (${timezone})`);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load location settings
  useEffect(() => {
    const timeEnabledStored = localStorage.getItem('time_injection_enabled');
    setTimeEnabled(timeEnabledStored === null ? true : timeEnabledStored === 'true');
    
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

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      
      // Invalidate settings cache
      cache.invalidate(cache.keys().settings);
      mutate('/api/settings');
      
      toast({ variant: 'success', description: '保存成功' });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      toast({ variant: 'destructive', description: '保存失败' });
    }
  };

  const handleDefaultModelChange = async (value: string) => {
    setDefaultModelId(value);
    await saveSetting('default_model_id', value);
  };

  const handleGlobalPromptEnabledChange = async (checked: boolean) => {
    setGlobalPromptEnabled(checked);
    await saveSetting('global_system_prompt_enabled', String(checked));
  };

  const handleGlobalPromptBlur = async () => {
    if (settings?.global_system_prompt !== globalPrompt) {
      await saveSetting('global_system_prompt', globalPrompt);
    }
  };

  const handleTavilyKeyBlur = async () => {
    if (settings?.tavily_api_key !== tavilyApiKey) {
      await saveSetting('tavily_api_key', tavilyApiKey);
    }
  };

  // Handle time injection toggle
  const handleTimeToggle = (checked: boolean) => {
    setTimeEnabled(checked);
    localStorage.setItem('time_injection_enabled', checked.toString());
    toast({
      variant: 'success',
      description: checked ? '已启用时间信息注入' : '已禁用时间信息注入',
    });
  };

  const handleLocationToggle = async (enabled: boolean) => {
    setLocationEnabled(enabled);
    localStorage.setItem('location_sharing_enabled', String(enabled));
    
    if (enabled) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc: {
              latitude: number;
              longitude: number;
              timestamp: number;
              city?: string;
              country?: string;
            } = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now(),
            };
            
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
            toast({ variant: 'success', description: '位置获取成功' });
          },
          (error) => {
            console.error('Location permission denied:', error);
            setLocationEnabled(false);
            localStorage.setItem('location_sharing_enabled', 'false');
            toast({ variant: 'destructive', description: '位置权限被拒绝' });
          },
          { timeout: 5000 }
        );
      } else {
        toast({ variant: 'destructive', description: '浏览器不支持定位' });
        setLocationEnabled(false);
        localStorage.setItem('location_sharing_enabled', 'false');
      }
    } else {
      setCurrentLocation('');
      localStorage.removeItem('user_location');
      toast({ variant: 'success', description: '已禁用位置共享' });
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
      toast({ variant: 'success', description: '聊天记录已清空' });
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      toast({ variant: 'destructive', description: '操作失败' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* System Context */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">系统上下文</CardTitle>
          <CardDescription className="text-muted-foreground/70">
            AI 自动感知的时间和位置信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">时间信息</span>
                <Switch
                  checked={timeEnabled}
                  onCheckedChange={handleTimeToggle}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                自动注入当前日期、时间和时区
              </p>
              {timeEnabled && (
                <div className="text-xs text-primary font-mono">
                  {currentTime}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">位置共享</span>
                <Switch
                  checked={locationEnabled}
                  onCheckedChange={handleLocationToggle}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                提供地理位置以获得本地化建议
              </p>
              {locationEnabled && currentLocation && (
                <div className="text-xs text-primary font-mono">
                  📍 {currentLocation}
                </div>
              )}
              {!locationEnabled && (
                <div className="text-xs text-muted-foreground">
                  位置共享已禁用
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Config */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">对话配置</CardTitle>
          <CardDescription className="text-muted-foreground/70">
            默认对话模型和系统提示词设置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-model">默认模型</Label>
            <Select value={defaultModelId} onValueChange={handleDefaultModelChange}>
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
            <p className="text-xs text-muted-foreground/70">
              新建对话时默认使用的模型
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="global-prompt">全局系统提示词</Label>
              <Switch
                checked={globalPromptEnabled}
                onCheckedChange={handleGlobalPromptEnabledChange}
              />
            </div>
            {globalPromptEnabled && (
              <>
                <Textarea
                  id="global-prompt"
                  placeholder="例如：请始终使用中文回答，保持简洁明了的风格..."
                  value={globalPrompt}
                  onChange={(e) => setGlobalPrompt(e.target.value)}
                  onBlur={handleGlobalPromptBlur}
                  rows={5}
                  className="resize-none border-border/50 bg-card/50 focus:border-primary/30"
                />
                <p className="text-xs text-muted-foreground/70">
                  自动注入到每次对话，优先级高于对话级提示词
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tools Integration */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">工具集成</CardTitle>
              <CardDescription className="text-muted-foreground/70">
                配置外部工具和服务
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tavily-key">Tavily 搜索 API Key</Label>
            <Input
              id="tavily-key"
              name="tavily-apikey"
              type="password"
              placeholder="tvly-..."
              value={tavilyApiKey}
              onChange={(e) => setTavilyApiKey(e.target.value)}
              onBlur={handleTavilyKeyBlur}
              autoComplete="new-password"
              data-form-type="other"
              data-lpignore="true"
              role="presentation"
              className="border-border/50 bg-card/50 focus:border-primary/30"
            />
            <p className="text-xs text-muted-foreground/70">
              配置后智能体可自动搜索网络获取最新信息 · 
              <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                获取 API Key
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">数据管理</CardTitle>
              <CardDescription className="text-muted-foreground/70">
                管理您的聊天记录数据
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">清空所有聊天记录</h3>
              <p className="text-xs text-muted-foreground mt-1">
                此操作将删除所有对话记录且无法恢复
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
