import React from 'react';
import { CreditCard, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SubscriptionIcon } from '../components/SubscriptionIcon';
import { AddSubscriptionModal } from '../components/AddSubscriptionModal';
import { format } from 'date-fns';
import type { Database } from '../lib/database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

type SortField = 'service_name' | 'price' | 'next_billing_date' | 'category';
type SortDirection = 'asc' | 'desc';

export function Subscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<SortField>('service_name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);
  const [modalMode, setModalMode] = React.useState<'add' | 'edit'>('add');

  React.useEffect(() => {
    if (!user) return;
    fetchSubscriptions();

    const subscription = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSubscriptions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSubscriptions = React.useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'service_name':
          comparison = a.service_name.localeCompare(b.service_name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'next_billing_date':
          comparison = new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime();
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [subscriptions, sortField, sortDirection]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchSubscriptions}
          className="mt-4 text-indigo-600 hover:text-indigo-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Subscriptions</h1>
        <p className="text-sm text-gray-500">Managed by AI-powered tracking</p>
        <button
          onClick={() => {
            setModalMode('add');
            setSelectedSubscription(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Subscription
        </button>
      </div>

      {/* Grid Header */}
      {/* Sort Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <select
          value={sortField}
          onChange={(e) => handleSort(e.target.value as SortField)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="service_name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="next_billing_date">Sort by Billing Date</option>
          <option value="category">Sort by Category</option>
        </select>
        <button
          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </button>
      </div>
      {/* Subscription Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedSubscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 relative group"
            >
              {/* Service Icon and Name */}
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                  <SubscriptionIcon url={subscription.url} className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">{subscription.service_name}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                    {subscription.category}
                  </span>
                </div>
              </div>

              {/* Price and Billing Info */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-gray-900">
                    ${Number(subscription.price).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    per {subscription.billing_cycle}
                  </span>
                </div>

                {subscription.is_trial && (
                  <div className="flex items-center">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Trial
                    </span>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Next billing: {format(new Date(subscription.next_billing_date), 'MMM dd, yyyy')}
                </div>
                <div className="text-xs text-gray-500">
                  Usage score: %
                </div>

                {subscription.url && (
                  <a
                    href={subscription.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 block truncate"
                  >
                    {new URL(subscription.url).hostname.replace('www.', '')}
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <button
                  onClick={() => {
                    setSelectedSubscription(subscription);
                    setModalMode('edit');
                    setIsModalOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this subscription?')) {
                      const { error } = await supabase
                        .from('subscriptions')
                        .delete()
                        .eq('id', subscription.id)
                        .eq('user_id', user?.id);
                         
                      if (!error) {
                        fetchSubscriptions();
                      }
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {subscriptions.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions yet</h3>
              <p className="text-gray-500">Add your first subscription to start tracking</p>
            </div>
          )}
      </div>

      <AddSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSubscription(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setSelectedSubscription(null);
          fetchSubscriptions();
        }}
        subscription={selectedSubscription}
        mode={modalMode}
      />
    </div>
  );
}