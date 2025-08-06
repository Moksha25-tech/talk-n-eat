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
    | { type: 'REMOVE_ITEM'; item: string; quantity?: number }
    | { type: 'RESET_CART' }
    | { type: 'VIEW_CART' }
    | { type: 'BACK_TO_MENU' }
    | { type: 'START_RECORDING' }
    | { type: 'STOP_RECORDING' }
    | { type: 'UNKNOWN' };

interface VoiceAssistantProps {
    menuItems: FoodItem[];
    onCartUpdate: (cartItems: CartItem[]) => void;
}

/**
 * Generate a mapping of number words to their numeric values
 * @param maxNumber The maximum number to generate words for (default: 50)
 * @returns A record mapping number words to their numeric values
 */
const generateNumberWords = (maxNumber: number = 50): Record<string, number> => {
    const units = [
        'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
        'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
        'seventeen', 'eighteen', 'nineteen'
    ];

    const tens = [
        '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
    ];

    const numberWords: Record<string, number> = {};

    // Add numbers 0-19
    for (let i = 0; i < units.length && i <= maxNumber; i++) {
        numberWords[units[i]] = i;
    }

    // Add numbers 20 to maxNumber
    for (let i = 20; i <= maxNumber; i++) {
        const ten = Math.floor(i / 10);
        const unit = i % 10;

        if (unit === 0) {
            // Exact tens (twenty, thirty, etc.)
            numberWords[tens[ten]] = i;
        } else {
            // Hyphenated numbers (twenty-one, thirty-two, etc.)
            const hyphenated = `${tens[ten]}-${units[unit]}`;
            numberWords[hyphenated] = i;

            // Also add with space for speech recognition variations
            const spaced = `${tens[ten]} ${units[unit]}`;
            numberWords[spaced] = i;
        }
    }

    return numberWords;
};

// Generate the number words mapping once
const numberWordsMapping = generateNumberWords(50);

/**
 * Convert number words to digits
 * @param word The number word to convert (e.g., "one", "two", "nineteen")
 * @returns The corresponding number or undefined if not found
 */
const wordToNumber = (word: string): number | undefined => {
    return numberWordsMapping[word.toLowerCase()];
};

/**
 * Convert quantity text to a number
 * @param quantityText The quantity text (could be a number string or a number word)
 * @returns The corresponding number or undefined if not found
 */
const parseQuantity = (quantityText: string): number | undefined => {
    // First try to parse as a number
    const num = parseInt(quantityText, 10);
    if (!isNaN(num)) {
        return num;
    }

    // If not a number, try to convert from word
    return wordToNumber(quantityText);
};

/**
 * Parse the transcript to identify and execute commands
 * Completely revised to handle natural language commands properly
 */
