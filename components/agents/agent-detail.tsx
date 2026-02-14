'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentIcon } from './agent-icon';
import { Play, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/db';

interface AgentDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  onUse: (agent: Agent) => void;
  onToggleFavorite: (agent: Agent) => void;
}

export function AgentDetail({ open, onOpenChange, agent, onUse, onToggleFavorite }: AgentDetailProps) {
  if (!agent) return null;

  const tags: string[] = (() => {
    try { return JSON.parse(agent.tags); } catch { return []; }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-start gap-3">
            <AgentIcon icon={agent.icon} color={agent.icon_color} size="lg" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg">{agent.name}</DialogTitle>
              <DialogDescription className="mt-1">{agent.description}</DialogDescription>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[45vh] px-6">
          <div className="space-y-4 pb-2">
            <div>
              <h4 className="text-sm font-medium mb-1.5">系统提示词</h4>
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">
                {agent.system_prompt}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {agent.model_id && (
                <div>
                  <span className="text-muted-foreground">首选模型</span>
                  <p className="font-medium text-xs mt-0.5">{agent.model_id}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">温度</span>
                <p className="font-medium text-xs mt-0.5">{agent.temperature}</p>
              </div>
              <div>
                <span className="text-muted-foreground">最大 Tokens</span>
                <p className="font-medium text-xs mt-0.5">{agent.max_tokens}</p>
              </div>
              <div>
                <span className="text-muted-foreground">使用次数</span>
                <p className="font-medium text-xs mt-0.5">{agent.use_count}</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1.5',
              agent.is_favorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'
            )}
            onClick={() => onToggleFavorite(agent)}
          >
            <Heart className={cn('h-4 w-4', agent.is_favorited && 'fill-current')} />
            {agent.is_favorited ? '已收藏' : '收藏'}
          </Button>
          <Button className="gap-1.5" onClick={() => { onUse(agent); onOpenChange(false); }}>
            <Play className="h-4 w-4" />
            开始对话
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
