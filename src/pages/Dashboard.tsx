import React from 'react';
import { CreditCard, TrendingUp, AlertCircle, Plus, Zap, Check, Pencil, Trash2, Calendar, PieChart, ArrowUp, ArrowDown, Upload, DollarSign, TrendingDown, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SubscriptionIcon } from '../components/SubscriptionIcon';
import { AddSubscriptionModal } from '../components/AddSubscriptionModal';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { format, addMonths, isBefore } from 'date-fns';
import { getSpendingTrends, getCategoryBreakdown, getSubscriptionMetrics, getOptimizationRecommendations, getSpendingForecast } from '../lib/analytics';
import type { Database } from '../lib/database.types';
import { SignupWizard } from '../components/SignupWizard';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalSpending, setTotalSpending] = React.useState(0);
  const [potentialSavings, setPotentialSavings] = React.useState(0);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);
  const [modalMode, setModalMode] = React.useState<'add' | 'edit'>('add');
  const [categoryTotals, setCategoryTotals] = React.useState<CategoryTotal[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [upcomingRenewals, setUpcomingRenewals] = React.useState<Subscription[]>([]);
  const [showWizard, setShowWizard] = React.useState(false);
  const [analyticsData, setAnalyticsData] = React.useState({
    categories: [],
    recommendations: [],
  });

  // Set up real-time subscription to changes
  React.useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchSubscriptions();

    // Set up real-time subscription
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
        (payload) => {
          console.log('Change received!', payload);
          fetchSubscriptions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Sort by created_at in descending order (most recent first)
      const sortedData = (data || []).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSubscriptions(sortedData);
      calculateMetrics(data);
      analyzeCategorySpending(data);
      findUpcomingRenewals(data);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics based on subscription data
  const calculateMetrics = (data: Subscription[]) => {
    const total = data.reduce((sum, sub) => sum + Number(sub.price), 0);
    setTotalSpending(total);

    // Calculate potential savings (e.g., subscriptions not used frequently)
    const potentialSavings = data.reduce((sum, sub) => {
      // Add your savings calculation logic here
      return sum + (Number(sub.price) * 0.1); // Example: 10% of each subscription
    }, 0);
    setPotentialSavings(potentialSavings);
  };

  // Analyze spending by category
  const analyzeCategorySpending = (data: Subscription[]) => {
    const totals = data.reduce((acc, sub) => {
      const category = sub.category;
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }
      acc[category].total += Number(sub.price);
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    setCategoryTotals(
      Object.entries(totals).map(([category, { total, count }]) => ({
        category,
        total,
        count
      }))
    );
  };

  // Find upcoming renewals
  const findUpcomingRenewals = (data: Subscription[]) => {
    const today = new Date();
    const thirtyDaysFromNow = addMonths(today, 1);
    
    const upcoming = data.filter(sub => {
      const renewalDate = new Date(sub.next_billing_date);
      return isBefore(renewalDate, thirtyDaysFromNow) && isBefore(today, renewalDate);
    });

    setUpcomingRenewals(upcoming);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Subscriptions</h3>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => fetchSubscriptions()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowWizard(true)}
            title="Quickly add new subscriptions"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Zap className="h-5 w-5 mr-2" />
            Quick Add
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            title="Upload subscription documents for automatic detection"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Document
          </button>
          <button
            onClick={() => {
              setModalMode('add');
              setSelectedSubscription(null);
              setIsModalOpen(true);
            }}
            title="Add a new subscription manually"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Subscription
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Monthly Spending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${totalSpending.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Check className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Subscriptions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {subscriptions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Potential Savings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${potentialSavings.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <span className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-gray-400" />
              Spending by Category
            </span>
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {categoryTotals.map((category) => (
              <div key={category.category}>
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="capitalize">{category.category}</span>
                  <span>${Number(category.total).toFixed(2)}</span>
                </div>
                <div className="mt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200">
                    <div
                      style={{
                        width: `${(category.total / totalSpending) * 100}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{category.count} subscription{category.count !== 1 ? 's' : ''}</span>
                  <span>{((category.total / totalSpending) * 100).toFixed(1)}% of total</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <span className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-400" />
              Upcoming Renewals
            </span>
          </h2>
          <div className="space-y-4">
            {upcomingRenewals.map((subscription) => (
              <div
                key={subscription.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {subscription.service_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Renews on {format(new Date(subscription.next_billing_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${Number(subscription.price).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">per {subscription.billing_cycle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">
          <span className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            AI Insights
          </span>
        </h2>
        <div className="text-white space-y-2">
          <p className="mb-4">Top 5 insights based on your subscription patterns:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            {analyticsData.recommendations.slice(0, 5).map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Your Subscriptions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          <span className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
            Recently Added Subscriptions
          </span>
        </h2>
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <SubscriptionIcon url={subscription.url} className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {subscription.service_name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">
                      Next billing: {format(new Date(subscription.next_billing_date), 'MMM dd, yyyy')}
                    </p>
                    {subscription.url && (
                      <>
                        <span className="text-gray-300">•</span>
                        <a
                          href={subscription.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          {new URL(subscription.url).hostname.replace('www.', '')}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {subscription.is_trial ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Trial
                      </span>
                    ) : null}
                    ${Number(subscription.price).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {subscription.is_trial 
                      ? `${subscription.trial_duration} day trial` 
                      : `per ${subscription.billing_cycle}`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setModalMode('edit');
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
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
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {subscriptions.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions yet</h3>
              <p className="text-gray-500 mb-4">Add your first subscription to start tracking</p>
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Quick Setup Guide
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Modal */}
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
      <SignupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchSubscriptions();
        }}
      />
    </div>
  );
}