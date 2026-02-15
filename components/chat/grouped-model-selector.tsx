'use client';

import useSWR from 'swr';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider_name: string;  // From JOIN with providers table
  is_reasoning_model: number;
  supports_vision: number;
}

interface ModelsByProvider {
  [provider: string]: Model[];
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  // Only fetch enabled models from enabled providers
  const { data: models = [] } = useSWR<Model[]>('/api/models?enabled=true', fetcher);

  // Group models by provider, handle undefined providers
  const modelsByProvider: ModelsByProvider = models.reduce((acc, model) => {
    // Use provider_name from database JOIN
    const providerName = model.provider_name || '其他';
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(model);
    return acc;
  }, {} as ModelsByProvider);

  // Sort providers alphabetically, but put '其他' at the end
  const providers = Object.keys(modelsByProvider).sort((a, b) => {
    if (a === '其他') return 1;
    if (b === '其他') return -1;
    return a.localeCompare(b, 'zh-CN');
  });

  const selectedModel = models.find(m => m.id === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="选择模型">
          {selectedModel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedModel.provider_name || '其他'}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="truncate">{selectedModel.name}</span>
              <div className="flex items-center gap-1">
                {selectedModel.is_reasoning_model === 1 && (
                  <Sparkles className="h-3 w-3 text-primary" />
                )}
                {selectedModel.supports_vision === 1 && (
                  <Eye className="h-3 w-3 text-primary" />
                )}
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {providers.map(provider => (
          <SelectGroup key={provider}>
            <SelectLabel className="flex items-center gap-2 py-2">
              <span className="font-semibold">{provider}</span>
              <Badge variant="secondary" className="text-xs">
                {modelsByProvider[provider].length}
              </Badge>
            </SelectLabel>
            {modelsByProvider[provider].map(model => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{model.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {model.is_reasoning_model === 1 && (
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                    )}
                    {model.supports_vision === 1 && (
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
