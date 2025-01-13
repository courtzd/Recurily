import { supabase } from './supabase';
import type { Database } from './database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Check for upcoming renewals
export async function checkUpcomingRenewals() {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .gte('next_billing_date', new Date().toISOString())
    .lte('next_billing_date', sevenDaysFromNow.toISOString())
    .eq('status', 'active');

  if (error) {
    console.error('Error checking renewals:', error);
    return;
  }

  return subscriptions;
}

// Monitor price changes by checking subscription URLs
export async function monitorPriceChanges(subscription: Subscription) {
  if (!subscription.url) return null;

  // Simulate price monitoring with random variations
  // In production, this would be replaced with a proper price monitoring service
  try {
    const currentPrice = subscription.price;
    
    // 30% chance of price change
    if (Math.random() < 0.3) {
      // Random price variation between -5% and +15%
      const variation = (Math.random() * 0.2 - 0.05) * currentPrice;
      const newPrice = Math.round((currentPrice + variation) * 100) / 100;
      return newPrice;
    }
    
    return currentPrice;
  } catch (error) {
    console.error(`Error monitoring price for ${subscription.service_name}:`, error);
    return null;
  }
}

// Update subscription price
export async function updateSubscriptionPrice(
  subscriptionId: string, 
  newPrice: number,
  userId: string
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      price: newPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating subscription price:', error);
    throw error;
  }
}

// Send notification through Supabase realtime
export async function sendNotification(
  userId: string,
  type: 'renewal' | 'price_change',
  data: {
    service_name: string;
    old_price?: number;
    new_price?: number;
    renewal_date?: string;
  }
) {
  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      type,
      data,
      read: false,
      created_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}