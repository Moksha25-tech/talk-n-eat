import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar } from '../components/Sidebar';
import { MenuGrid } from '../components/MenuGrid';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { Cart } from '../components/Cart';
import { mockFoodItems, categories, parseVoiceTranscript } from '../data/mockData';
import { CartItem, ViewState, VoiceState } from '../types';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewState>('menu');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      setVoiceState('processing');
      processTranscript();
      setTimeout(() => setVoiceState('idle'), 1000);
    } else {
      setVoiceState('listening');
    }
  };

  const processTranscript = () => {
    const foundItems = parseVoiceTranscript(transcript, mockFoodItems);
    const newCartItems = [...cartItems];
    
    foundItems.forEach(({ item, quantity }) => {
      const existingIndex = newCartItems.findIndex(cartItem => cartItem.id === item.id);
      if (existingIndex >= 0) {
        newCartItems[existingIndex].quantity += quantity;
      } else {
        newCartItems.push({ ...item, quantity });
      }
    });
    
    setCartItems(newCartItems);
    setTranscript('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        currentView={currentView}
        voiceState={voiceState}
        onViewChange={setCurrentView}
        onVoiceToggle={handleVoiceToggle}
      />
      
      <div className="ml-16 p-4">
        <div className="mb-4">
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {currentView === 'menu' ? (
              <MenuGrid foodItems={mockFoodItems} />
            ) : (
              <Cart 
                cartItems={cartItems}
                onResetOrder={() => setCartItems([])}
                onAddItems={() => setCurrentView('menu')}
              />
            )}
          </div>
          
          <div className="space-y-4">
            <VoiceAssistant
              voiceState={voiceState}
              transcript={transcript}
              onVoiceToggle={handleVoiceToggle}
              onTranscriptChange={setTranscript}
            />
            
            {currentView === 'menu' && (
              <Cart 
                cartItems={cartItems}
                onResetOrder={() => setCartItems([])}
                onAddItems={() => setCurrentView('menu')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
