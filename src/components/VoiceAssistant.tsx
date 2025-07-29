import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw } from 'lucide-react';

import { Cart } from './Cart'; // Import CartProps interface
import { MenuGrid } from './MenuGrid'; // Import MenuGridProps interface

import { CartItem, FoodItem, ViewState } from '../types';


//Defines all possible voice command actions.
// Each action may have additional data (e.g. ADD_ITEM needs item name & quantity).
// UNKNOWN handles unrecognized commands.
type CommandAction =
    | { type: 'ADD_ITEM'; item: string; quantity: number }
    | { type: 'REMOVE_ITEM'; item: string }
    | { type: 'RESET_CART' }
    | { type: 'VIEW_CART' }
    | { type: 'BACK_TO_MENU' }
    | { type: 'START_RECORDING' }
    | { type: 'STOP_RECORDING' }
    | { type: 'UNKNOWN' };

/*Why use this?*/
// Props interface for VoiceAssistant
interface VoiceAssistantProps {
    menuItems: FoodItem[]; // Menu items passed as props
}

/**
 * Parse the transcript to identify and execute commands
 */
const parseCommand = (transcript: string): CommandAction => {
    const normalizedText = transcript.toLowerCase().trim();

    // Check for recording control commands
    if (normalizedText.includes('start recording')) {
        return { type: 'START_RECORDING' };
    }

    if (normalizedText.includes('stop recording')) {
        return { type: 'STOP_RECORDING' };
    }

    // Check for view navigation commands
    if (normalizedText.includes('go to cart')) {
        return { type: 'VIEW_CART' };
    }

    if (normalizedText.includes('add more') || normalizedText.includes('back to menu')) {
        return { type: 'BACK_TO_MENU' };
    }

    // Check for cart management commands
    if (normalizedText.includes('reset') || normalizedText.includes('clear cart')) {
        return { type: 'RESET_CART' };
    }

    // Check for remove item command
    const removeMatch = normalizedText.match(/remove\s+(.+)/);
    if (removeMatch) {
        const itemName = removeMatch[1].trim();
        return { type: 'REMOVE_ITEM', item: itemName };
    }

    // Check for add item command (format: "<quantity> <item>")
    const addItemMatch = normalizedText.match(/(\d+)\s+(.+)/);
    if (addItemMatch) {
        const quantity = parseInt(addItemMatch[1], 10);
        const itemName = addItemMatch[2].trim();
        return { type: 'ADD_ITEM', item: itemName, quantity };
    }

    return { type: 'UNKNOWN' };
};


/**
 * Find a menu item by name (partial match)
 */
const findMenuItem = (itemName: string, menuItems: FoodItem[]): FoodItem | undefined => {
    return menuItems.find(item =>
        item.name.toLowerCase().includes(itemName.toLowerCase())
    );
};

/**
 * VoiceAssistant component for kiosk ordering interface
 */
