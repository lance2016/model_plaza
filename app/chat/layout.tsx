'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, PanelLeft } from 'lucide-react';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const handleSelectConversation = useCallback((convId: string, hasAgent: boolean) => {
    if (hasAgent) {
      router.push(`/chat?conversation=${convId}`);
    } else {
      router.push(`/chat/models?conversation=${convId}`);
    }
    setMobileMenuOpen(false);
  }, [router]);

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      {!desktopSidebarCollapsed ? (
        <div className="hidden md:flex w-64 flex-shrink-0">
          <MainSidebar
            onSelectConversation={handleSelectConversation}
            onCollapse={() => setDesktopSidebarCollapsed(true)}
          />
        </div>
      ) : (
        <div className="hidden md:flex items-start pt-3 pl-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-accent"
            onClick={() => setDesktopSidebarCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 md:hidden h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MainSidebar onSelectConversation={handleSelectConversation} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
