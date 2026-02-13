'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Type, Check } from 'lucide-react';

type ReadingWidth = 'narrow' | 'medium' | 'wide';

interface ReadingWidthSelectorProps {
  value: ReadingWidth;
  onChange: (width: ReadingWidth) => void;
}

const widthOptions = [
  { value: 'narrow' as const, label: '窄屏', maxWidth: 'max-w-2xl' },
  { value: 'medium' as const, label: '中等', maxWidth: 'max-w-3xl' },
  { value: 'wide' as const, label: '宽屏', maxWidth: 'max-w-5xl' },
];

export function ReadingWidthSelector({ value, onChange }: ReadingWidthSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="阅读宽度"
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <Type className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {widthOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="gap-2 cursor-pointer"
          >
            {value === option.value && <Check className="h-3.5 w-3.5 text-primary" />}
            {value !== option.value && <div className="w-3.5" />}
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { widthOptions };
export type { ReadingWidth };
