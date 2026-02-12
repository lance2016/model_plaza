'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回对话
            </Button>
          </Link>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          <Link href="/settings/providers">
            <button className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              pathname === '/settings/providers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
              Provider
            </button>
          </Link>
          <Link href="/settings/models">
            <button className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              pathname === '/settings/models'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