export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ menuItems = [] }) => {
    // State for cart items
    const [cart, setCart] = useState<CartItem[]>([]);

    // State for current view (menu or cart)
    const [currentView, setCurrentView] = useState<ViewState>('menu');

    // State for transcript
    const [transcript, setTranscript] = useState('');

    // State for whether we're actively listening for commands
    const [isListening, setIsListening] = useState(false);

    // State for status messages
    const [statusMessage, setStatusMessage] = useState('Say "start recording" to begin');

    // Reference to store the previous transcript to avoid duplicate processing
    const lastProcessedTranscriptRef = useRef('');

    // Use the react-speech-recognition hook
    const {
        transcript: speechTranscript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition({
        continuous: true,
        language: 'en-US'
    });

    // Update the transcript when speech is recognized
    useEffect(() => {
        if (speechTranscript) {
            setTranscript(speechTranscript);
        }
    }, [speechTranscript]);

    // Process commands when we have a final transcript
    useEffect(() => {
        if (!isListening || !transcript) return;

        // Avoid processing the same transcript multiple times
        if (transcript === lastProcessedTranscriptRef.current) return;
        lastProcessedTranscriptRef.current = transcript;

        // Parse the command from the transcript
        const command = parseCommand(transcript);

        // Handle the command
        switch (command.type) {
            case 'START_RECORDING':
                setIsListening(true);
                setStatusMessage('Listening for commands...');
                break;

            case 'STOP_RECORDING':
                setIsListening(false);
                setStatusMessage('Recording stopped. Say "start recording" to begin again.');
                break;

            case 'ADD_ITEM': {
                const menuItem = findMenuItem(command.item, menuItems);
                if (menuItem) {
                    setCart(prevCart => {
                        const existingItemIndex = prevCart.findIndex(item => item.id === menuItem.id);

                        if (existingItemIndex >= 0) {
                            // Update quantity if item already exists in cart
                            const updatedCart = [...prevCart];
                            const existingItem = updatedCart[existingItemIndex];
                            const updatedItem: CartItem = {
                                ...existingItem,
                                quantity: existingItem.quantity + command.quantity
                            };

                            updatedCart[existingItemIndex] = updatedItem;
                            return updatedCart;
                        } else {
                            const newItem: CartItem = {
                                ...menuItem,
                                quantity: command.quantity
                            };
                            return [...prevCart, newItem];
                        }
                    });
                    setStatusMessage(`Added ${command.quantity} ${menuItem.name}(s) to cart.`);
                }
                else {
                    setStatusMessage(`Item "${command.item}" not found in menu.`);
                }
                break;
            }

            case 'REMOVE_ITEM': {
                const menuItem = findMenuItem(command.item, menuItems);
                if (menuItem) {
                    setCart(prevCart => prevCart.filter(item => item.id !== menuItem.id));
                    setStatusMessage(`Removed ${menuItem.name} from cart.`);
                } else {
                    setStatusMessage(`Item "${command.item}" not found in cart.`);
                }
                break;
            }

            case 'RESET_CART':
                setCart([]);
                setStatusMessage('Cart has been cleared.');
                break;

            case 'VIEW_CART':
                setCurrentView('cart');
                setStatusMessage('Viewing cart. Say "add more" to return to menu.');
                break;

            case 'BACK_TO_MENU':
                setCurrentView('menu');
                setStatusMessage('Back to menu. Say "go to cart" to view your order.');
                break;

            case 'UNKNOWN':
                setStatusMessage('Command not recognized. Please try again.');
                break;

        }

        // Reset transcript after processing
        setTimeout(() => {
            resetTranscript();
            setTranscript('');
            lastProcessedTranscriptRef.current = '';
        }, 1000);

    }, [transcript, isListening, resetTranscript, menuItems]);

    // Start/stop listening based on isListening state
    useEffect(() => {
        if (isListening) {
            SpeechRecognition.startListening();
        } else {
            SpeechRecognition.stopListening();
        }
    }, [isListening]);

    // Auto-restart speech recognition if it stops unexpectedly
    useEffect(() => {
        if (isListening && !listening) {
            const timeoutId = setTimeout(() => {
                SpeechRecognition.startListening();
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [listening, isListening]);

    // Handle manual start/stop of recording
    const toggleRecording = () => {
        if (isListening) {
            setIsListening(false);
            setStatusMessage('Recording stopped.');
        } else {
            setIsListening(true);
            setStatusMessage('Listening for commands...');
            resetTranscript();
            setTranscript('');
            lastProcessedTranscriptRef.current = '';
        }
    };

    // Handle reset order from Cart component
    const handleResetOrder = () => {
        setCart([]);
        setStatusMessage('Order has been reset.');
    };

    // Handle add more items from Cart component
    const handleAddItems = () => {
        setCurrentView('menu');
        setStatusMessage('Back to menu. Say "go to cart" to view your order.');
    };

    // Handle item click from MenuGrid (for accessibility/touch)
    // Handle item click from MenuGrid (for accessibility/touch)
    const handleItemClick = (item: FoodItem) => {
        // FIXED: Use the same immutable pattern as the voice command handler
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);

            if (existingItemIndex >= 0) {
                // FIXED: Create a new array and update the specific item immutably
                const updatedCart = [...prevCart];
                const existingItem = updatedCart[existingItemIndex];

                // FIXED: Create a new object with updated quantity instead of mutating
                const updatedItem: CartItem = {
                    ...existingItem,
                    quantity: existingItem.quantity + 1
                };

                updatedCart[existingItemIndex] = updatedItem;
                return updatedCart;
            } else {
                // FIXED: Create a new CartItem with all properties from FoodItem
                const newItem: CartItem = {
                    ...item, // Spread all FoodItem properties (including category)
                    quantity: 1
                };
                return [...prevCart, newItem];
            }
        });
        setStatusMessage(`Added ${item.name} to cart.`);
    };

    const [browserSupported, setBrowserSupported] = useState(true);

    // Auto-restart speech recognition if it stops unexpectedly
    useEffect(() => {
        if (browserSupportsSpeechRecognition && !listening) {
            const timeoutId = setTimeout(() => {
                try {
                    // FIXED: Added error handling for restarting speech recognition
                    SpeechRecognition.startListening({ continuous: true });
                } catch (error) {
                    console.error('Error restarting speech recognition:', error);
                }
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [listening, browserSupportsSpeechRecognition]);

    // If browser doesn't support speech recognition
    useEffect(() => {
        // FIXED: Check if browser supports speech recognition before trying to use it
        if (!browserSupportsSpeechRecognition) {
            setBrowserSupported(false);
            return;
        }

        // Start passive listening
        try {
            SpeechRecognition.startListening({ continuous: true });
            setPassiveListening(true);
            setStatusMessage('Passive listening active. Say "start recording" to begin ordering.');
        } catch (error) {
            // FIXED: Added error handling for speech recognition initialization
            console.error('Error starting speech recognition:', error);
            setStatusMessage('Error initializing speech recognition. Please refresh the page.');
        }
        return () => {
            if (browserSupportsSpeechRecognition) {
                try {
                    // FIXED: Added error handling for stopping speech recognition
                    SpeechRecognition.stopListening();
                } catch (error) {
                    console.error('Error stopping speech recognition:', error);
                }
            }
        };
    }, [browserSupportsSpeechRecognition]);

    // FIXED: Use the browserSupported state instead of directly checking browserSupportsSpeechRecognition
    if (!browserSupported) {
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
        <div className="h-full flex flex-col space-y-6">
            {/* Voice Control Panel */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">
                        Voice Ordering Assistant - {currentView === 'menu' ? 'Menu' : 'Cart'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status indicator */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm text-muted-foreground">
                {isListening ? 'Listening...' : 'Not listening'}
              </span>
                        </div>
                        <Button
                            onClick={toggleRecording}
                            variant={isListening ? "destructive" : "default"}
                            size="sm"
                        >
                            {isListening ? (
                                <>
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Stop Recording
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Start Recording
                                </>
                            )}
                        </Button>
                    </div>
                    {/* Status message */}
                    <div className="bg-muted p-3 rounded">
                        <p className="text-sm text-foreground">{statusMessage}</p>
                    </div>

                    {/* Transcript display */}
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Heard:</p>
                        <div className="bg-background p-3 rounded border min-h-[60px] text-foreground">
                            {transcript || (
                                <p className="text-muted-foreground italic">
                                    {isListening ? 'Listening...' : 'Say "start recording" to begin'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Help text for available commands */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Voice Commands:</strong></p>
                        <p>• "Start recording" / "Stop recording" – Control recording</p>
                        <p>• "[quantity] [item name]" – Add item to cart (e.g., "2 masala dosa")</p>
                        <p>• "Remove [item name]" – Remove item from cart</p>
                        <p>• "Reset" – Clear all items from cart</p>
                        <p>• "Go to cart" – View your cart</p>
                        <p>• "Add more" – Return to menu</p>
                    </div>
                </CardContent>
            </Card>
            {/* Main content area - switches between menu and cart view */}
            {currentView === 'menu' ? (
                <Card className="flex-grow bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-foreground">Menu Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MenuGrid
                            foodItems={menuItems} // Menu items passed as prop
                            onItemClick={handleItemClick}
                        />
                    </CardContent>
                </Card>
            ) : (
                <Cart
                    cartItems={cart}
                    onResetOrder={handleResetOrder}
                    onAddItems={handleAddItems}
                />
            )}
        </div>
    );
};



