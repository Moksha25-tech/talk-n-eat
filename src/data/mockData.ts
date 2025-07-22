/**
 * Mock data for the Voice Kiosk Ordering System
 * Contains hardcoded food items and categories for demonstration
 */

import { FoodItem } from '../types';

// Mock food items data - 12 items across different categories
export const mockFoodItems: FoodItem[] = [
  {
    id: '1',
    name: 'Paneer Tikka',
    price: 180,
    image: '🧀',
    category: 'Starters',
    description: 'Grilled cottage cheese with spices'
  },
  {
    id: '2',
    name: 'Masala Dosa',
    price: 120,
    image: '🫓',
    category: 'South Indian',
    description: 'Crispy crepe with spiced potato filling'
  },
  {
    id: '3',
    name: 'Butter Chicken',
    price: 280,
    image: '🍛',
    category: 'Main Course',
    description: 'Creamy tomato-based chicken curry'
  },
  {
    id: '4',
    name: 'Veg Biryani',
    price: 200,
    image: '🍚',
    category: 'Rice',
    description: 'Fragrant basmati rice with vegetables'
  },
  {
    id: '5',
    name: 'Samosa',
    price: 40,
    image: '🥟',
    category: 'Snacks',
    description: 'Crispy pastry with spiced filling'
  },
  {
    id: '6',
    name: 'Chole Bhature',
    price: 150,
    image: '🫘',
    category: 'North Indian',
    description: 'Spiced chickpeas with fried bread'
  },
  {
    id: '7',
    name: 'Idli Sambhar',
    price: 80,
    image: '⚪',
    category: 'South Indian',
    description: 'Steamed rice cakes with lentil soup'
  },
  {
    id: '8',
    name: 'Chicken Tikka',
    price: 220,
    image: '🍗',
    category: 'Starters',
    description: 'Grilled marinated chicken pieces'
  },
  {
    id: '9',
    name: 'Dal Tadka',
    price: 140,
    image: '🫛',
    category: 'Main Course',
    description: 'Tempered yellow lentils'
  },
  {
    id: '10',
    name: 'Gulab Jamun',
    price: 60,
    image: '🍡',
    category: 'Desserts',
    description: 'Sweet milk dumplings in syrup'
  },
  {
    id: '11',
    name: 'Mango Lassi',
    price: 80,
    image: '🥭',
    category: 'Beverages',
    description: 'Sweet mango yogurt drink'
  },
  {
    id: '12',
    name: 'Naan',
    price: 50,
    image: '🫓',
    category: 'Bread',
    description: 'Traditional Indian flatbread'
  }
];

// Categories for filtering (currently for display only)
export const categories = [
  'All Categories',
  'Starters',
  'Main Course',
  'South Indian',
  'North Indian',
  'Rice',
  'Snacks',
  'Bread',
  'Desserts',
  'Beverages'
];

/**
 * Enhanced Natural Language Processing function
 * Extracts food item names from voice transcript without requiring "I want"
 * @param transcript - The voice input text to parse
 * @param foodItems - Array of available food items to match against
 * @returns Array of matched food items with quantities
 */
export const parseVoiceTranscript = (transcript: string, foodItems: FoodItem[]) => {
  const foundItems: { item: FoodItem; quantity: number }[] = [];
  const lowerTranscript = transcript.toLowerCase().trim();
  
  // Enhanced keywords for quantity detection
  const quantityMap: { [key: string]: number } = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'a': 1, 'an': 1, 'single': 1, 'double': 2, 'triple': 3
  };
  
  // Remove common prefixes that users might say
  const cleanedTranscript = lowerTranscript
    .replace(/^(i want|i need|i would like|give me|i'll have|can i get|let me have)\s*/i, '')
    .replace(/\s+(please|thanks|thank you)$/i, '');
  
  // Split by common separators
  const segments = cleanedTranscript.split(/\s+and\s+|\s*,\s*|\s+also\s+/);
  
  segments.forEach(segment => {
    const trimmedSegment = segment.trim();
    
    // Search for each food item in the segment
    foodItems.forEach(item => {
      const itemName = item.name.toLowerCase();
      const itemWords = itemName.split(' ');
      
      // Check if item name appears in segment (exact match or partial match)
      const isExactMatch = trimmedSegment.includes(itemName);
      const isPartialMatch = itemWords.some(word => 
        word.length > 3 && trimmedSegment.includes(word)
      );
      
      if (isExactMatch || isPartialMatch) {
        let quantity = 1; // default quantity
        
        // Look for quantity words in the segment
        const words = trimmedSegment.split(' ');
        for (let i = 0; i < words.length; i++) {
          if (quantityMap[words[i]]) {
            quantity = quantityMap[words[i]];
            break;
          }
        }
        
        // Check if item already found (avoid duplicates)
        const existingItem = foundItems.find(found => found.item.id === item.id);
        if (!existingItem) {
          foundItems.push({ item, quantity });
        }
      }
    });
  });
  
  return foundItems;
};