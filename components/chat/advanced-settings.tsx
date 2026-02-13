'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Settings } from 'lucide-react';

export interface ChatConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface AdvancedSettingsProps {
  config: ChatConfig;
  onChange: (config: ChatConfig) => void;
  disabled?: boolean;
}

export function AdvancedSettings({ config, onChange, disabled }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(false);

  const updateConfig = (updates: Partial<ChatConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          title="高级设置"
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l border-border/50 bg-background/95 backdrop-blur-md">
        <SheetHeader>
          <SheetTitle>高级设置</SheetTitle>
          <SheetDescription className="text-muted-foreground/70">
            自定义对话参数以获得更好的效果
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-sm font-medium">系统提示词</Label>
            <Textarea
              id="system-prompt"
              placeholder="你是一个有帮助的AI助手..."
              value={config.systemPrompt}
              onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
              rows={4}
              className="resize-none border-border/50 bg-card/50 focus:border-primary/30"
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              定义AI的角色和行为方式
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature" className="text-sm font-medium">温度 (Temperature)</Label>
              <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                {config.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[config.temperature]}
              onValueChange={(value) => updateConfig({ temperature: value[0] })}
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              控制输出的随机性。较低值更确定，较高值更有创造性
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-tokens" className="text-sm font-medium">最大 Tokens</Label>
              <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                {config.maxTokens}
              </span>
            </div>
            <Slider
              id="max-tokens"
              min={256}
              max={32000}
              step={256}
              value={[config.maxTokens]}
              onValueChange={(value) => updateConfig({ maxTokens: value[0] })}
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              限制生成的最大长度
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="top-p" className="text-sm font-medium">Top P (核采样)</Label>
              <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                {config.topP.toFixed(2)}
              </span>
            </div>
            <Slider
              id="top-p"
              min={0}
              max={1}
              step={0.05}
              value={[config.topP]}
              onValueChange={(value) => updateConfig({ topP: value[0] })}
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              控制采样的多样性。1.0 表示考虑所有可能的词
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="frequency-penalty" className="text-sm font-medium">频率惩罚</Label>
              <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                {config.frequencyPenalty.toFixed(2)}
              </span>
            </div>
            <Slider
              id="frequency-penalty"
              min={-2}
              max={2}
              step={0.1}
              value={[config.frequencyPenalty]}
              onValueChange={(value) => updateConfig({ frequencyPenalty: value[0] })}
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              减少重复内容。正值降低已出现词的概率
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="presence-penalty" className="text-sm font-medium">存在惩罚</Label>
              <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                {config.presencePenalty.toFixed(2)}
              </span>
            </div>
            <Slider
              id="presence-penalty"
              min={-2}
              max={2}
              step={0.1}
              value={[config.presencePenalty]}
              onValueChange={(value) => updateConfig({ presencePenalty: value[0] })}
            />
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              鼓励谈论新话题。正值增加新词的概率
            </p>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            className="w-full border-border/50 text-muted-foreground hover:text-foreground transition-colors duration-200"
            onClick={() => {
              onChange({
                systemPrompt: '',
                temperature: 0.7,
                maxTokens: 4096,
                topP: 1.0,
                frequencyPenalty: 0,
                presencePenalty: 0,
              });
            }}
          >
            重置为默认值
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
