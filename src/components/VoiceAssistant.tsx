/**
 * VoiceAssistant Component for Voice Kiosk
 * Handles voice input simulation, transcript display, and voice commands
 * Provides microphone button and real-time transcript feedback
 */

import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { VoiceState } from '../types';

interface VoiceAssistantProps {
  voiceState: VoiceState;
  transcript: string;
  onVoiceToggle: () => void;
  onTranscriptChange: (transcript: string) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  voiceState,
  transcript,
  onVoiceToggle,
  onTranscriptChange
}) => {
  // Simulated voice transcript for demo purposes
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  
  // Demo phrases that will be "heard" when recording starts
  const demoTranscripts = [
    "I want one Paneer Tikka",
    "Add two Masala Dosa to my order",
    "I'll have Butter Chicken and Veg Biryani",
    "Give me three Samosa please",
    "I want Chole Bhature and Mango Lassi"
  ];

  /**
   * Simulates voice input by gradually typing out a demo transcript
   * This mimics real-time speech-to-text conversion
   */
  useEffect(() => {
    if (voiceState === 'listening') {
      // Select random demo transcript
      const randomTranscript = demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)];
      let currentIndex = 0;
      setSimulatedTranscript('');

      // Simulate typing effect for voice transcript
      const typingInterval = setInterval(() => {
        if (currentIndex < randomTranscript.length) {
          const newTranscript = randomTranscript.substring(0, currentIndex + 1);
          setSimulatedTranscript(newTranscript);
          onTranscriptChange(newTranscript);
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 100); // Type one character every 100ms

      return () => clearInterval(typingInterval);
    } else {
      // Clear transcript when not listening
      setSimulatedTranscript('');
    }
  }, [voiceState, onTranscriptChange]);

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Voice Ordering Assistant</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {voiceState === 'idle' ? "Say 'Hey/Hello/Hi' to begin" : "Listening for your order..."}
          </p>
          
          {/* Microphone Button */}
          <Button
            onClick={onVoiceToggle}
            size="lg"
            variant={voiceState === 'listening' ? 'destructive' : 'default'}
            className="w-16 h-16 rounded-full mb-4"
          >
            {voiceState === 'listening' ? (
              <MicOff className="h-8 w-8 animate-pulse" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </div>

        {/* Voice Status */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Status: {voiceState === 'listening' ? 'Recording...' : 'Ready to listen'}
          </p>
        </div>

        {/* Transcript Display */}
        <div className="bg-muted p-4 rounded-lg min-h-[100px]">
          <p className="text-sm text-muted-foreground mb-2">Heard:</p>
          <div className="bg-background p-3 rounded border min-h-[60px]">
            {voiceState === 'listening' && simulatedTranscript ? (
              <p className="text-foreground">{simulatedTranscript}</p>
            ) : voiceState === 'idle' ? (
              <p className="text-muted-foreground italic">Waiting for voice input...</p>
            ) : (
              <p className="text-foreground">{transcript || 'Processing...'}</p>
            )}
          </div>
        </div>

        {/* Voice Commands Help */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Voice Commands:</strong></p>
          <p>• "I want [item name]" - Add items to cart</p>
          <p>• "Go to cart" - View your order</p>
          <p>• "Delete" - Clear transcript</p>
          <p>• "Menu" - Return to menu</p>
        </div>
      </CardContent>
    </Card>
  );
};