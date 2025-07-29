/**
 * Cart Component for Voice Kiosk
 * Displays cart items, total cost, and order management
 */

import React from 'react';
import {Plus, RotateCcw} from 'lucide-react';
import {Button} from './ui/button';
import {Card, CardContent, CardHeader, CardTitle} from './ui/card';
import {CartItem} from '../types';

export interface CartProps {
    cartItems: CartItem[],
    onResetOrder: () => void,
    onAddItems: () => void,
}

export const Cart: React.FC<CartProps> = ({cartItems, onResetOrder, onAddItems}) => {
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = `KSK${Math.floor(Math.random() * 10000)}`;

    return (
        <Card className="h-full bg-card border-border">
            <CardHeader>
                <CardTitle className="text-foreground">Your Cart</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Button onClick={onResetOrder} variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-1"/>
                        Reset Order
                    </Button>
                    <Button onClick={onAddItems} variant="secondary" size="sm">
                        <Plus className="h-4 w-4 mr-1"/>
                        Add Items
                    </Button>
                </div>

                {cartItems.length === 0 ? (
                    <p className="text-muted-foreground italic text-center py-8">
                        No items yet. Start speaking to add items!
                    </p>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-muted p-3 rounded">
                            <p className="font-semibold mb-2">Order ID: {orderId}</p>
                            {cartItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-1">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>₹{item.price * item.quantity}</span>
                                </div>
                            ))}
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