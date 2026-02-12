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
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[280px] justify-between">
          {selectedModel ? (
            <span className="truncate">
              <span className="text-muted-foreground text-xs mr-1">{selectedModel.provider_name}</span>
              {selectedModel.name}
            </span>
          ) : (
            <span className="text-muted-foreground">选择模型...</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="搜索模型..." />
          <CommandList>
            <CommandEmpty>没有找到模型</CommandEmpty>
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
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === model.id ? 'opacity-100' : 'opacity-0')} />
                    {model.name}
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
