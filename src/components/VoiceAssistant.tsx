/**
 * VoiceAssistant Component for Voice Kiosk
 * Handles real speech-to-text input, transcript display, and voice commands
 * Uses Web Speech API for actual voice recognition
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { VoiceState } from '../types';

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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
  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  /**
   * Initialize speech recognition on component mount
   * Sets up continuous listening and interim results
   */
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      // Configure speech recognition settings
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Handle speech recognition results
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all speech results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update transcript with current speech
        const fullTranscript = finalTranscript || interimTranscript;
        onTranscriptChange(fullTranscript);
      };
      
      // Handle speech recognition errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
      
      // Handle speech recognition end
      recognition.onend = () => {
        // Auto-restart if still in listening mode
        if (voiceState === 'listening') {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
            }
          }, 100);
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [voiceState]);
  
  /**
   * Start or stop speech recognition based on voice state
   */
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    if (voiceState === 'listening') {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    } else {
      recognitionRef.current.stop();
    }
  }, [voiceState]);
  
  // Show unsupported message if speech recognition is not available
  if (!isSupported) {
    return (
      <Card className="h-full bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Voice Ordering Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground">
              Speech recognition is not supported in this browser. 
              Please use Chrome or Edge for voice functionality.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Voice Ordering Assistant</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {voiceState === 'idle' ? "Click microphone and speak your order" : "Listening for your order..."}
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
            {transcript ? (
              <p className="text-foreground">{transcript}</p>
            ) : (
              <p className="text-muted-foreground italic">
                {voiceState === 'listening' ? 'Listening...' : 'Waiting for voice input...'}
              </p>
            )}
          </div>
        </div>

        {/* Voice Commands Help */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Voice Commands:</strong></p>
          <p>• Just say item names: "Paneer Tikka", "two Masala Dosa"</p>
          <p>• "Go to cart" - View your order</p>
          <p>• "Menu" - Return to menu</p>
        </div>
      </CardContent>
    </Card>
  );
};