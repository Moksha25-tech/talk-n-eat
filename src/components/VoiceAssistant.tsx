import React, {useState, useEffect, useRef, useCallback} from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {Mic, MicOff, Plus, RotateCcw, ShoppingCart, Upload} from 'lucide-react';
import { Cart } from './Cart';
import { CartItem, FoodItem } from '../types';
import Fuse from 'fuse.js';

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
    backendUrl?: string;
}

/**
 * Generate a mapping of number words to their numeric values
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
 */
const wordToNumber = (word: string): number | undefined => {
    return numberWordsMapping[word.toLowerCase()];
};

/**
 * Convert quantity text to a number
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
 * Create a Fuse instance for fuzzy matching item names
 */
const createFuseInstance = (menuItems: FoodItem[]): Fuse<FoodItem> => {
    const options = {
        includeScore: true,
        threshold: 0.4, // Adjust for more/less strictness
        keys: ['name']
    };

    return new Fuse(menuItems, options);
};

/**
 * Extract quantity-item pairs and commands from a complex transcript
 */
const extractItemsAndCommands = (transcript: string): {
    items: Array<{quantity: number, item: string}>,
    commands: string[]
} => {
    const items: Array<{quantity: number, item: string}> = [];
    const commands: string[] = [];

    // Define command phrases to look for
    const commandPhrases = [
        "start recording", "begin recording", "start listening",
        "stop recording", "end recording", "stop listening",
        "go to cart", "show cart", "view cart", "see my cart",
        "add more", "back to menu", "continue shopping", "add items", "order more", "more items", "continue ordering",
        "reset", "clear cart", "empty cart", "start over"
    ];

    // Make a copy of the transcript for processing
    let processedTranscript = transcript.toLowerCase();

    // Extract commands found in the transcript
    for (const phrase of commandPhrases) {
        if (processedTranscript.includes(phrase)) {
            commands.push(phrase);
            // Remove the phrase from the transcript to avoid confusion
            processedTranscript = processedTranscript.replace(new RegExp(phrase, 'gi'), ' ');
        }
    }

    // Define stop words to remove from item names
    const stopWords = new Set([
        "for", "and", "with", "the", "a", "an", "of", "in", "on", "at", "by", "from",
        "up", "down", "over", "under", "again", "further", "then", "here", "there",
        "when", "where", "why", "how", "what", "which", "who", "whom", "whose",
        "this", "that", "these", "those", "am", "is", "are", "was", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "shall", "should", "may", "might", "must", "can", "could", "i", "you", "he",
        "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your",
        "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
        "to", "go", "cart", "add", "more", "back", "menu", "continue", "shopping",
        "start", "recording", "stop", "finance", "tu" // Added specific words from the example
    ]);

    // Split the processed transcript into tokens
    const tokens = processedTranscript.split(/\s+/).filter(token => token.trim() !== '');

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        const quantity = parseQuantity(token);

        if (quantity !== undefined) {
            // Found a quantity, now collect the next tokens until the next quantity or stop word
            const itemTokens = [];
            let j = i + 1;
            while (j < tokens.length) {
                const nextToken = tokens[j];
                // Check if nextToken is a quantity or a stop word
                if (parseQuantity(nextToken) !== undefined || stopWords.has(nextToken.toLowerCase())) {
                    break;
                }
                itemTokens.push(nextToken);
                j++;
            }

            if (itemTokens.length > 0) {
                const itemName = itemTokens.join(' ');
                items.push({ quantity, item: itemName });
                i = j; // Skip the tokens we've processed
                continue;
            }
        }
        i++;
    }

    return { items, commands };
};

/**
 * Process multiple item commands from a transcript
 */