const parseCommand = (transcript: string): CommandAction[] => {
    const normalizedText = transcript.toLowerCase().trim();
    const commands: CommandAction[] = [];

    // Split transcript into sentences to handle multiple commands
    const sentences = normalizedText.split(/[.!?]+/).filter(s => s.trim());

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        // Check for recording control commands
        if (trimmedSentence.includes('start recording')) {
            commands.push({ type: 'START_RECORDING' });
            continue;
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

        // Check for remove command (with optional quantity)
        if (trimmedSentence.includes('remove')) {
            const removeMatch = trimmedSentence.match(/remove\s+(.+)$/);
            if (removeMatch) {
                const removeText = removeMatch[1].trim();

                // Try to extract quantity from the beginning
                const quantityMatch = removeText.match(/^(\d+|\w+)\s+(.+)$/);
                if (quantityMatch) {
                    const quantityText = quantityMatch[1];
                    const itemName = quantityMatch[2].trim();
                    const quantity = parseQuantity(quantityText);

                    commands.push({ type: 'REMOVE_ITEM', item: itemName, quantity });
                } else {
                    // No quantity specified, remove all
                    commands.push({ type: 'REMOVE_ITEM', item: removeText });
                }
                continue;
            }
        }

        // Check for add command with explicit "add"
        if (trimmedSentence.startsWith('add ')) {
            const addMatch = trimmedSentence.match(/add\s+(.+)$/);
            if (addMatch) {
                const addText = addMatch[1].trim();

                // Try to extract quantity from the beginning
                const quantityMatch = addText.match(/^(\d+|\w+)\s+(.+)$/);
                if (quantityMatch) {
                    const quantityText = quantityMatch[1];
                    const itemName = quantityMatch[2].trim();
                    const quantity = parseQuantity(quantityText);

                    if (quantity !== undefined) {
                        commands.push({ type: 'ADD_ITEM', item: itemName, quantity });
                    } else {
                        commands.push({ type: 'ADD_ITEM', item: addText, quantity: 1 });
                    }
                } else {
                    // No quantity specified, default to 1
                    commands.push({ type: 'ADD_ITEM', item: addText, quantity: 1 });
                }
                continue;
            }
        }

        // Check for item with quantity at the beginning (e.g., "one butter chicken")
        const itemWithQuantityMatch = trimmedSentence.match(/^(\d+|\w+)\s+(.+)$/);
        if (itemWithQuantityMatch) {
            const quantityText = itemWithQuantityMatch[1];
            const itemName = itemWithQuantityMatch[2].trim();
            const quantity = parseQuantity(quantityText);

            if (quantity !== undefined) {
                commands.push({ type: 'ADD_ITEM', item: itemName, quantity });
            } else {
                // If we can't parse the quantity, treat the whole thing as an item name
                commands.push({ type: 'ADD_ITEM', item: trimmedSentence, quantity: 1 });
            }
            continue;
        }

        // Check for standalone item (default quantity 1)
        // Skip if it's just a number
        if (!/^\d+$/.test(trimmedSentence)) {
            commands.push({ type: 'ADD_ITEM', item: trimmedSentence, quantity: 1 });
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

    // State to control when to reset transcript
    const [shouldResetTranscript, setShouldResetTranscript] = useState(false);

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

    // Handle transcript reset when requested
    useEffect(() => {
        if (shouldResetTranscript) {
            const timeoutId = setTimeout(() => {
                resetTranscript();
                setTranscript('');
                lastProcessedTranscriptRef.current = '';
                setShouldResetTranscript(false);
            }, 1500); // Increased delay to make it less abrupt

            return () => clearTimeout(timeoutId);
        }
    }, [shouldResetTranscript, resetTranscript]);

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
            // Don't reset transcript here, let it accumulate
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
                        // Set flag to reset transcript after a delay
                        setShouldResetTranscript(true);
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
                            setCart(prevCart => {
                                const existingItemIndex = prevCart.findIndex(item => item.id === menuItem.id);
                                if (existingItemIndex >= 0) {
                                    const existingItem = prevCart[existingItemIndex];
                                    let updatedCart = [...prevCart];

                                    // If quantity is specified, remove that quantity
                                    if (command.quantity !== undefined) {
                                        const newQuantity = existingItem.quantity - command.quantity;
                                        if (newQuantity <= 0) {
                                            // Remove the item if quantity becomes zero or negative
                                            updatedCart = updatedCart.filter(item => item.id !== menuItem.id);
                                        } else {
                                            // Update the quantity
                                            updatedCart[existingItemIndex] = {
                                                ...existingItem,
                                                quantity: newQuantity
                                            };
                                        }
                                    } else {
                                        // Remove the item entirely
                                        updatedCart = updatedCart.filter(item => item.id !== menuItem.id);
                                    }

                                    return updatedCart;
                                } else {
                                    // Item not in cart, nothing to remove
                                    return prevCart;
                                }
                            });

                            if (command.quantity !== undefined) {
                                setStatusMessage(`Removed ${command.quantity} ${menuItem.name}(s) from cart.`);
                            } else {
                                setStatusMessage(`Removed all ${menuItem.name}(s) from cart.`);
                            }
                        } else {
                            setStatusMessage(`Item "${command.item}" not found in menu.`);
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
        }
    }, [transcript, isListening, menuItems, isInitialized]);

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
            // Reset transcript when stopping recording
            setShouldResetTranscript(true);
        } else {
            setIsListening(true);
            setStatusMessage('Listening for commands...');
            // Reset the last processed transcript reference to allow processing new commands
            lastProcessedTranscriptRef.current = '';
            // But don't reset the actual transcript display
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
                        <p>• "Start recording" - Begin voice ordering</p>
                        <p>• "Stop recording" – Stop voice ordering and reset transcript</p>
                        <p>• "Add [quantity] [item]" – Add item to cart (e.g., "add one butter chicken")</p>
                        <p>• "[quantity] [item]" – Add item to cart (e.g., "one mango lassi")</p>
                        <p>• "[item]" – Add one item to cart (e.g., "burger")</p>
                        <p>• "Remove [item]" – Remove all of that item from cart</p>
                        <p>• "Remove [quantity] [item]" – Remove specific quantity (e.g., "remove 1 burger")</p>
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