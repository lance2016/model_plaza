'use client';

import { useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Square, FileText, Link2, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadingWidth } from '@/components/chat/reading-width-selector';
import { widthOptions } from '@/components/chat/reading-width-selector';
import { ReasoningEffortSelector } from '@/components/chat/reasoning-effort-selector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ImageAttachment {
  url: string;
  mimeType: string;
}

export function ChatPanel({
  input,
  setInput,
  onSubmit,
  onStop,
  status,
  disabled,
  readingWidth = 'medium',
  isReasoningModel,
  reasoningEffort,
  reasoningType,
  onReasoningEffortChange,
  images,
  onImagesChange,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  status: string;
  disabled?: boolean;
  readingWidth?: ReadingWidth;
  isReasoningModel?: boolean;
  reasoningEffort?: string;
  reasoningType?: string;
  onReasoningEffortChange?: (effort: string) => void;
  images: ImageAttachment[];
  onImagesChange: (images: ImageAttachment[]) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isLoading = status === 'submitted' || status === 'streaming';
  
  const maxWidthClass = widthOptions.find(w => w.value === readingWidth)?.maxWidth || 'max-w-3xl';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && (input.trim() || images.length > 0)) {
        onSubmit();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onImagesChange([...images, {
          url: base64,
          mimeType: file.type,
        }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Image previews */}
      {images.length > 0 && (
        <div className={cn(maxWidthClass, "mx-auto mb-2")}>
          <div className="flex flex-wrap gap-2 p-2">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={`上传 ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-border/50 shadow-sm"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={cn(
        maxWidthClass,
        "mx-auto relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300",
        isFocused && "border-primary/30 glow-sm",
        disabled && "opacity-50"
      )}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 border-b border-border/30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>快捷模板 (即将推出)</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>上传图片 (支持多图)</p>
              </TooltipContent>
            </Tooltip>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>引用内容 (即将推出)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Reasoning Effort Selector */}
          {isReasoningModel && onReasoningEffortChange && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs text-muted-foreground/70">思考:</span>
              <ReasoningEffortSelector
                value={reasoningEffort || 'medium'}
                onChange={onReasoningEffortChange}
                disabled={disabled}
                reasoningType={reasoningType}
              />
            </div>
          )}
          
          <div className="ml-auto text-[11px] text-muted-foreground/50">
            Enter 发送 · Shift+Enter 换行
          </div>
        </div>
        
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="输入消息..."
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
              disabled={disabled || (!input.trim() && images.length === 0)}
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
