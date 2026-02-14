'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AgentIcon, AVAILABLE_ICONS, ICON_COLORS } from './agent-icon';
import { X } from 'lucide-react';
import type { Agent } from '@/lib/db';

interface AgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  onSave: (data: AgentFormData) => void;
}

export interface AgentFormData {
  name: string;
  description: string;
  icon: string;
  icon_color: string;
  system_prompt: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  tags: string;
  is_published: number;
}

interface Model {
  id: string;
  name: string;
  provider_name?: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function AgentForm({ open, onOpenChange, agent, onSave }: AgentFormProps) {
  const { data: models = [] } = useSWR<Model[]>('/api/models', fetcher);

  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [icon, setIcon] = useState(agent?.icon ?? 'bot');
  const [iconColor, setIconColor] = useState(agent?.icon_color ?? '#3b82f6');
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '');
  const [modelId, setModelId] = useState(agent?.model_id ?? '');
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(agent?.max_tokens ?? 4096);
  const [topP, setTopP] = useState(agent?.top_p ?? 1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(agent?.frequency_penalty ?? 0);
  const [presencePenalty, setPresencePenalty] = useState(agent?.presence_penalty ?? 0);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(() => {
    try { return agent?.tags ? JSON.parse(agent.tags) : []; } catch { return []; }
  });
  const [isPublished, setIsPublished] = useState(agent?.is_published !== 0);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Sync form state when agent prop or open state changes
  useEffect(() => {
    if (open) {
      setName(agent?.name ?? '');
      setDescription(agent?.description ?? '');
      setIcon(agent?.icon ?? 'bot');
      setIconColor(agent?.icon_color ?? '#3b82f6');
      setSystemPrompt(agent?.system_prompt ?? '');
      setModelId(agent?.model_id ?? '');
      setTemperature(agent?.temperature ?? 0.7);
      setMaxTokens(agent?.max_tokens ?? 4096);
      setTopP(agent?.top_p ?? 1.0);
      setFrequencyPenalty(agent?.frequency_penalty ?? 0);
      setPresencePenalty(agent?.presence_penalty ?? 0);
      setTags(() => { try { return agent?.tags ? JSON.parse(agent.tags) : []; } catch { return []; } });
      setIsPublished(agent?.is_published !== 0);
      setTagInput('');
    }
  }, [open, agent]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (!name.trim() || !systemPrompt.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      icon_color: iconColor,
      system_prompt: systemPrompt,
      model_id: modelId,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      tags: JSON.stringify(tags),
      is_published: isPublished ? 1 : 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{agent ? '编辑智能体' : '创建智能体'}</DialogTitle>
          <DialogDescription>
            {agent ? '修改智能体的配置信息' : '配置一个新的智能体'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 pb-4">
            {/* Icon + Name */}
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">图标</Label>
                <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="cursor-pointer rounded-xl border border-border/50 p-1 hover:border-primary/30 transition-colors">
                      <AgentIcon icon={icon} color={iconColor} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">选择图标</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {AVAILABLE_ICONS.map(iconName => (
                          <button
                            key={iconName}
                            className={`p-2 rounded-lg hover:bg-accent transition-colors ${icon === iconName ? 'bg-accent ring-1 ring-primary' : ''}`}
                            onClick={() => { setIcon(iconName); }}
                          >
                            <AgentIcon icon={iconName} color={iconColor} size="sm" />
                          </button>
                        ))}
                      </div>
                      <p className="text-sm font-medium">选择颜色</p>
                      <div className="flex gap-2">
                        {ICON_COLORS.map(c => (
                          <button
                            key={c}
                            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${iconColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setIconColor(c)}
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="agent-name" className="text-sm font-medium">名称 *</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="给智能体起个名字"
                  className="border-border/50"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="agent-desc" className="text-sm font-medium">描述</Label>
              <Textarea
                id="agent-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="简要描述智能体的功能..."
                rows={2}
                className="resize-none border-border/50"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <Label htmlFor="agent-prompt" className="text-sm font-medium">系统提示词 *</Label>
              <Textarea
                id="agent-prompt"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="定义智能体的角色、行为和能力..."
                rows={5}
                className="resize-none border-border/50"
              />
              <p className="text-xs text-muted-foreground/60">这是智能体的核心，决定了它的行为方式</p>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label htmlFor="agent-model" className="text-sm font-medium">首选模型</Label>
              <select
                id="agent-model"
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                className="w-full h-9 rounded-md border border-border/50 bg-background px-3 text-sm"
              >
                <option value="">不指定（使用当前模型）</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.provider_name ? `${m.provider_name} / ` : ''}{m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">温度 (Temperature)</Label>
                <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <Slider min={0} max={2} step={0.1} value={[temperature]} onValueChange={v => setTemperature(v[0])} />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">最大 Tokens</Label>
                <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                  {maxTokens}
                </span>
              </div>
              <Slider min={256} max={32000} step={256} value={[maxTokens]} onValueChange={v => setMaxTokens(v[0])} />
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Top P</Label>
                <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                  {topP.toFixed(2)}
                </span>
              </div>
              <Slider min={0} max={1} step={0.05} value={[topP]} onValueChange={v => setTopP(v[0])} />
            </div>

            {/* Frequency Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">频率惩罚</Label>
                <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                  {frequencyPenalty.toFixed(2)}
                </span>
              </div>
              <Slider min={-2} max={2} step={0.1} value={[frequencyPenalty]} onValueChange={v => setFrequencyPenalty(v[0])} />
            </div>

            {/* Presence Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">存在惩罚</Label>
                <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                  {presencePenalty.toFixed(2)}
                </span>
              </div>
              <Slider min={-2} max={2} step={0.1} value={[presencePenalty]} onValueChange={v => setPresencePenalty(v[0])} />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">标签</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="输入标签后按回车"
                  className="border-border/50"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                />
                <Button variant="outline" size="sm" onClick={addTag} className="h-9 px-3">添加</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded-md">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Published */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">公开发布</Label>
                <p className="text-xs text-muted-foreground/60">其他用户可以在广场中看到</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !systemPrompt.trim()}>
            {agent ? '保存修改' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
