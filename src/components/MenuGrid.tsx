/**
 * MenuGrid Component for Voice Kiosk
 * Displays food items in a responsive grid layout
 * Each item shows image (emoji), name, and price
 */

import React from 'react';
import { Card, CardContent } from './ui/card';
import { FoodItem } from '../types';

interface MenuGridProps {
  foodItems: FoodItem[];
  onItemClick?: (item: FoodItem) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({ foodItems, onItemClick }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {foodItems.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-card border-border"
          onClick={() => onItemClick?.(item)}
        >
          <CardContent className="p-4 text-center">
            {/* Food Item Image (Emoji) */}
            <div className="text-4xl mb-2">
              {item.image}
            </div>
            
            {/* Food Item Name */}
            <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">
              {item.name}
            </h3>
            
            {/* Food Item Price */}
            <p className="text-primary font-bold text-lg">
              ₹{item.price}
            </p>
            
            {/* Food Item Description (Optional) */}
            {item.description && (
              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};