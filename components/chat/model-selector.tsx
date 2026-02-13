'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelItem {
  id: string;
  name: string;
  provider_id: string;
  provider_name: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: models = [] } = useSWR<ModelItem[]>('/api/models?enabled=true', fetcher);

  // Group models by provider
  const grouped = models.reduce<Record<string, ModelItem[]>>((acc, model) => {
    const key = model.provider_name || model.provider_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(model);
    return acc;
  }, {});

  const selectedModel = models.find(m => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between h-8 px-3 text-sm bg-accent/50 hover:bg-accent border border-border/50 transition-all duration-200"
        >
          {selectedModel ? (
            <span className="truncate">
              <span className="text-muted-foreground/70 text-xs mr-1.5">{selectedModel.provider_name}</span>
              <span className="font-medium">{selectedModel.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">选择模型...</span>
          )}
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 border-border/50 bg-popover/95 backdrop-blur-md shadow-xl">
        <Command>
          <CommandInput placeholder="搜索模型..." className="text-sm" />
          <CommandList>
            <CommandEmpty className="text-muted-foreground/70">没有找到模型</CommandEmpty>
            {Object.entries(grouped).map(([providerName, providerModels]) => (
              <CommandGroup key={providerName} heading={providerName}>
                {providerModels.map(model => (
                  <CommandItem
                    key={model.id}
                    value={`${providerName} ${model.name}`}
                    onSelect={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className="transition-colors duration-150"
                  >
                    <Check className={cn('mr-2 h-3.5 w-3.5 text-primary', value === model.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-medium text-[13px]">{model.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
