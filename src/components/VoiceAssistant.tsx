import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, ShoppingCart } from 'lucide-react';
import { Cart } from './Cart';
import { CartItem, FoodItem } from '../types';

// Define command types
type CommandAction =
    | { type: 'ADD_ITEM'; item: string; quantity: number }
    | { type: 'REMOVE_ITEM'; item: string }
    | { type: 'RESET_CART' }
    | { type: 'VIEW_CART' }
    | { type: 'BACK_TO_MENU' }
    | { type: 'START_RECORDING' }
    | { type: 'STOP_RECORDING' }
    | { type: 'UNKNOWN' };

interface VoiceAssistantProps {
    menuItems: FoodItem[];
    onCartUpdate: (cartItems: CartItem[]) => void; // Callback to update parent state
}

/**
 * Parse the transcript to identify and execute commands
 * This function now handles multiple commands in a single transcript
 */
const parseCommand = (transcript: string): CommandAction[] => {
    const normalizedText = transcript.toLowerCase().trim();
    const commands: CommandAction[] = [];

    // Split transcript into sentences to handle multiple commands
    const sentences = normalizedText.split(/[.!?]+/).filter(s => s.trim());

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();

        // Check for recording control commands
        if (trimmedSentence.includes('start recording')) {
            commands.push({ type: 'START_RECORDING' });
            continue; // Skip further processing for this sentence
        }

        if (trimmedSentence.includes('stop recording')) {
            commands.push({ type: 'STOP_RECORDING' });
            continue;
        }

        // Check for view navigation commands
        if (trimmedSentence.includes('go to cart')) {
            commands.push({ type: 'VIEW_CART' });
            continue;
        }

        if (trimmedSentence.includes('add more') || trimmedSentence.includes('back to menu')) {
            commands.push({ type: 'BACK_TO_MENU' });
            continue;
        }

        // Check for cart management commands
        if (trimmedSentence.includes('reset') || trimmedSentence.includes('clear cart')) {
            commands.push({ type: 'RESET_CART' });
            continue;
        }

        // Check for remove item command
        const removeMatch = trimmedSentence.match(/remove\s+(.+)/);
        if (removeMatch) {
            const itemName = removeMatch[1].trim();
            commands.push({ type: 'REMOVE_ITEM', item: itemName });
            continue;
        }

        // Check for add item command (format: "<quantity> <item>")
        const addItemMatch = trimmedSentence.match(/(\d+)\s+(.+)/);
        if (addItemMatch) {
            const quantity = parseInt(addItemMatch[1], 10);
            const itemName = addItemMatch[2].trim();
            commands.push({ type: 'ADD_ITEM', item: itemName, quantity });
            continue;
        }
    }

    // If no commands were found but transcript is not empty
    if (commands.length === 0 && normalizedText) {
        commands.push({ type: 'UNKNOWN' });
    }

    return commands;
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
export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ menuItems = [], onCartUpdate }) => {
    // State for cart items
    const [cart, setCart] = useState<CartItem[]>([]);

    // State for transcript
    const [transcript, setTranscript] = useState('');

    // State for whether we're actively listening for commands
    const [isListening, setIsListening] = useState(false);

    // State for status messages
    const [statusMessage, setStatusMessage] = useState('Say "start recording" to begin');

    // State for passive listening mode
    const [passiveListening, setPassiveListening] = useState(false);

    // State for browser support check
    const [browserSupported, setBrowserSupported] = useState(true);

    // State for initialization status
    const [isInitialized, setIsInitialized] = useState(false);

    // State for cart popover visibility
    const [showCart, setShowCart] = useState(false);

    // Reference to store the previous transcript to avoid duplicate processing
    const lastProcessedTranscriptRef = useRef('');

    // Reference to track if component is mounted
    const isMountedRef = useRef(true);

    // Calculate total items in cart
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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

    // Initialize speech recognition on component mount
    useEffect(() => {
        // Set up mounted ref
        isMountedRef.current = true;

        // Check if browser supports speech recognition
        if (!browserSupportsSpeechRecognition) {
            if (isMountedRef.current) {
                setBrowserSupported(false);
                setStatusMessage('Speech recognition is not supported in this browser.');
            }
            setIsInitialized(true);
            return;
        }

        // Start passive listening with proper error handling
        const initializeSpeechRecognition = async () => {
            try {
                await SpeechRecognition.startListening({ continuous: true });
                if (isMountedRef.current) {
                    setPassiveListening(true);
                    setStatusMessage('Passive listening active. Say "start recording" to begin ordering.');
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                if (isMountedRef.current) {
                    setStatusMessage('Error initializing speech recognition. Please check microphone permissions.');
                    setPassiveListening(false);
                    setIsInitialized(true);
                }
            }
        };

        initializeSpeechRecognition();

        // Cleanup function
        return () => {
            isMountedRef.current = false;
            if (browserSupportsSpeechRecognition) {
                try {
                    SpeechRecognition.stopListening();
                } catch (error) {
                    console.error('Error stopping speech recognition:', error);
                }
            }
        };
    }, [browserSupportsSpeechRecognition]);

    // Update the transcript when speech is recognized
    useEffect(() => {
        if (speechTranscript) {
            setTranscript(speechTranscript);
        }
    }, [speechTranscript]);

    // Process commands when we have a final transcript
    useEffect(() => {
        if (!transcript || !isInitialized) return;

        // Avoid processing the same transcript multiple times
        if (transcript === lastProcessedTranscriptRef.current) return;
        lastProcessedTranscriptRef.current = transcript;

        // Always check for "start recording" command, even in passive mode
        const normalizedText = transcript.toLowerCase().trim();
        if (normalizedText.includes('start recording') && !isListening) {
            setIsListening(true);
            setStatusMessage('Now actively listening for commands...');
            resetTranscript();
            return;
        }

        // Only process other commands if we are actively listening
        if (isListening) {
            // Parse the command from the transcript
            const commands = parseCommand(transcript);

            // Process each command
            for (const command of commands) {
                switch (command.type) {
                    case 'START_RECORDING':
                        // Already handled above
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

                                    // Create a new cart item with updated quantity
                                    const updatedItem: CartItem = {
                                        ...existingItem,
                                        quantity: existingItem.quantity + command.quantity
                                    };

                                    updatedCart[existingItemIndex] = updatedItem;
                                    return updatedCart;
                                } else {
                                    // Add new item to cart - create a CartItem from FoodItem
                                    const newItem: CartItem = {
                                        ...menuItem,
                                        quantity: command.quantity
                                    };
                                    return [...prevCart, newItem];
                                }
                            });
                            setStatusMessage(`Added ${command.quantity} ${menuItem.name}(s) to cart.`);
                        } else {
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
                        setShowCart(true);
                        setStatusMessage('Viewing cart.');
                        break;

                    case 'BACK_TO_MENU':
                        setShowCart(false);
                        setStatusMessage('Back to menu. Say "go to cart" to view your order.');
                        break;

                    case 'UNKNOWN':
                        setStatusMessage('Command not recognized. Please try again.');
                        break;
                }
            }

            // Reset transcript after processing
            setTimeout(() => {
                resetTranscript();
                setTranscript('');
                lastProcessedTranscriptRef.current = '';
            }, 1000);
        }

    }, [transcript, isListening, resetTranscript, menuItems, isInitialized]);

    // Update parent component when cart changes
    useEffect(() => {
        if (onCartUpdate) {
            onCartUpdate(cart);
        }
    }, [cart, onCartUpdate]);

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
        if (browserSupportsSpeechRecognition && !listening && isInitialized) {
            const timeoutId = setTimeout(() => {
                try {
                    SpeechRecognition.startListening({ continuous: true });
                } catch (error) {
                    console.error('Error restarting speech recognition:', error);
                }
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [listening, browserSupportsSpeechRecognition, isInitialized]);

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
        setShowCart(false);
        setStatusMessage('Back to menu. Say "go to cart" to view your order.');
    };

    // Toggle cart visibility
    const toggleCart = () => {
        setShowCart(!showCart);
        setStatusMessage(showCart ? 'Back to menu.' : 'Viewing cart.');
    };

    // If browser doesn't support speech recognition
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

    // Show loading state while initializing
    if (!isInitialized) {
        return (
            <Card className="h-full bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">Voice Ordering Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className="text-muted-foreground">
                            Initializing voice recognition...
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
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-foreground">
                            Voice Ordering Assistant
                        </CardTitle>
                        {/* Cart Button in Top Right */}
                        <Button
                            onClick={toggleCart}
                            variant="outline"
                            size="sm"
                            className="relative"
                        >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Cart
                            {totalItems > 0 && (
                                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status indicator */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                                passiveListening ?
                                    (isListening ? 'bg-green-500' : 'bg-yellow-500') :
                                    'bg-red-500'
                            }`}></div>
                            <span className="text-sm text-muted-foreground">
                {passiveListening ?
                    (isListening ? 'Actively listening...' : 'Passively listening...') :
                    'Not listening'
                }
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
                                    {isListening ? 'Listening for commands...' :
                                        passiveListening ? 'Passively listening for "start recording"...' :
                                            'Say "start recording" to begin'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Help text for available commands */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Voice Commands:</strong></p>
                        <p>• "Start recording" - Begin voice ordering (works even in passive mode)</p>
                        <p>• "Stop recording" – Stop voice ordering</p>
                        <p>• "[quantity] [item name]" – Add item to cart (e.g., "2 masala dosa")</p>
                        <p>• "Remove [item name]" – Remove item from cart</p>
                        <p>• "Reset" – Clear all items from cart</p>
                        <p>• "Go to cart" – View your cart</p>
                        <p>• "Add more" – Return to menu</p>
                    </div>
                </CardContent>
            </Card>

            {/* Cart Popover/Modal */}
            {showCart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Your Cart</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleCart}
                            >
                                ×
                            </Button>
                        </div>
                        <div className="p-4">
                            <Cart
                                cartItems={cart}
                                onResetOrder={handleResetOrder}
                                onAddItems={handleAddItems}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};