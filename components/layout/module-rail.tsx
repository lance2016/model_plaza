'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Sparkles, Settings, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

const modules = [
  { id: 'models', href: '/chat/models', icon: MessageSquare, label: '大模型对话' },
  { id: 'agents', href: '/chat/agents', icon: Sparkles, label: '智能体对话' },
];

export function ModuleRail() {
  const pathname = usePathname();

  const activeModule = pathname?.startsWith('/chat/agents') ? 'agents' : 'models';

  return (
    <div className="w-12 flex-shrink-0 border-r border-border/50 bg-background flex flex-col items-center py-3 gap-1">
      {/* Logo */}
      <Link href="/chat/models" className="mb-3">
        <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
      </Link>

      {/* Module buttons */}
      {modules.map(mod => (
        <Link key={mod.id} href={mod.href}>
          <button
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200',
              activeModule === mod.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
            title={mod.label}
          >
            <mod.icon className="h-4.5 w-4.5" />
          </button>
        </Link>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <Link href="/settings/general">
        <button
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200',
            pathname?.startsWith('/settings')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
          title="设置"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>
      </Link>

      {/* Theme toggle */}
      <ThemeToggle />
    </div>
  );
}
