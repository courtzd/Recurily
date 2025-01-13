import React from 'react';
import { TrendingUp, PieChart, Target, Zap, ArrowUp, ArrowDown, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { 
  getSpendingTrends, 
  getCategoryBreakdown, 
  getSubscriptionMetrics, 
  getOptimizationRecommendations, 
  getSpendingForecast 
} from '../lib/analytics';

export function Insights() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = React.useState({
    trends: [],
    categories: [],
    metrics: null,
    recommendations: [],
    forecast: null
  });

  React.useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [trends, categories, metrics, recommendations, forecast] = await Promise.all([
        getSpendingTrends(user!.id),
        getCategoryBreakdown(user!.id),
        getSubscriptionMetrics(user!.id),
        getOptimizationRecommendations(user!.id),
        getSpendingForecast(user!.id)
      ]);

      setAnalyticsData({
        trends,
        categories,
        metrics,
        recommendations,
        forecast
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
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
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 text-indigo-600 hover:text-indigo-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Subscription Insights</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                    ${analyticsData.metrics?.totalMonthly.toFixed(2)}
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
                <Target className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Yearly Projection
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${analyticsData.metrics?.totalYearly.toFixed(2)}
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
                <PieChart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Average Per Service
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${analyticsData.metrics?.averagePerSubscription.toFixed(2)}
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
                    Most Expensive
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${analyticsData.metrics?.mostExpensiveService.price.toFixed(2)}
                  </dd>
                  <dd className="text-sm text-gray-500">
                    {analyticsData.metrics?.mostExpensiveService.name}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spending Trends */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <span className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-gray-400" />
              Spending Trends
            </span>
          </h2>
          <div className="space-y-4">
            {analyticsData.trends.map((trend, index) => (
              <div key={trend.month} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(trend.month), 'MMMM yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${trend.total.toFixed(2)}
                  </p>
                </div>
                {index > 0 && (
                  <div className={`flex items-center ${
                    trend.change > 0 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {trend.change > 0 ? (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs(trend.change).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <span className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-gray-400" />
              Category Breakdown
            </span>
          </h2>
          <div className="space-y-4">
            {analyticsData.categories.map((category) => (
              <div key={category.category}>
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="capitalize">{category.category}</span>
                  <span>${category.total.toFixed(2)}</span>
                </div>
                <div className="mt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200">
                    <div
                      style={{
                        width: `${category.percentage}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{category.subscriptionCount} subscription{category.subscriptionCount !== 1 ? 's' : ''}</span>
                  <span>{category.percentage.toFixed(1)}% of total</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast & Recommendations */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Spending Forecast */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <span className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-gray-400" />
              Spending Forecast
            </span>
          </h2>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500">Next Month</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analyticsData.forecast?.nextMonth.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">3 Months</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analyticsData.forecast?.threeMonths.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">6 Months</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analyticsData.forecast?.sixMonths.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <span className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-gray-400" />
              Smart Recommendations
            </span>
          </h2>
          <div className="space-y-4">
            {analyticsData.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start p-3 bg-gray-50 rounded-lg"
              >
                <Zap className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}