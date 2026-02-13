'use client';

import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Info } from 'lucide-react';
import type { ChatConfig } from '@/components/chat/advanced-settings';

interface ConfigSummaryProps {
  modelName: string;
  reasoningEffort?: string;
  config: ChatConfig;
  isReasoningModel: boolean;
}

export function ConfigSummary({ modelName, reasoningEffort, config, isReasoningModel }: ConfigSummaryProps) {
  const hasCustomConfig = 
    config.systemPrompt !== '' ||
    config.temperature !== 0.7 ||
    config.maxTokens !== 4096 ||
    config.topP !== 1.0 ||
    config.frequencyPenalty !== 0 ||
    config.presencePenalty !== 0;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50">
          <Info className="h-3 w-3" />
          <span>配置信息</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-foreground">当前对话配置</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">模型:</span>
                <span className="font-medium text-foreground">{modelName}</span>
              </div>
              {isReasoningModel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">思考程度:</span>
                  <Badge variant="secondary" className="text-xs h-5">
                    {reasoningEffort}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">温度:</span>
                <span className="font-mono text-foreground">{config.temperature.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最大Token:</span>
                <span className="font-mono text-foreground">{config.maxTokens}</span>
              </div>
              {hasCustomConfig && (
                <div className="pt-1 border-t border-border/50">
                  <Badge variant="outline" className="text-xs">
                    已自定义参数
                  </Badge>
                </div>
              )}
            </div>
          </div>
          {config.systemPrompt && (
            <div className="border-t border-border/50 pt-2">
              <div className="text-xs text-muted-foreground mb-1">系统提示词:</div>
              <div className="text-xs bg-muted/50 rounded p-2 max-h-20 overflow-y-auto text-foreground">
                {config.systemPrompt}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
