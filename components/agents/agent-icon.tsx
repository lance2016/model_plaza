'use client';

import type { LucideProps } from 'lucide-react';
import {
  Bot, Languages, Code, PenTool, BarChart3, GraduationCap,
  FileText, MessageCircle, Lightbulb, Sparkles, Brain, Music,
  Camera, Heart, Palette, Rocket, Shield, Zap, Globe, BookOpen,
  Calculator, Microscope, Briefcase, Coffee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'bot': Bot,
  'languages': Languages,
  'code': Code,
  'pen-tool': PenTool,
  'bar-chart-3': BarChart3,
  'graduation-cap': GraduationCap,
  'file-text': FileText,
  'message-circle': MessageCircle,
  'lightbulb': Lightbulb,
  'sparkles': Sparkles,
  'brain': Brain,
  'music': Music,
  'camera': Camera,
  'heart': Heart,
  'palette': Palette,
  'rocket': Rocket,
  'shield': Shield,
  'zap': Zap,
  'globe': Globe,
  'book-open': BookOpen,
  'calculator': Calculator,
  'microscope': Microscope,
  'briefcase': Briefcase,
  'coffee': Coffee,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const ICON_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316',
];

interface AgentIconProps {
  icon: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AgentIcon({ icon, color = '#3b82f6', size = 'md', className }: AgentIconProps) {
  const IconComponent = ICON_MAP[icon] || Bot;

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  return (
    <div
      className={cn('rounded-xl flex items-center justify-center flex-shrink-0', sizeClasses[size], className)}
      style={{ backgroundColor: `${color}20` }}
    >
      <IconComponent className={iconSizeClasses[size]} style={{ color }} />
    </div>
  );
}
