'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain } from 'lucide-react';

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
  // For binary type models (like GLM), show enable/disable options
  if (reasoningType === 'binary') {
    return (
      <div className="flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5 text-primary/60" />
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-accent/50 border-border/50 hover:bg-accent transition-colors duration-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border/50 bg-popover/95 backdrop-blur-md">
            <SelectItem value="disabled">
              <div className="flex flex-col items-start">
                <span>禁用思考</span>
                <span className="text-xs text-muted-foreground">关闭</span>
              </div>
            </SelectItem>
            <SelectItem value="enabled">
              <div className="flex flex-col items-start">
                <span>启用思考</span>
                <span className="text-xs text-muted-foreground">开启</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // For levels type models (like DeepSeek, Doubao), show 4 levels
  return (
    <div className="flex items-center gap-1.5">
      <Brain className="h-3.5 w-3.5 text-primary/60" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[130px] h-8 text-xs bg-accent/50 border-border/50 hover:bg-accent transition-colors duration-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border/50 bg-popover/95 backdrop-blur-md">
          <SelectItem value="minimal">
            <div className="flex flex-col items-start">
              <span>Minimal</span>
              <span className="text-xs text-muted-foreground">不思考</span>
            </div>
          </SelectItem>
          <SelectItem value="low">
            <div className="flex flex-col items-start">
              <span>Low</span>
              <span className="text-xs text-muted-foreground">低程度</span>
            </div>
          </SelectItem>
          <SelectItem value="medium">
            <div className="flex flex-col items-start">
              <span>Medium</span>
              <span className="text-xs text-muted-foreground">中等</span>
            </div>
          </SelectItem>
          <SelectItem value="high">
            <div className="flex flex-col items-start">
              <span>High</span>
              <span className="text-xs text-muted-foreground">深度思考</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
