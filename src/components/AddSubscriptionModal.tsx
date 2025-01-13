import React from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionFormData = Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription?: Database['public']['Tables']['subscriptions']['Row'];
  mode?: 'add' | 'edit';
}

export function AddSubscriptionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  subscription,
  mode = 'add' 
}: AddSubscriptionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<SubscriptionFormData>({
    service_name: '',
    price: 0,
    trial_start_date: null,
    trial_end_date: null,
    is_trial: false,
    url: '',
    trial_duration: null,
    billing_cycle: 'monthly',
    category: 'streaming',
    next_billing_date: new Date().toISOString().split('T')[0],
    status: 'active'
  });

  React.useEffect(() => {
    if (subscription && mode === 'edit') {
      setFormData({
        ...subscription,
        // Ensure we don't pass the id or timestamps
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      });
    } else {
      // Reset form when opening in add mode
      setFormData({
        service_name: '',
        price: 0,
        trial_start_date: null,
        trial_end_date: null,
        is_trial: false,
        url: '',
        trial_duration: null,
        billing_cycle: 'monthly',
        category: 'streaming',
        next_billing_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    }
  }, [subscription, mode]);

  const validateForm = (): boolean => {
    if (!formData.service_name.trim()) {
      setError('Service name is required');
      return false;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return false;
    }

    if (!formData.next_billing_date) {
      setError('Next billing date is required');
      return false;
    }

    const nextBillingDate = new Date(formData.next_billing_date);
    if (isNaN(nextBillingDate.getTime())) {
      setError('Invalid billing date');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm() || !user) {
      return;
    }

    setLoading(true);

    try {
      const subscriptionData: Subscription = {
        ...formData,
        user_id: user.id,
        price: Number(formData.price)
      };

      if (mode === 'edit' && subscription?.id) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', subscription.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert([subscriptionData]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error managing subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to save subscription');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {mode === 'edit' ? 'Edit Subscription' : 'Add New Subscription'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="service_name" className="block text-sm font-medium text-gray-700">
                  Service Name
                </label>
                <input
                  type="text"
                  id="service_name"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.service_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    required
                    step="0.01"
                    min="0"
                    className="block w-full rounded-md border-gray-300 pl-7 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="billing_cycle" className="block text-sm font-medium text-gray-700">
                  Billing Cycle
                </label>
                <select
                  id="billing_cycle"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData(prev => ({ ...prev, billing_cycle: e.target.value as Subscription['billing_cycle'] }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Subscription['category'] }))}
                >
                  <option value="streaming">Streaming</option>
                  <option value="music">Music</option>
                  <option value="productivity">Productivity</option>
                  <option value="gaming">Gaming</option>
                  <option value="cloud">Cloud Storage</option>
                  <option value="software">Software</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  Website URL
                </label>
                <input
                  type="url"
                  id="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label htmlFor="next_billing_date" className="block text-sm font-medium text-gray-700">
                  Next Billing Date
                </label>
                <input
                  type="date"
                  id="next_billing_date"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.next_billing_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_billing_date: e.target.value }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_trial"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={formData.is_trial}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_trial: e.target.checked }))}
                  />
                  <label htmlFor="is_trial" className="ml-2 block text-sm text-gray-900">
                    This is a trial subscription
                  </label>
                </div>

                {formData.is_trial && (
                  <div>
                    <label htmlFor="trial_duration" className="block text-sm font-medium text-gray-700">
                      Trial Duration (days)
                    </label>
                    <input
                      type="number"
                      id="trial_duration"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.trial_duration || ''}
                      onChange={(e) => {
                        const duration = parseInt(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          trial_duration: isNaN(duration) ? null : duration,
                          trial_start_date: new Date().toISOString(),
                          trial_end_date: duration 
                            ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
                            : null
                        }));
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {loading ? (mode === 'edit' ? 'Saving...' : 'Adding...') : (mode === 'edit' ? 'Save Changes' : 'Add Subscription')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}