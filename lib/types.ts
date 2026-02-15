import type { UIMessage } from 'ai';
import type { ChatConfig } from '@/components/chat/advanced-settings';

export interface Session {
  id: string;
  conversationId?: string;
  selectedModelId: string;
  reasoningEffort: string;
  chatConfig: ChatConfig;
  initialMessages?: UIMessage[];
  agentId?: string;
  agentName?: string;
  agentIcon?: string;
  agentIconColor?: string;
  agentEnabledTools?: string[];
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};
