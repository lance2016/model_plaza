'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/chat/models">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200">
                <ArrowLeft className="h-4 w-4" />
                返回对话
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
              <p className="text-sm text-muted-foreground mt-1">
                配置系统参数和对话行为
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {children}
      </div>
    </div>
  );
}
