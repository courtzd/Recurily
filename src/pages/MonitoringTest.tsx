import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  checkUpcomingRenewals, 
  monitorPriceChanges, 
  sendNotification 
} from '../lib/monitoring';
import type { Database } from '../lib/database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export function MonitoringTest() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!user) return;
    fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user?.id);
    
    if (data) setSubscriptions(data);
  };

  const addResult = (message: string) => {
    setResults(prev => [message, ...prev]);
  };

  const handleCheckRenewals = async () => {
    setLoading(true);
    try {
      const renewals = await checkUpcomingRenewals();
      if (renewals && renewals.length > 0) {
        addResult(`Found ${renewals.length} upcoming renewals`);
        
        // Send notifications for each renewal
        for (const sub of renewals) {
          await sendNotification(sub.user_id, 'renewal', {
            service_name: sub.service_name,
            renewal_date: sub.next_billing_date
          });
          addResult(`Sent renewal notification for ${sub.service_name}`);
        }
      } else {
        addResult('No upcoming renewals found');
      }
    } catch (error) {
      addResult(`Error checking renewals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPrices = async () => {
    setLoading(true);
    try {
      for (const subscription of subscriptions) {
        if (!subscription.url) {
          addResult(`Skipping ${subscription.service_name} - no URL provided`);
          continue;
        }

        const newPrice = await monitorPriceChanges(subscription);
        if (newPrice === null) {
          addResult(`No price found for ${subscription.service_name}`);
          continue;
        }

        if (newPrice !== subscription.price) {
          addResult(`Price change detected for ${subscription.service_name}: ${subscription.price} -> ${newPrice}`);
          
          await sendNotification(subscription.user_id, 'price_change', {
            service_name: subscription.service_name,
            old_price: subscription.price,
            new_price: newPrice
          });
          addResult(`Sent price change notification for ${subscription.service_name}`);
        } else {
          addResult(`No price change for ${subscription.service_name}`);
        }
      }
    } catch (error) {
      addResult(`Error checking prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Monitoring Test Panel</h1>

      <div className="space-y-6">
        {/* Test Controls */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Controls</h2>
          <div className="space-x-4">
            <button
              onClick={handleCheckRenewals}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Check Renewals
            </button>
            <button
              onClick={handleCheckPrices}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Check Prices
            </button>
          </div>
        </div>

        {/* Results Log */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
          <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center">No results yet. Run a test to see output.</p>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="text-sm font-mono bg-white p-2 rounded border border-gray-200"
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Active Subscriptions</h2>
          <div className="space-y-4">
            {subscriptions.map(subscription => (
              <div
                key={subscription.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{subscription.service_name}</h3>
                  <p className="text-sm text-gray-500">
                    Current price: ${subscription.price}
                  </p>
                  {subscription.url && (
                    <p className="text-sm text-gray-500">
                      URL: {subscription.url}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}