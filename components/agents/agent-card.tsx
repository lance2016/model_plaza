'use client';

import { Heart, Play, Pencil, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentIcon } from './agent-icon';
import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/db';

interface AgentCardProps {
  agent: Agent;
  isDefault?: boolean;
  onUse: (agent: Agent) => void;
  onToggleFavorite: (agent: Agent) => void;
  onSetDefault?: (agent: Agent) => void;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onDetail: (agent: Agent) => void;
}

export function AgentCard({ agent, isDefault, onUse, onToggleFavorite, onSetDefault, onEdit, onDelete, onDetail }: AgentCardProps) {
  const tags: string[] = (() => {
    try { return JSON.parse(agent.tags); } catch { return []; }
  })();

  return (
    <div className="group relative rounded-xl border border-border/50 bg-card/50 p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-3">
        <button onClick={() => onDetail(agent)} className="cursor-pointer">
          <AgentIcon icon={agent.icon} color={agent.icon_color} />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => onDetail(agent)} className="text-left cursor-pointer">
            <h3 className="font-semibold text-sm truncate hover:text-primary transition-colors">{agent.name}</h3>
          </button>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 flex-shrink-0 transition-colors',
            agent.is_favorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'
          )}
          onClick={() => onToggleFavorite(agent)}
        >
          <Heart className={cn('h-3.5 w-3.5', agent.is_favorited && 'fill-current')} />
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          {isDefault ? (
            <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-current" />
              默认
            </span>
          ) : onSetDefault ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] text-muted-foreground hover:text-primary px-1 gap-0.5"
              onClick={() => onSetDefault(agent)}
            >
              <Star className="h-3 w-3" />
              设为默认
            </Button>
          ) : null}
          <span className="text-[10px] text-muted-foreground">
            {agent.use_count > 0 ? `${agent.use_count} 次使用` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(agent)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(agent)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button size="sm" className="h-7 text-xs gap-1 px-3" onClick={() => onUse(agent)}>
            <Play className="h-3 w-3" />
            使用
          </Button>
        </div>
      </div>
    </div>
  );
}
