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
 * Parse voice transcript to extract food items, quantities, and commands
 * Handles various ways users might say quantities and item names
 * Also processes cart operations and navigation commands
 * @param transcript - The voice transcript to parse
 * @param foodItems - Array of available food items
 * @returns Object with items, commands, and operations
 */
export const parseVoiceTranscript = (transcript: string, foodItems: FoodItem[]) => {
  const foundItems: { item: FoodItem; quantity: number }[] = [];
  const removeItems: { item: FoodItem; quantity: number }[] = [];
  const lowerTranscript = transcript.toLowerCase();
  
  // Check for cart and navigation commands
  const commands = {
    goToCart: lowerTranscript.includes('go to cart') || lowerTranscript.includes('show cart') || lowerTranscript.includes('view cart'),
    cancelOrder: lowerTranscript.includes('cancel order') || lowerTranscript.includes('clear cart') || lowerTranscript.includes('reset order'),
    addMore: lowerTranscript.includes('add more') || lowerTranscript.includes('go back') || lowerTranscript.includes('back to menu'),
    placeOrder: lowerTranscript.includes('place order') || lowerTranscript.includes('confirm order') || lowerTranscript.includes('checkout')
  };
  
  // Common quantity words mapping
  const quantityWords: { [key: string]: number } = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'a': 1, 'an': 1, 'single': 1, 'double': 2, 'triple': 3,
    'half': 0.5, 'dozen': 12, 'couple': 2, 'few': 3
  };
  
  // For each food item, check if it's mentioned in the transcript
  foodItems.forEach(item => {
    const itemName = item.name.toLowerCase();
    
    // Check for remove operations first
    const removePattern = new RegExp(`remove\\s+(\\d+|${Object.keys(quantityWords).join('|')})\\s+${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    const removeMatch = lowerTranscript.match(removePattern);
    
    if (removeMatch) {
      let quantity = 1;
      const quantityMatch = removeMatch[0].match(/\d+/);
      if (quantityMatch) {
        quantity = parseInt(quantityMatch[0]);
      } else {
        // Check for quantity words
        for (const [word, num] of Object.entries(quantityWords)) {
          if (removeMatch[0].includes(word)) {
            quantity = num;
            break;
          }
        }
      }
      removeItems.push({ item, quantity });
      return; // Don't process as add if it's a remove command
    }
    
    // Check if item name is mentioned for adding
    if (lowerTranscript.includes(itemName)) {
      let quantity = 1; // default quantity
      
      // Look for explicit numbers before the item name
      const numberRegex = new RegExp(`(\\d+)\\s+${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      const numberMatch = lowerTranscript.match(numberRegex);
      
      if (numberMatch) {
        const numStr = numberMatch[0].match(/\d+/);
        if (numStr) {
          quantity = parseInt(numStr[0]);
        }
      } else {
        // Look for quantity words before the item name
        const wordsBeforeItem = lowerTranscript.split(itemName)[0].split(' ');
        const lastWords = wordsBeforeItem.slice(-3); // Check last 3 words before item
        
        for (const word of lastWords.reverse()) {
          const cleanWord = word.trim().replace(/[^\w]/g, '');
          if (quantityWords[cleanWord]) {
            quantity = quantityWords[cleanWord];
            break;
          }
        }
      }
      
      foundItems.push({ item, quantity });
    }
  });
  
  return {
    addItems: foundItems,
    removeItems,
    commands
  };
};