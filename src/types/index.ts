/**
 * Type definitions for the Voice Kiosk Ordering System
 * All interfaces and types used throughout the application
 */

// Food item structure for menu display
export interface FoodItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
}

// Cart item structure (extends FoodItem with quantity)
export interface CartItem extends FoodItem {
  quantity: number;
}

// Order structure for final order processing
export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: Date;
}

// Voice recognition states
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

// View states for navigation
export type ViewState = 'menu' | 'cart';

// Voice command types that the system can recognize
export type VoiceCommand = 'start' | 'stop' | 'delete' | 'cart' | 'menu' | 'add_item';