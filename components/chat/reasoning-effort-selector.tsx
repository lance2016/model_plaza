'use client';

import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const levelOptions = [
  { value: 'minimal', label: '关闭', description: '不思考' },
  { value: 'low', label: '低', description: '简单推理' },
  { value: 'medium', label: '中', description: '中等推理' },
  { value: 'high', label: '高', description: '深度思考' },
];

export function ReasoningEffortSelector({
  value,
  onChange,
  disabled,
  reasoningType = 'levels',
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  reasoningType?: string;
}) {
  const isActive = reasoningType === 'binary'
    ? value === 'enabled'
    : value !== 'minimal';

  if (reasoningType === 'binary') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 transition-colors duration-200",
                isActive
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
              disabled={disabled}
              onClick={() => onChange(value === 'enabled' ? 'disabled' : 'enabled')}
            >
              <Brain className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>思考 · {isActive ? '已开启' : '已关闭'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const currentLevel = levelOptions.find(o => o.value === value);

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-7 gap-1 px-1.5 transition-colors duration-200",
                  isActive
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
                disabled={disabled}
              >
                <Brain className="h-3.5 w-3.5" />
                <span className="text-[11px]">{currentLevel?.label}</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>思考深度</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          className="w-auto p-1 border-border/50 bg-popover/95 backdrop-blur-md"
          align="start"
          sideOffset={8}
        >
          <div className="flex gap-0.5">
            {levelOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs transition-all duration-150",
                  value === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
