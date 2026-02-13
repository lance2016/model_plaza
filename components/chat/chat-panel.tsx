'use client';

import { useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPanel({
  input,
  setInput,
  onSubmit,
  onStop,
  status,
  disabled,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  status: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && input.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className={cn(
        "max-w-3xl mx-auto relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300",
        isFocused && "border-primary/30 glow-sm",
        disabled && "opacity-50"
      )}>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          disabled={disabled}
          className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none pr-14 text-[14px]"
          rows={1}
        />
        <div className="absolute right-2 bottom-2">
          {isLoading ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors duration-200"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onSubmit}
              disabled={disabled || !input.trim()}
              className="h-8 w-8 rounded-lg gradient-accent text-white shadow-sm hover:shadow-md disabled:opacity-30 disabled:shadow-none transition-all duration-200"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground/40 mt-2">
        LLM Plaza &mdash; AI 生成内容仅供参考
      </p>
    </div>
  );
}
