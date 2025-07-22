/**
 * Sidebar Component for Voice Kiosk
 * Vertical navigation with icon-only buttons
 * Contains Home, Mic, and Cart navigation icons
 */

import React from 'react';
import { Home, Mic, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { ViewState, VoiceState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  voiceState: VoiceState;
  onViewChange: (view: ViewState) => void;
  onVoiceToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  voiceState,
  onViewChange,
  onVoiceToggle
}) => {
  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border flex flex-col items-center py-4 space-y-4 z-10">
      {/* Home Navigation Icon */}
      <Button
        variant={currentView === 'menu' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onViewChange('menu')}
        className="w-12 h-12"
        title="Go to Menu"
      >
        <Home className="h-6 w-6" />
      </Button>

      {/* Voice/Microphone Toggle Icon */}
      <Button
        variant={voiceState === 'listening' ? 'destructive' : 'secondary'}
        size="icon"
        onClick={onVoiceToggle}
        className="w-12 h-12"
        title={voiceState === 'listening' ? 'Stop Recording' : 'Start Voice Recording'}
      >
        <Mic className={`h-6 w-6 ${voiceState === 'listening' ? 'animate-pulse' : ''}`} />
      </Button>

      {/* Cart Navigation Icon */}
      <Button
        variant={currentView === 'cart' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onViewChange('cart')}
        className="w-12 h-12"
        title="Go to Cart"
      >
        <ShoppingCart className="h-6 w-6" />
      </Button>
    </div>
  );
};