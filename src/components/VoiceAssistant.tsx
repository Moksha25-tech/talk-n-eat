/**
 * VoiceAssistant Component for Voice Kiosk
 * Automatically detects "start recording" and "stop recording" commands
 * Uses Web Speech API for hands-free voice recognition
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceAssistantProps {
  transcript: string;
  onTranscriptChange: (transcript: string) => void;
  onVoiceCommand?: (command: string, data?: any) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  transcript,
  onTranscriptChange,
  onVoiceCommand
}) => {
  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      // Configure for continuous listening
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Handle speech recognition results
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all speech results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript.toLowerCase().trim();
          
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }
        
        const currentText = (finalTranscript || interimTranscript).toLowerCase();
        
        // Check for trigger commands
        if (currentText.includes('start recording') && !isRecording) {
          console.log('Detected: start recording');
          setIsRecording(true);
          onTranscriptChange(''); // Clear previous transcript
          return;
        }
        
        if (currentText.includes('stop recording') && isRecording) {
          console.log('Detected: stop recording');
          setIsRecording(false);
          // Process final transcript when stopping
          if (onVoiceCommand) {
            onVoiceCommand('process_transcript', transcript);
          }
          return;
        }
        
        // Check for immediate voice commands even when not recording
        if (!isRecording && onVoiceCommand) {
          if (currentText.includes('go to cart')) {
            console.log('Detected: go to cart');
            onVoiceCommand('go_to_cart');
            return;
          }
          if (currentText.includes('cancel order') || currentText.includes('clear cart')) {
            console.log('Detected: cancel order');
            onVoiceCommand('cancel_order');
            return;
          }
          if (currentText.includes('add more') || currentText.includes('back to menu')) {
            console.log('Detected: add more');
            onVoiceCommand('add_more');
            return;
          }
        }
        
        // Only update transcript when actively recording
        if (isRecording) {
          // Remove the command words from the transcript
          const cleanTranscript = (finalTranscript || interimTranscript)
            .replace(/start recording/gi, '')
            .replace(/stop recording/gi, '')
            .trim();
          
          if (cleanTranscript) {
            onTranscriptChange(cleanTranscript);
          }
        }
      };
      
      // Handle speech recognition errors - be more selective about restarting
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Only restart for certain types of errors
        if (event.error === 'not-allowed') {
          setIsSupported(false);
          setIsListening(false);
        } else if (event.error === 'no-speech' || event.error === 'audio-capture') {
          // These are normal, don't restart immediately
          console.log('Speech recognition paused due to:', event.error);
        } else if (event.error === 'aborted') {
          // Don't restart on abort - this usually means we stopped it intentionally
          console.log('Speech recognition aborted');
        }
      };
      
      // Restart recognition when it ends naturally (not on abort)
      recognition.onend = () => {
        console.log('Speech recognition ended, attempting restart...');
        if (isListening) {
          // Add a longer delay to prevent rapid restarts
          setTimeout(() => {
            try {
              if (recognitionRef.current && isListening) {
                recognition.start();
              }
            } catch (error) {
              console.error('Failed to restart recognition:', error);
              // If restart fails multiple times, wait longer
              setTimeout(() => {
                if (recognitionRef.current && isListening) {
                  try {
                    recognition.start();
                  } catch (e) {
                    console.error('Final restart attempt failed:', e);
                  }
                }
              }, 2000);
            }
          }, 500);
        }
      };
      
      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
      };
      
      recognitionRef.current = recognition;
      
      // Start listening immediately with error handling
      setIsListening(true);
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start initial recognition:', error);
        setIsSupported(false);
      }
    } else {
      setIsSupported(false);
      console.warn('Speech recognition not supported in this browser');
    }
    
    return () => {
      console.log('Cleaning up speech recognition...');
      if (recognitionRef.current) {
        setIsListening(false);
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
        recognitionRef.current = null;
      }
    };
  }, []); // Removed dependencies to prevent restart loops
  
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
            Say "start recording" to begin, "stop recording" to finish
          </p>
        </div>

        {/* Voice Status */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isRecording 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
              : isListening 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRecording 
                ? 'bg-red-500 animate-pulse' 
                : isListening 
                  ? 'bg-green-500'
                  : 'bg-muted-foreground'
            }`} />
            {isRecording ? 'Recording...' : isListening ? 'Listening for commands...' : 'Not listening'}
          </div>
        </div>

        {/* Transcript Display */}
        <div className="bg-muted p-4 rounded-lg min-h-[100px]">
          <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
          <div className="bg-background p-3 rounded border min-h-[60px]">
            {transcript ? (
              <p className="text-foreground">{transcript}</p>
            ) : (
              <p className="text-muted-foreground italic">
                {isRecording ? 'Speak your order...' : 'Say "start recording" to begin'}
              </p>
            )}
          </div>
        </div>

        {/* Voice Commands Help */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Voice Commands:</strong></p>
          <p>• "start recording" - Begin voice input</p>
          <p>• "stop recording" - End voice input</p>
          <p>• Just say item names: "Paneer Tikka", "two Masala Dosa"</p>
        </div>
      </CardContent>
    </Card>
  );
};