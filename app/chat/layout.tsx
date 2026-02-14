'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const handleSelectConversation = useCallback((convId: string) => {
    router.push(`/chat?conversation=${convId}`);
    setMobileMenuOpen(false);
  }, [router]);

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar - now always shown but can be collapsed */}
      {!desktopSidebarCollapsed && (
        <div className="hidden md:flex">
          <MainSidebar onSelectConversation={handleSelectConversation} />
        </div>
      )}

      {/* Collapse/Expand button for desktop */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex fixed top-3 left-3 z-50 h-8 w-8"
        onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
      >
        {desktopSidebarCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 md:hidden h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MainSidebar onSelectConversation={handleSelectConversation} />
        </SheetContent>
      </Sheet>

      {/* Page content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