const processMultipleItemCommands = (
    items: Array<{quantity: number, item: string}>,
    menuItems: FoodItem[],
    currentCart: CartItem[],
    fuse: Fuse<FoodItem>
): { updatedCart: CartItem[], statusMessages: string[] } => {
    // Create a copy of the current cart to update
    const updatedCart = [...currentCart];
    const statusMessages: string[] = [];

    // Process each item
    for (const { quantity, item } of items) {
        // Use fuzzy matching to find the menu item
        const results = fuse.search(item, { limit: 1 });

        if (results.length > 0) {
            const menuItem = results[0].item;
            const score = results[0].score || 1;

            // Only proceed if we have a good match (lower score is better)
            if (score < 0.5) {
                // Check if the item is already in the cart
                const existingItemIndex = updatedCart.findIndex(cartItem => cartItem.id === menuItem.id);

                if (existingItemIndex >= 0) {
                    // Update the quantity if item already exists
                    updatedCart[existingItemIndex] = {
                        ...updatedCart[existingItemIndex],
                        quantity: updatedCart[existingItemIndex].quantity + quantity
                    };
                } else {
                    // Add new item to cart
                    updatedCart.push({
                        ...menuItem,
                        quantity
                    });
                }

                statusMessages.push(`Added ${quantity} ${menuItem.name} to your cart.`);
            } else {
                statusMessages.push(`Item "${item}" not found in menu.`);
            }
        } else {
            statusMessages.push(`Item "${item}" not found in menu.`);
        }
    }

    return { updatedCart, statusMessages };
};

/**
 * VoiceAssistant component for kiosk ordering interface
 */
