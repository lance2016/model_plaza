'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, Check, Search, Star, Sparkles, Eye, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cache, cachedFetcher } from '@/lib/cache';
import { modelsConfig } from '@/lib/swr-config';

interface Model {
  id: string;
  name: string;
  provider_name: string;
  provider_id: string;
  is_reasoning_model: number;
  supports_vision: number;
  sort_order: number;
}

interface ModelsByProvider {
  [provider: string]: Model[];
}

const RECENT_MODELS_KEY = 'recent_models';
const FAVORITE_MODELS_KEY = 'favorite_models';
const MAX_RECENT = 5;

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);

  // Fetch enabled models with cache
  const { data: models = [] } = useSWR<Model[]>(
    '/api/models?enabled=true',
    () => cachedFetcher<Model[]>('/api/models?enabled=true', cache.keys().enabledModels),
    modelsConfig
  );

  // Load recent and favorite models from localStorage
  useEffect(() => {
    try {
      const recent = localStorage.getItem(RECENT_MODELS_KEY);
      const favorites = localStorage.getItem(FAVORITE_MODELS_KEY);
      if (recent) setRecentModels(JSON.parse(recent));
      if (favorites) setFavoriteModels(JSON.parse(favorites));
    } catch (e) {
      console.error('Failed to load model preferences:', e);
    }
  }, []);

  // Group models by provider
  const modelsByProvider: ModelsByProvider = useMemo(() => {
    return models.reduce((acc, model) => {
      const providerName = model.provider_name || '其他';
      if (!acc[providerName]) {
        acc[providerName] = [];
      }
      acc[providerName].push(model);
      return acc;
    }, {} as ModelsByProvider);
  }, [models]);

  // Get provider names sorted
  const providerNames = useMemo(() => {
    return Object.keys(modelsByProvider).sort((a, b) => {
      if (a === '其他') return 1;
      if (b === '其他') return -1;
      return a.localeCompare(b, 'zh-CN');
    });
  }, [modelsByProvider]);

  // Initialize collapsed state: collapse all except the one with selected model
  useEffect(() => {
    if (value && models.length > 0) {
      const selectedModel = models.find(m => m.id === value);
      if (selectedModel) {
        const providerName = selectedModel.provider_name || '其他';
        setCollapsedProviders(new Set(
          providerNames.filter(p => p !== providerName)
        ));
      }
    }
  }, [value, models, providerNames]);

  // Filter models based on search query
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return modelsByProvider;

    const query = searchQuery.toLowerCase();
    const filtered: ModelsByProvider = {};

    Object.entries(modelsByProvider).forEach(([provider, providerModels]) => {
      const matchedModels = providerModels.filter(model =>
        model.name.toLowerCase().includes(query) ||
        provider.toLowerCase().includes(query)
      );
      if (matchedModels.length > 0) {
        filtered[provider] = matchedModels;
      }
    });

    return filtered;
  }, [modelsByProvider, searchQuery]);

  // Get recent and favorite model objects
  const recentModelObjects = useMemo(() => {
    return recentModels
      .map(id => models.find(m => m.id === id))
      .filter(Boolean) as Model[];
  }, [recentModels, models]);

  const favoriteModelObjects = useMemo(() => {
    return favoriteModels
      .map(id => models.find(m => m.id === id))
      .filter(Boolean) as Model[];
  }, [favoriteModels, models]);

  const selectedModel = models.find(m => m.id === value);

  // Update recent models when selection changes
  const handleModelSelect = (modelId: string) => {
    onChange(modelId);
    setOpen(false);

    // Update recent models
    try {
      const updated = [
        modelId,
        ...recentModels.filter(id => id !== modelId)
      ].slice(0, MAX_RECENT);
      setRecentModels(updated);
      localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent models:', e);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = favoriteModels.includes(modelId)
        ? favoriteModels.filter(id => id !== modelId)
        : [...favoriteModels, modelId];
      setFavoriteModels(updated);
      localStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  };

  // Toggle provider collapse
  const handleToggleProvider = (provider: string) => {
    setCollapsedProviders(prev => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  // Render model item
  const renderModelItem = (model: Model, showProvider = false) => {
    const isSelected = value === model.id;
    const isFavorite = favoriteModels.includes(model.id);

    return (
      <div
        key={model.id}
        onClick={() => handleModelSelect(model.id)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-accent',
          isSelected && 'bg-accent'
        )}
      >
        <Check
          className={cn(
            'h-3.5 w-3.5 text-primary flex-shrink-0',
            isSelected ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {showProvider && (
              <>
                <span className="text-xs text-muted-foreground">{model.provider_name || '其他'}</span>
                <span className="text-muted-foreground/30">·</span>
              </>
            )}
            <span className="text-sm font-medium truncate">{model.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {model.is_reasoning_model === 1 && (
            <Sparkles className="h-3 w-3 text-primary" />
          )}
          {model.supports_vision === 1 && (
            <Eye className="h-3 w-3 text-primary" />
          )}
          <button
            onClick={(e) => handleToggleFavorite(model.id, e)}
            className={cn(
              'p-0.5 rounded hover:bg-background transition-colors',
              isFavorite ? 'text-yellow-500' : 'text-muted-foreground/40 hover:text-yellow-500'
            )}
          >
            <Star className={cn('h-3 w-3', isFavorite && 'fill-current')} />
          </button>
        </div>
      </div>
    );
  };

  // Show all providers expanded when searching
  const visibleProviders = useMemo(() => {
    if (searchQuery.trim()) {
      return Object.keys(filteredProviders);
    }
    return providerNames;
  }, [searchQuery, filteredProviders, providerNames]);

  const showFavorites = favoriteModelObjects.length > 0 && !searchQuery.trim();
  const showRecent = recentModelObjects.length > 0 && !searchQuery.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="justify-between h-8 px-2.5 text-sm hover:bg-accent/50 transition-all duration-200 min-w-[200px]"
        >
          {selectedModel ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-muted-foreground text-xs">{selectedModel.provider_name || '其他'}</span>
              <span className="text-muted-foreground/30">|</span>
              <span className="font-medium text-[13px]">{selectedModel.name}</span>
              <div className="flex items-center gap-0.5">
                {selectedModel.is_reasoning_model === 1 && (
                  <Sparkles className="h-3 w-3 text-primary" />
                )}
                {selectedModel.supports_vision === 1 && (
                  <Eye className="h-3 w-3 text-primary" />
                )}
              </div>
            </span>
          ) : (
            <span className="text-muted-foreground">选择模型...</span>
          )}
          <ChevronDown className="ml-1.5 h-3 w-3 shrink-0 text-muted-foreground/40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[380px] p-0 border-border/50 bg-popover/95 backdrop-blur-md shadow-xl" 
        align="start"
      >
        {/* Search */}
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="搜索模型或 Provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm border-border/50 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <ScrollArea className="h-[480px]">
          <div className="p-2">
            {/* Favorites */}
            {showFavorites && (
              <>
                <div className="px-2 py-1.5 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                  <span className="text-xs font-semibold text-foreground">收藏模型</span>
                </div>
                <div className="space-y-0.5 mb-3">
                  {favoriteModelObjects.map(model => renderModelItem(model, true))}
                </div>
                <Separator className="my-2" />
              </>
            )}

            {/* Recent */}
            {showRecent && (
              <>
                <div className="px-2 py-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">最近使用</span>
                </div>
                <div className="space-y-0.5 mb-3">
                  {recentModelObjects.map(model => renderModelItem(model, true))}
                </div>
                <Separator className="my-2" />
              </>
            )}

            {/* All Models by Provider */}
            {!searchQuery.trim() && (
              <div className="px-2 py-1.5 mb-2">
                <span className="text-xs font-semibold text-muted-foreground">所有模型</span>
              </div>
            )}

            {visibleProviders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                没有找到匹配的模型
              </div>
            ) : (
              <div className="space-y-1">
                {visibleProviders.map(provider => {
                  const providerModels = searchQuery.trim() 
                    ? filteredProviders[provider] 
                    : modelsByProvider[provider];
                  const isCollapsed = collapsedProviders.has(provider) && !searchQuery.trim();

                  return (
                    <div key={provider}>
                      {/* Provider Header */}
                      <button
                        onClick={() => handleToggleProvider(provider)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 text-muted-foreground transition-transform',
                            !isCollapsed && 'transform rotate-90'
                          )}
                        />
                        <span className="text-sm font-semibold flex-1 text-left">{provider}</span>
                        <Badge variant="secondary" className="text-xs h-5">
                          {providerModels.length}
                        </Badge>
                      </button>

                      {/* Provider Models */}
                      {!isCollapsed && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {providerModels.map(model => renderModelItem(model, false))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
