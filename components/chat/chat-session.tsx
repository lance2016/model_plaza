'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { mutate as globalMutate } from 'swr';
import { MessageList } from '@/components/chat/message-list';
import { ChatPanel, type ImageAttachment } from '@/components/chat/chat-panel';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChatConfig } from '@/components/chat/advanced-settings';
import type { ReadingWidth } from '@/components/chat/reading-width-selector';

interface ChatSessionProps {
  sessionId: string;
  initialConversationId?: string;
  initialMessages?: UIMessage[];
  selectedModelId: string;
  reasoningEffort: string;
  chatConfig: ChatConfig;
  readingWidth: ReadingWidth;
  isActive: boolean;
  isReasoningModel: boolean;
  reasoningType?: string;
  supportsVision: boolean;
  agentId?: string;
  agentName?: string;
  agentIcon?: string;
  agentIconColor?: string;
  agentEnabledTools?: string[]; // Tools enabled by agent
  onConversationCreated: (sessionId: string, conversationId: string) => void;
  onStatusChange: (sessionId: string, status: string) => void;
  onReasoningEffortChange: (effort: string) => void;
}

export function ChatSession({
  sessionId,
  initialConversationId,
  initialMessages,
  selectedModelId,
  reasoningEffort,
  chatConfig,
  readingWidth,
  isActive,
  isReasoningModel,
  reasoningType,
  supportsVision,
  agentId,
  agentName,
  agentIcon,
  agentIconColor,
  agentEnabledTools = [],
  onConversationCreated,
  onStatusChange,
  onReasoningEffortChange,
}: ChatSessionProps) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  
  // User location
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; city?: string; country?: string } | null>(null);
  
  // Time injection setting
  const timeEnabledRef = useRef<boolean>(true);
  
  // Load time injection setting
  useEffect(() => {
    const stored = localStorage.getItem('time_injection_enabled');
    const enabled = stored === null ? true : stored === 'true';
    timeEnabledRef.current = enabled;
  }, []);
  
  // Load location from localStorage or request permission
  useEffect(() => {
    const loadLocation = async () => {
      // Check if location sharing is enabled
      const locationEnabled = localStorage.getItem('location_sharing_enabled');
      if (locationEnabled === 'false') return;
      
      // Try to load cached location
      const cached = localStorage.getItem('user_location');
      if (cached) {
        try {
          const loc = JSON.parse(cached);
          // Check if cache is less than 1 hour old
          if (loc.timestamp && Date.now() - loc.timestamp < 3600000) {
            setUserLocation(loc);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached location:', e);
        }
      }
      
      // Request new location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc: {
              latitude: number;
              longitude: number;
              timestamp: number;
              city?: string;
              country?: string;
            } = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now(),
            };
            
            // Try to reverse geocode to get city/country
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${loc.latitude}&lon=${loc.longitude}&format=json&accept-language=zh-CN`
              );
              if (res.ok) {
                const data = await res.json();
                loc.city = data.address?.city || data.address?.town || data.address?.village;
                loc.country = data.address?.country;
              }
            } catch (e) {
              console.error('Failed to reverse geocode:', e);
            }
            
            setUserLocation(loc);
            localStorage.setItem('user_location', JSON.stringify(loc));
            localStorage.setItem('location_sharing_enabled', 'true');
          },
          (error) => {
            console.log('Location permission denied or unavailable:', error);
            localStorage.setItem('location_sharing_enabled', 'false');
          },
          { timeout: 5000 }
        );
      }
    };
    
    loadLocation();
  }, []);
  
  // User tool preferences - load from localStorage, default to agent config
  const [userEnabledTools, setUserEnabledTools] = useState<string[]>(() => {
    if (typeof window === 'undefined') return agentEnabledTools;
    try {
      const saved = localStorage.getItem('user_tool_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        // Filter by agent's enabled tools
        return agentEnabledTools.filter(tool => prefs[tool] !== false);
      }
    } catch (e) {
      console.error('Failed to load tool preferences:', e);
    }
    return agentEnabledTools;
  });

  // Refs for latest values to avoid stale closures
  const selectedModelIdRef = useRef(selectedModelId);
  const reasoningEffortRef = useRef(reasoningEffort);
  const chatConfigRef = useRef(chatConfig);
  const conversationIdRef = useRef(conversationId);
  const onConversationCreatedRef = useRef(onConversationCreated);
  selectedModelIdRef.current = selectedModelId;
  reasoningEffortRef.current = reasoningEffort;
  chatConfigRef.current = chatConfig;
  conversationIdRef.current = conversationId;
  onConversationCreatedRef.current = onConversationCreated;

  const agentIdRef = useRef(agentId);
  agentIdRef.current = agentId;
  
  const userEnabledToolsRef = useRef(userEnabledTools);
  userEnabledToolsRef.current = userEnabledTools;
  
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;
  
  // Save tool preferences to localStorage
  const handleToggleTool = useCallback((toolName: string) => {
    setUserEnabledTools(prev => {
      const newTools = prev.includes(toolName)
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName];
      
      // Save to localStorage
      try {
        const saved = localStorage.getItem('user_tool_preferences');
        const prefs = saved ? JSON.parse(saved) : {};
        prefs[toolName] = newTools.includes(toolName);
        localStorage.setItem('user_tool_preferences', JSON.stringify(prefs));
      } catch (e) {
        console.error('Failed to save tool preferences:', e);
      }
      
      return newTools;
    });
  }, []);

  const [transport] = useState(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      modelId: selectedModelIdRef.current,
      reasoningEffort: reasoningEffortRef.current,
      chatConfig: chatConfigRef.current,
      agentId: agentIdRef.current,
      enabledTools: userEnabledToolsRef.current,
      userLocation: userLocationRef.current,
      timeEnabled: timeEnabledRef.current,
    }),
  }));

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    messages: initialMessages,
    onFinish: async ({ messages: updatedMessages, isAbort }) => {
      if (isAbort) return;
      const convId = conversationIdRef.current;
      if (!convId) return;
      try {
        await fetch(`/api/conversations/${encodeURIComponent(convId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: JSON.stringify(updatedMessages),
            model_id: selectedModelIdRef.current,
          }),
        });
        globalMutate('/api/conversations');
      } catch (e) {
        console.error('Failed to save conversation:', e);
      }
    },
  });

  // Notify parent of status changes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      onStatusChange(sessionId, status);
    }
  }, [status, sessionId, onStatusChange]);

  const handleRegenerate = useCallback(() => {
    if (messages.length < 2) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage && lastUserMessage.parts) {
      const textPart = lastUserMessage.parts.find(p => p.type === 'text');
      if (textPart && 'text' in textPart) {
        sendMessage({ text: textPart.text });
      }
    }
  }, [messages, sendMessage]);

  const handleSubmit = useCallback(async () => {
    if ((!input.trim() && images.length === 0) || !selectedModelIdRef.current) return;
    if (status === 'submitted' || status === 'streaming') return;

    const text = input;
    const imagesCopy = [...images];
    setInput('');
    setImages([]); // Clear images after submit

    if (!conversationIdRef.current) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: selectedModelIdRef.current,
            title: text.slice(0, 50) || '图片对话',
            ...(agentId ? { agent_id: agentId } : {}),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.id);
          conversationIdRef.current = data.id;
          onConversationCreatedRef.current(sessionId, data.id);
          globalMutate('/api/conversations');
        }
      } catch (e) {
        console.error('Failed to create conversation:', e);
      }
    }

    // Send message with files
    if (imagesCopy.length > 0) {
      sendMessage({
        text,
        files: imagesCopy.map(img => ({
          type: 'file' as const,
          url: img.url,
          mediaType: img.mimeType,
        })),
      });
    } else {
      sendMessage({ text });
    }
  }, [input, images, status, sendMessage, sessionId, agentId]);

  // Log for debugging
  useEffect(() => {
    console.log(`[ChatSession ${sessionId}] isActive:`, isActive, 'status:', status, 'messages:', messages.length);
  }, [isActive, status, messages.length, sessionId]);

  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden absolute inset-0"
      style={{
        zIndex: isActive ? 1 : 0,
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-in-out',
      }}
    >
      {error && (
        <Alert variant="destructive" className="m-4 mb-0 border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} status={status} onRegenerate={handleRegenerate} readingWidth={readingWidth} agentName={agentName} agentIcon={agentIcon} agentIconColor={agentIconColor} />
      </div>

      <ChatPanel
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        status={status}
        disabled={!selectedModelIdRef.current}
        readingWidth={readingWidth}
        isReasoningModel={isReasoningModel}
        reasoningEffort={reasoningEffort}
        reasoningType={reasoningType}
        onReasoningEffortChange={onReasoningEffortChange}
        images={images}
        onImagesChange={setImages}
        supportsVision={supportsVision}
        agentEnabledTools={agentEnabledTools}
        userEnabledTools={userEnabledTools}
        onToggleTool={handleToggleTool}
      />
    </div>
  );
}