export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ menuItems = [], onCartUpdate,backendUrl = 'http://localhost:3001/api'}) => {
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
    // State to track if cart was updated
    const [cartUpdated, setCartUpdated] = useState(false);
    // Reference to store the previous transcript to avoid duplicate processing
    const lastProcessedTranscriptRef = useRef('');
    // Reference to track if component is mounted
    const isMountedRef = useRef(true);
    // Reference for Fuse instance
    const fuseRef = useRef<Fuse<FoodItem> | null>(null);

    // State for recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    // Calculate total items in cart
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);


    // MediaRecorder refs & server recording url
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<BlobPart[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

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

    // Initialize Fuse instance for fuzzy matching
    useEffect(() => {
        if (menuItems.length > 0) {
            fuseRef.current = createFuseInstance(menuItems);
        }
    }, [menuItems]);

    const startAudioRecording = useCallback(async () => {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            });

            streamRef.current = stream;
            recordedChunksRef.current = [];
            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;

            // Handle data available event
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = () => {
                uploadRecording();
            };
            // Start recording
            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);
            setRecordingDuration(0);

            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            console.log('Audio recording started');
        } catch (error) {
            console.error('Error starting audio recording:', error);
            setStatusMessage('Error accessing microphone. Please check permissions.');
        }
    }, []);


    const stopAudioRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            // Clear timer
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            // Stop media stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            console.log('Audio recording stopped');
        }
    }, [isRecording]);

    const uploadRecording = useCallback(async () => {
        if (recordedChunksRef.current.length === 0) {
            console.warn('No recorded data to upload');
            return;
        }

        try {
            setIsUploading(true);

            // Create blob from recorded chunks
            const blob = new Blob(recordedChunksRef.current, {
                type: 'audio/webm;codecs=opus'
            });

            // Create FormData
            const formData = new FormData();
            const timestamp = new Date().toISOString();
            const filename = `recording_${timestamp}.webm`;

            formData.append('audio', blob, filename);
            formData.append('timestamp', timestamp);
            formData.append('duration', recordingDuration.toString());
            formData.append('transcript', transcript || '');
            formData.append('cartItems', JSON.stringify(cart));

            // Upload to backend
            const response = await fetch(`${backendUrl}/upload-recording`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Recording uploaded successfully:', result);
                setStatusMessage(`Recording saved successfully (${recordingDuration}s)`);
            } else {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error uploading recording:', error);
            setStatusMessage('Error uploading recording to server');
        } finally {
            setIsUploading(false);
            // Clear recorded chunks
            recordedChunksRef.current = [];
            setRecordingDuration(0);
        }
    }, [backendUrl, recordingDuration, transcript, cart]);

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
                await SpeechRecognition.startListening({continuous: true});
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
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
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
            // Immediately reset the transcript without delay
            resetTranscript();
            setTranscript('');
            lastProcessedTranscriptRef.current = '';
            setShouldResetTranscript(false);
        }
    }, [shouldResetTranscript, resetTranscript]);

    // Process commands when we have a final transcript
    useEffect(() => {
        if (!transcript || !isInitialized || !fuseRef.current) return;

        // Avoid processing the same transcript multiple times
        if (transcript === lastProcessedTranscriptRef.current) return;
        lastProcessedTranscriptRef.current = transcript;

        // Always check for "start recording" command, even in passive mode
        const normalizedText = transcript.toLowerCase().trim();
        if ((normalizedText.includes('start recording') ||
            normalizedText.includes('begin recording') ||
            normalizedText.includes('start listening')) && !isListening) {
            setIsListening(true);
            startAudioRecording();
            setStatusMessage('Now actively listening for commands...');
            // Reset transcript to start fresh
            setShouldResetTranscript(true);
            return;
        }

        // Only process other commands if we are actively listening
        if (isListening) {
            // Extract items and commands from the transcript
            const {items, commands: commandPhrases} = extractItemsAndCommands(transcript);

            // Process the items to update the cart
            if (items.length > 0) {
                const {updatedCart, statusMessages} = processMultipleItemCommands(
                    items,
                    menuItems,
                    cart,
                    fuseRef.current
                );

                setCart(updatedCart);
                setStatusMessage(statusMessages.join(' '));
                setCartUpdated(true);
            }

            // Process the command phrases
            let shouldReset = items.length > 0; // Reset transcript if we processed items

            for (const phrase of commandPhrases) {
                if (phrase.includes('go to cart') || phrase.includes('show cart') ||
                    phrase.includes('view cart') || phrase.includes('see my cart')) {
                    setShowCart(true);
                    setStatusMessage('Viewing cart.');
                    shouldReset = true;
                } else if (phrase.includes('add more') || phrase.includes('back to menu') ||
                    phrase.includes('continue shopping') || phrase.includes('add items') ||
                    phrase.includes('order more') || phrase.includes('more items') ||
                    phrase.includes('continue ordering')) {
                    // Enhanced handling for "add more" command
                    if (showCart) {
                        setShowCart(false);
                        setStatusMessage('Back to menu. Say "go to cart" to view your order.');
                    } else {
                        setStatusMessage('Already on menu. Say "go to cart" to view your order.');
                    }
                    shouldReset = true;
                } else if (phrase.includes('reset') || phrase.includes('clear cart') ||
                    phrase.includes('empty cart') || phrase.includes('start over')) {
                    setCart([]);
                    setStatusMessage('Cart has been cleared.');
                    setCartUpdated(true);
                    shouldReset = true;
                } else if (phrase.includes('stop recording') || phrase.includes('end recording') ||
                    phrase.includes('stop listening')) {
                    setIsListening(false);
                    stopAudioRecording(); // Stop audio recording
                    setStatusMessage('Recording stopped and saved. Say "start recording" to begin again.');
                    resetTranscript();
                    setTranscript("");
                }
            }
            if (shouldReset) {
                setShouldResetTranscript(true);
            }
        }
    }, [transcript, isListening, menuItems, isInitialized, showCart, cart, startAudioRecording, stopAudioRecording]);

    // Update parent component when cart changes
    useEffect(() => {
        if (onCartUpdate && cartUpdated) {
            onCartUpdate(cart);
            setCartUpdated(false);
        }
    }, [cart, onCartUpdate, cartUpdated]);

    // Start/stop listening based on isListening state
    useEffect(() => {
        if (isListening && !isRecording) {
            SpeechRecognition.startListening({continuous: true});
        } else if (!isListening) {
            SpeechRecognition.stopListening();
        }
    }, [isListening, isRecording]);

    // Auto-restart speech recognition if it stops unexpectedly
    useEffect(() => {
        if (browserSupportsSpeechRecognition && !listening && isInitialized && passiveListening) {
            const timeoutId = setTimeout(() => {
                try {
                    SpeechRecognition.startListening({continuous: true});
                } catch (error) {
                    console.error('Error restarting speech recognition:', error);
                }
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [listening, browserSupportsSpeechRecognition, isInitialized, passiveListening]);

    // Handle manual start/stop of recording
    const toggleRecording = async () => {
        if (isListening) {
            setIsListening(false);
            stopAudioRecording();
            setStatusMessage('Recording stopped and saved.');
            setShouldResetTranscript(true);
        } else {
            setIsListening(true);
            await startAudioRecording();
            setStatusMessage('Listening and recording...');
            lastProcessedTranscriptRef.current = '';
            setShouldResetTranscript(true);
        }
    };

    // Handle reset order from Cart component
    const handleResetOrder = () => {
        setCart([]);
        setStatusMessage('Order has been reset.');
        setCartUpdated(true);
    };

    // Enhanced "add more" button handler
    const handleAddItems = () => {
        // Ensure cart is closed
        setShowCart(false);
        // Provide clear feedback to user
        setStatusMessage('Back to menu. Say "go to cart" to view your order.');
        // Reset transcript to prepare for new commands
        setShouldResetTranscript(true);
    };

    // Toggle cart visibility
    const toggleCart = () => {
        setShowCart(!showCart);
        setStatusMessage(showCart ? 'Back to menu.' : 'Viewing cart.');
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                            <ShoppingCart className="h-4 w-4 mr-1"/>
                            Cart
                            {totalItems > 0 && (
                                <span
                                    className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
                            }`}/>
                            <span className="text-sm text-muted-foreground">
                            {passiveListening ?
                                (isListening ? 'Actively listening...' : 'Passively listening...') :
                                'Not listening'}
                        </span>
                            {isRecording && (
                                <div className="flex items-center space-x-2 bg-red-100 px-2 py-1 rounded-full">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-red-700 font-medium">
                                    REC {formatDuration(recordingDuration)}
                                </span>
                                </div>
                            )}
                            {isUploading && (
                                <div className="flex items-center space-x-2 bg-blue-100 px-2 py-1 rounded-full">
                                    <Upload className="w-3 h-3 text-blue-600 animate-spin"/>
                                    <span className="text-xs text-blue-700">Uploading...</span>
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={toggleRecording}
                            variant={isListening ? "destructive" : "default"}
                            size="sm"
                            disabled={isUploading}
                        >
                            {isListening ? (
                                <>
                                    <MicOff className="h-4 w-4 mr-1"/> Stop Recording
                                </>
                            ) : (
                                <>
                                    <Mic className="h-4 w-4 mr-1"/> Start Recording
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
                                    {isListening
                                        ? 'Listening for commands...'
                                        : passiveListening
                                            ? 'Passively listening for "start recording"...'
                                            : 'Say "start recording" to begin'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Help text for available commands */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Voice Commands:</strong></p>
                        <p>• "Start recording" - Begin voice ordering and audio recording</p>
                        <p>• "[quantity] [item]" - Add item to cart (e.g., "2 Butter Chicken")</p>
                        <p>• Multiple items: "2 idli 3 mango lassi 5 gulab jamun"</p>
                        <p>• "Remove [item]" - Remove all of that item (e.g., "Remove Mango Lassi")</p>
                        <p>• "Remove [quantity] [item]" - Remove specific quantity (e.g., "Remove 1 Gulab Jamun")</p>
                        <p>• "Go to cart" - View your cart</p>
                        <p>• "Add more" - Return to menu from cart</p>
                        <p>• "Stop recording" - Stop voice ordering</p>
                    </div>
                </CardContent>
            </Card>

            {/* Cart Popover/Modal */}
            {showCart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Your Cart</h3>
                            <Button variant="ghost" size="sm" onClick={toggleCart}>×</Button>
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