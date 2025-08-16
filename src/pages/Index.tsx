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

  // Process transcript when it changes (for automatic processing)
  const handleTranscriptChange = (newTranscript: string) => {
    setTranscript(newTranscript);

    // Auto-process if transcript has content and ends with a pause
    if (newTranscript.trim()) {
      const timeoutId = setTimeout(() => {
        processTranscript(newTranscript);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  };

  const processTranscript = (transcriptToProcess?: unknown) => {
    const textToProcess = transcriptToProcess || transcript;
    const result = parseVoiceTranscript(textToProcess, mockFoodItems);
    const newCartItems = [...cartItems];

    // Process add items
    result.addItems.forEach(({ item, quantity }) => {
      const existingIndex = newCartItems.findIndex(cartItem => cartItem.id === item.id);
      if (existingIndex >= 0) {
        newCartItems[existingIndex].quantity += quantity;
      } else {
        newCartItems.push({ ...item, quantity });
      }
    });

    // Process remove items
    result.removeItems.forEach(({ item, quantity }) => {
      const existingIndex = newCartItems.findIndex(cartItem => cartItem.id === item.id);
      if (existingIndex >= 0) {
        newCartItems[existingIndex].quantity = Math.max(0, newCartItems[existingIndex].quantity - quantity);
        if (newCartItems[existingIndex].quantity === 0) {
          newCartItems.splice(existingIndex, 1);
        }
      }
    });

    // Process commands
    if (result.commands.goToCart) {
      setCurrentView('cart');
    }
    if (result.commands.cancelOrder) {
      setCartItems([]);
    }
    if (result.commands.addMore) {
      setCurrentView('menu');
    }

    setCartItems(newCartItems);
    setTranscript('');
  };

  const handleVoiceCommand = (command: string, data?: unknown) => {
    switch (command) {
      case 'process_transcript':
        processTranscript(data);
        break;
      case 'goToCart':
        setCurrentView('cart');
        break;
      case 'cancelOrder':
        setCartItems([]);
        break;
      case 'addMore':
        setCurrentView('menu');
        break;
      default:
        break;
    }
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
                  menuItems={mockFoodItems}
                  onCartUpdate={setCartItems}
                  backendUrl="http://localhost:3001/api"   // <-- ✅ added backend URL
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
