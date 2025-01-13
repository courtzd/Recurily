import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Insert'];

const SUBSCRIPTION_CATEGORIES = [
  {
    name: 'Streaming Video',
    services: [
      {
        name: 'Netflix',
        url: 'https://netflix.com',
        plans: [
          { name: 'Basic with ads', price: 6.99 },
          { name: 'Standard', price: 15.49 },
          { name: 'Premium', price: 22.99 }
        ]
      },
      {
        name: 'Disney+',
        url: 'https://disneyplus.com',
        plans: [
          { name: 'Standard with ads', price: 7.99 },
          { name: 'Premium', price: 13.99 }
        ]
      },
      {
        name: 'Hulu',
        url: 'https://hulu.com',
        plans: [
          { name: 'With Ads', price: 7.99 },
          { name: 'No Ads', price: 17.99 },
          { name: 'Live TV', price: 76.99 }
        ]
      },
      {
        name: 'HBO Max',
        url: 'https://hbomax.com',
        plans: [
          { name: 'With Ads', price: 9.99 },
          { name: 'Ad-Free', price: 15.99 }
        ]
      },
      {
        name: 'Amazon Prime Video',
        url: 'https://amazon.com/primevideo',
        plans: [
          { name: 'Prime Video', price: 8.99 },
          { name: 'Prime Membership', price: 14.99 }
        ]
      },
      {
        name: 'YouTube Premium',
        url: 'https://youtube.com/premium',
        plans: [
          { name: 'Individual', price: 13.99 },
          { name: 'Family', price: 22.99 },
          { name: 'Student', price: 7.99 }
        ]
      }
    ]
  },
  {
    name: 'Music',
    services: [
      {
        name: 'Spotify',
        url: 'https://spotify.com',
        plans: [
          { name: 'Individual', price: 10.99 },
          { name: 'Duo', price: 14.99 },
          { name: 'Family', price: 16.99 },
          { name: 'Student', price: 5.99 }
        ]
      },
      {
        name: 'Apple Music',
        url: 'https://music.apple.com',
        plans: [
          { name: 'Individual', price: 10.99 },
          { name: 'Family', price: 16.99 },
          { name: 'Student', price: 5.99 }
        ]
      },
      {
        name: 'YouTube Music',
        url: 'https://music.youtube.com',
        plans: [
          { name: 'Individual', price: 9.99 },
          { name: 'Family', price: 14.99 },
          { name: 'Student', price: 4.99 }
        ]
      },
      {
        name: 'Amazon Music',
        url: 'https://music.amazon.com',
        plans: [
          { name: 'Unlimited Individual', price: 9.99 },
          { name: 'Unlimited Family', price: 15.99 },
          { name: 'Prime Member', price: 8.99 }
        ]
      }
    ]
  },
  {
    name: 'Productivity',
    services: [
      {
        name: 'Microsoft 365',
        url: 'https://microsoft.com/microsoft-365',
        plans: [
          { name: 'Personal', price: 6.99 },
          { name: 'Family', price: 9.99 },
          { name: 'Business Basic', price: 6.00 },
          { name: 'Business Standard', price: 12.50 }
        ]
      },
      {
        name: 'Google One',
        url: 'https://one.google.com',
        plans: [
          { name: '100 GB', price: 1.99 },
          { name: '200 GB', price: 2.99 },
          { name: '2 TB', price: 9.99 },
          { name: '5 TB', price: 24.99 }
        ]
      },
      {
        name: 'Notion',
        url: 'https://notion.so',
        plans: [
          { name: 'Plus', price: 8 },
          { name: 'Business', price: 15 },
          { name: 'Enterprise', price: 25 }
        ]
      },
      {
        name: 'Evernote',
        url: 'https://evernote.com',
        plans: [
          { name: 'Personal', price: 7.99 },
          { name: 'Professional', price: 9.99 },
          { name: 'Teams', price: 14.99 }
        ]
      }
    ]
  },
  {
    name: 'Cloud Storage',
    services: [
      {
        name: 'Dropbox',
        url: 'https://dropbox.com',
        plans: [
          { name: 'Plus', price: 11.99 },
          { name: 'Family', price: 19.99 },
          { name: 'Professional', price: 19.99 },
          { name: 'Business', price: 24.00 }
        ]
      },
      {
        name: 'Google Drive',
        url: 'https://drive.google.com',
        plans: [
          { name: '100 GB', price: 1.99 },
          { name: '200 GB', price: 2.99 },
          { name: '2 TB', price: 9.99 }
        ]
      },
      {
        name: 'iCloud',
        url: 'https://icloud.com',
        plans: [
          { name: '50 GB', price: 0.99 },
          { name: '200 GB', price: 2.99 },
          { name: '2 TB', price: 9.99 }
        ]
      },
      {
        name: 'OneDrive',
        url: 'https://onedrive.live.com',
        plans: [
          { name: 'Basic 100 GB', price: 1.99 },
          { name: 'Microsoft 365 Personal', price: 6.99 },
          { name: 'Microsoft 365 Family', price: 9.99 }
        ]
      }
    ]
  },
  {
    name: 'Gaming',
    services: [
      {
        name: 'Xbox Game Pass',
        url: 'https://xbox.com/gamepass',
        plans: [
          { name: 'Console', price: 10.99 },
          { name: 'PC', price: 9.99 },
          { name: 'Ultimate', price: 16.99 }
        ]
      },
      {
        name: 'PlayStation Plus',
        url: 'https://playstation.com/plus',
        plans: [
          { name: 'Essential', price: 9.99 },
          { name: 'Extra', price: 14.99 },
          { name: 'Premium', price: 17.99 }
        ]
      },
      {
        name: 'Nintendo Switch Online',
        url: 'https://nintendo.com/switch/online',
        plans: [
          { name: 'Individual', price: 3.99 },
          { name: 'Family', price: 7.99 },
          { name: 'Individual + Expansion Pack', price: 49.99 },
          { name: 'Family + Expansion Pack', price: 79.99 }
        ]
      },
      {
        name: 'EA Play',
        url: 'https://ea.com/ea-play',
        plans: [
          { name: 'Basic', price: 4.99 },
          { name: 'Pro', price: 14.99 }
        ]
      }
    ]
  }
];

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignupWizard({ isOpen, onClose }: WizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [selectedServices, setSelectedServices] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = React.useState<Record<string, string>>({});
  const [renewalDates, setRenewalDates] = React.useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = React.useState(false);

  const totalSelected = Object.values(selectedServices).filter(Boolean).length;
  const monthlyTotal = React.useMemo(() => {
    return SUBSCRIPTION_CATEGORIES.reduce((total, category) => {
      return total + category.services.reduce((categoryTotal, service) => {
        if (!selectedServices[service.name]) return categoryTotal;
        const selectedPlan = service.plans.find(plan => plan.name === selectedPlans[service.name]);
        return categoryTotal + (selectedPlan?.price || 0);
      }, 0);
    }, 0);
  }, [selectedServices]);

  const handleServiceToggle = (serviceName: string, defaultPlanName?: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }));
    if (defaultPlanName) {
      setSelectedPlans(prev => ({
        ...prev,
        [serviceName]: defaultPlanName
      }));
    }
  };

  const handlePlanChange = (serviceName: string, planName: string) => {
    setSelectedPlans(prev => ({
      ...prev,
      [serviceName]: planName
    }));
  };

  const handleNext = () => {
    if (totalSelected === 0) {
      setError('Please select at least one subscription');
      return;
    }
    setError(null);
    setShowSummary(true);
  };

  const handleBack = () => {
    setShowSummary(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const subscriptions: Subscription[] = SUBSCRIPTION_CATEGORIES.flatMap(category =>
        category.services.filter(service => selectedServices[service.name]).map(service => {
          // Map category names to valid database categories
          const categoryMap: Record<string, Subscription['category']> = {
            'Streaming Video': 'streaming',
            'Music': 'music',
            'Productivity': 'productivity',
            'Cloud Storage': 'cloud',
            'Gaming': 'gaming'
          };
          const dbCategory = categoryMap[category.name] || 'other';

          return {
            user_id: user.id,
            service_name: service.name,
            price: service.plans.find(plan => plan.name === selectedPlans[service.name])?.price || 0,
            billing_cycle: 'monthly',
            category: dbCategory,
            next_billing_date: renewalDates[service.name] || new Date().toISOString().split('T')[0],
            status: 'active',
            url: service.url
          }
        })
      );

      if (subscriptions.length > 0) {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert(subscriptions);

        if (insertError) throw insertError;
      }

      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save subscriptions');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative w-full max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Set Up Your Subscriptions</h2>
              <p className="mt-1 text-sm text-gray-500">
                Select the services you're subscribed to and we'll help you track them
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!showSummary ? (
              /* Categories Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SUBSCRIPTION_CATEGORIES.map((category) => (
                <div key={category.name} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{category.name}</h3>
                  <div className="space-y-3">
                    {category.services.map((service) => (
                      <div
                        key={service.name}
                        className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm"
                        onClick={() => handleServiceToggle(service.name, service.plans[0].name)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={service.name}
                            checked={selectedServices[service.name] || false}
                            onChange={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={service.name} className="ml-3 text-sm text-gray-900">
                            {service.name}
                          </label>
                        </div>
                        {selectedServices[service.name] && (
                          <select
                            value={selectedPlans[service.name] || service.plans[0].name}
                            onChange={(e) => {
                              e.stopPropagation();
                              handlePlanChange(service.name, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-4 text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {service.plans.map(plan => (
                              <option key={plan.name} value={plan.name}>
                                {plan.name} - ${plan.price}/mo
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            ) : (
              /* Summary Page */
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Review Your Selections</h3>
                {SUBSCRIPTION_CATEGORIES.map(category => {
                  const selectedInCategory = category.services.filter(
                    service => selectedServices[service.name]
                  );
                  
                  if (selectedInCategory.length === 0) return null;

                  return (
                    <div key={category.name} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">{category.name}</h4>
                      <div className="space-y-4">
                        {selectedInCategory.map(service => {
                          const selectedPlan = service.plans.find(
                            plan => plan.name === selectedPlans[service.name]
                          );
                          return (
                            <div key={service.name} className="bg-white p-4 rounded-md shadow-sm">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h5 className="font-medium text-gray-900">{service.name}</h5>
                                  <p className="text-sm text-gray-600">
                                    {selectedPlan?.name} - ${selectedPlan?.price}/mo
                                  </p>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Next Billing Date (Optional)
                                </label>
                                <input
                                  type="date"
                                  value={renewalDates[service.name] || ''}
                                  onChange={(e) => setRenewalDates(prev => ({
                                    ...prev,
                                    [service.name]: e.target.value
                                  }))}
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Selected Services</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSelected}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Monthly Total</p>
                  <p className="text-2xl font-bold text-gray-900">${monthlyTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
            <button
              onClick={showSummary ? handleBack : onClose}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showSummary ? 'Back' : 'Skip for now'}
            </button>
            <button
              onClick={showSummary ? handleSave : handleNext}
              disabled={loading || totalSelected === 0}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (showSummary ? 'Confirm & Finish' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}