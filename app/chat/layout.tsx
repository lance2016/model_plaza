'use client';

import { ModuleRail } from '@/components/layout/module-rail';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Left rail - always visible on desktop */}
      <div className="hidden md:flex">
        <ModuleRail />
      </div>

      {/* Page content (sidebar + main managed by each page) */}
      {children}
    </div>
  );
}
