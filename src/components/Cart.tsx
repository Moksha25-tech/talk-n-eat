/**
 * Cart Component for Voice Kiosk
 * Displays cart items, total cost, and order management
 */

import React from 'react';
import {Plus, RotateCcw} from 'lucide-react';         // Importing icons for buttons
import {Button} from './ui/button';                   // Custom button component from the UI library
import {Card, CardContent, CardHeader, CardTitle} from './ui/card'; // Card layout components
import {CartItem} from '../types';                   // Type definition for cart items

// Props interface defining expected properties for the Cart component
export interface CartProps {
    cartItems: CartItem[],           // Array of cart items with name, price, quantity
    onResetOrder: () => void,        // Callback to reset the order
    onAddItems: () => void,          // Callback to add more items
}

// Functional component definition with destructured props
export const Cart: React.FC<CartProps> = ({cartItems, onResetOrder, onAddItems}) => {
    // Calculate total price by summing price * quantity for each item
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Generate a random order ID with prefix 'KSK'
    const orderId = `KSK${Math.floor(Math.random() * 10000)}`;

    return (
        // Main container for the cart, styled as a card
        <Card className="h-full bg-card border-border">
            {/* Header section with title */}
            <CardHeader>
                <CardTitle className="text-foreground">Your Cart</CardTitle>
            </CardHeader>

            {/* Main content area of the cart */}
            <CardContent className="space-y-4">
                {/* Buttons for order management: Reset and Add Items */}
                <div className="flex gap-2">
                    {/* Reset Order Button */}
                    <Button onClick={onResetOrder} variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-1"/> {/* Reset icon */}
                        Reset Order
                    </Button>

                    {/* Add Items Button */}
                    <Button onClick={onAddItems} variant="secondary" size="sm">
                        <Plus className="h-4 w-4 mr-1"/> {/* Plus icon */}
                        Add Items
                    </Button>
                </div>

                {/* Conditional rendering: If no items, show a message */}
                {cartItems.length === 0 ? (
                    <p className="text-muted-foreground italic text-center py-8">
                        No items yet. Start speaking to add items!
                    </p>
                ) : (
                    // If there are items, display the order details
                    <div className="space-y-4">
                        {/* Container for order ID, items, and total */}
                        <div className="bg-muted p-3 rounded">
                            {/* Order ID displayed at top */}
                            <p className="font-semibold mb-2">Order ID: {orderId}</p>

                            {/* Loop through cart items and display each item */}
                            {cartItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-1">
                                    <span>{item.quantity}x {item.name}</span> {/* Quantity and name */}
                                    <span>₹{item.price * item.quantity}</span> {/* Item total price */}
                                </div>
                            ))}

                            {/* Display total price at the bottom */}
                            <div className="border-t pt-2 mt-2 font-bold">
                                Total: ₹{total}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
