'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200">
              <ArrowLeft className="h-4 w-4" />
              返回对话
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex gap-1 mb-8 border-b border-border/50 pb-px">
          <Link href="/settings/general">
            <button className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 rounded-t-md',
              pathname === '/settings/general'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}>
              通用
            </button>
          </Link>
          <Link href="/settings/providers">
            <button className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 rounded-t-md',
              pathname === '/settings/providers'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}>
              Provider
            </button>
          </Link>
          <Link href="/settings/models">
            <button className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 rounded-t-md',
              pathname === '/settings/models'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}>
              模型
            </button>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
