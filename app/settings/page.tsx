'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from '@/components/settings/general-settings';
import { ModelsManagement } from '@/components/settings/models-management';
import { AgentsManagement } from '@/components/settings/agents-management';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="general">通用设置</TabsTrigger>
        <TabsTrigger value="models">大模型管理</TabsTrigger>
        <TabsTrigger value="agents">智能体管理</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-6">
        <GeneralSettings />
      </TabsContent>

      <TabsContent value="models" className="space-y-6">
        <ModelsManagement />
      </TabsContent>

      <TabsContent value="agents" className="space-y-6">
        <AgentsManagement />
      </TabsContent>
    </Tabs>
  );
}
