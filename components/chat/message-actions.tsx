'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, Check, MoreVertical, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
  content: string;
  role: 'user' | 'assistant';
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

export function MessageActions({ content, role, onRegenerate, canRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: '已复制',
        description: '内容已复制到剪贴板',
      });
    } catch {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-accent/80"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>复制内容</span>
              </>
            )}
          </DropdownMenuItem>
          {role === 'assistant' && canRegenerate && onRegenerate && (
            <DropdownMenuItem onClick={onRegenerate} className="gap-2 cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重新生成</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
