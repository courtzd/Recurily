import { supabase } from './supabase';
import type { Database } from './database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

interface SpendingTrend {
  month: string;
  total: number;
  change: number;
}

interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  subscriptionCount: number;
}

interface SubscriptionMetrics {
  totalMonthly: number;
  totalYearly: number;
  averagePerSubscription: number;
  mostExpensiveService: {
    name: string;
    price: number;
  };
  subscriptionCount: number;
}

// Calculate monthly spending trends
export async function getSpendingTrends(userId: string): Promise<SpendingTrend[]> {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  const monthlyTotals = new Map<string, number>();
  const today = new Date();
  
  // Calculate totals for the last 6 months
  for (let i = 0; i < 6; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    let total = 0;

    subscriptions.forEach(sub => {
      let monthlyPrice = sub.price;
      if (sub.billing_cycle === 'yearly') {
        monthlyPrice /= 12;
      } else if (sub.billing_cycle === 'quarterly') {
        monthlyPrice /= 3;
      }
      total += monthlyPrice;
    });

    monthlyTotals.set(monthKey, total);
  }

  // Convert to array and calculate changes
  const trends: SpendingTrend[] = Array.from(monthlyTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((entry, index, array) => {
      const [month, total] = entry;
      const previousTotal = index > 0 ? array[index - 1][1] : total;
      const change = ((total - previousTotal) / previousTotal) * 100;

      return {
        month,
        total,
        change: index === 0 ? 0 : change
      };
    });

  return trends;
}

// Get category breakdown
export async function getCategoryBreakdown(userId: string): Promise<CategoryBreakdown[]> {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  const categoryTotals = subscriptions.reduce((acc, sub) => {
    const category = sub.category;
    if (!acc[category]) {
      acc[category] = {
        total: 0,
        count: 0
      };
    }
    
    let monthlyPrice = sub.price;
    if (sub.billing_cycle === 'yearly') {
      monthlyPrice /= 12;
    } else if (sub.billing_cycle === 'quarterly') {
      monthlyPrice /= 3;
    }
    
    acc[category].total += monthlyPrice;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const totalSpending = Object.values(categoryTotals)
    .reduce((sum, { total }) => sum + total, 0);

  return Object.entries(categoryTotals).map(([category, data]) => ({
    category,
    total: data.total,
    percentage: (data.total / totalSpending) * 100,
    subscriptionCount: data.count
  }));
}

// Get key subscription metrics
export async function getSubscriptionMetrics(userId: string): Promise<SubscriptionMetrics> {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }

  let totalMonthly = 0;
  let mostExpensiveService = {
    name: '',
    price: 0
  };

  subscriptions.forEach(sub => {
    let monthlyPrice = sub.price;
    if (sub.billing_cycle === 'yearly') {
      monthlyPrice /= 12;
    } else if (sub.billing_cycle === 'quarterly') {
      monthlyPrice /= 3;
    }
    
    totalMonthly += monthlyPrice;

    if (monthlyPrice > mostExpensiveService.price) {
      mostExpensiveService = {
        name: sub.service_name,
        price: monthlyPrice
      };
    }
  });

  return {
    totalMonthly,
    totalYearly: totalMonthly * 12,
    averagePerSubscription: totalMonthly / (subscriptions.length || 1),
    mostExpensiveService,
    subscriptionCount: subscriptions.length
  };
}

// Get optimization recommendations
export async function getOptimizationRecommendations(userId: string): Promise<string[]> {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  const recommendations: string[] = [];

  // Group subscriptions by category
  const categoryGroups = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.category]) {
      acc[sub.category] = [];
    }
    acc[sub.category].push(sub);
    return acc;
  }, {} as Record<string, Subscription[]>);

  // Check for multiple streaming services
  if (categoryGroups.streaming?.length > 2) {
    recommendations.push(
      'Consider rotating your streaming services instead of maintaining multiple subscriptions simultaneously'
    );
  }

  // Check for expensive subscriptions
  subscriptions.forEach(sub => {
    let monthlyPrice = sub.price;
    if (sub.billing_cycle === 'yearly') {
      monthlyPrice /= 12;
    } else if (sub.billing_cycle === 'quarterly') {
      monthlyPrice /= 3;
    }

    if (monthlyPrice > 50) {
      recommendations.push(
        `${sub.service_name} is one of your more expensive subscriptions. Consider evaluating its usage and value.`
      );
    }
  });

  // Check for annual vs monthly savings opportunities
  subscriptions
    .filter(sub => sub.billing_cycle === 'monthly')
    .forEach(sub => {
      recommendations.push(
        `Consider switching ${sub.service_name} to annual billing for potential savings`
      );
    });

  return recommendations;
}

// Get spending forecast
export async function getSpendingForecast(userId: string): Promise<{
  nextMonth: number;
  threeMonths: number;
  sixMonths: number;
}> {
  const trends = await getSpendingTrends(userId);
  
  if (trends.length === 0) {
    return {
      nextMonth: 0,
      threeMonths: 0,
      sixMonths: 0
    };
  }

  // Calculate average monthly change
  const changes = trends
    .slice(1)
    .map(trend => trend.change);
  
  const averageChange = changes.reduce((sum, change) => sum + change, 0) / 
    (changes.length || 1);

  const currentSpending = trends[trends.length - 1].total;
  const monthlyGrowthRate = 1 + (averageChange / 100);

  // Calculate cumulative spending for each period
  const nextMonth = currentSpending * monthlyGrowthRate;
  const threeMonths = Array.from({ length: 3 })
    .reduce((sum, _, i) => sum + (currentSpending * Math.pow(monthlyGrowthRate, i + 1)), 0);
  const sixMonths = Array.from({ length: 6 })
    .reduce((sum, _, i) => sum + (currentSpending * Math.pow(monthlyGrowthRate, i + 1)), 0);

  return {
    nextMonth,
    threeMonths,
    sixMonths
  };
}