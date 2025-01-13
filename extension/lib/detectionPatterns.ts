// Subscription-related keywords and patterns
export const DETECTION_PATTERNS = {
  // Subscription Terms
  subscriptionTerms: [
    'subscription',
    'subscribe',
    'membership',
    'plan',
    'pricing',
    'billing',
    'renewal',
    'upgrade',
    'join now',
    'sign up',
    'get started'
  ],

  // Payment Terms
  paymentTerms: [
    'payment plan',
    'auto-renew',
    'recurring payment',
    'monthly charge',
    'annual fee',
    'per month',
    'per year',
    'charge',
    'invoice'
  ],

  // Trial & Discount Terms
  trialTerms: [
    'free trial',
    'trial period',
    'first month free',
    'cancel anytime',
    'introductory offer',
    'discount',
    'promo',
    'limited offer'
  ],

  // Usage Terms
  usageTerms: [
    'premium access',
    'exclusive content',
    'early access',
    'VIP membership',
    'pro plan',
    'basic plan',
    'plus',
    'ultimate'
  ],

  // Cancellation Terms
  cancellationTerms: [
    'cancel subscription',
    'end membership',
    'unsubscribe',
    'deactivate',
    'pause subscription',
    'opt out'
  ],

  // Price Patterns
  pricePatterns: [
    // Standard formats
    /\$\d+(\.\d{2})?\/(?:month|mo|year|yr|week|wk)/i,
    /\$\d+(\.\d{2})?(?:\s*\/\s*(?:month|mo|year|yr|week|wk))?/i,
    
    // International formats
    /(?:€|£|¥|₹)\s*\d+(\.\d{2})?(?:\s*\/\s*(?:month|mo|year|yr|week|wk))?/i,
    /\d+(\.\d{2})?\s*(?:€|£|¥|₹)(?:\s*\/\s*(?:month|mo|year|yr|week|wk))?/i,
    
    // Currency codes
    /(?:USD|EUR|GBP|JPY|INR)\s*\d+(\.\d{2})?/i,
    
    // Discounted pricing
    /was\s+(?:\$|€|£|¥|₹)\d+(\.\d{2})?\s+now\s+(?:\$|€|£|¥|₹)\d+(\.\d{2})?/i,
    /save\s+\d+%/i,
    /\d+%\s+off/i
  ],

  // Platform-specific patterns
  platforms: {
    patreon: {
      tiers: [
        'tier',
        'reward',
        'pledge',
        'patron',
        'benefits',
        'perks'
      ],
      selectors: [
        '[data-tag="pledge-card"]',
        '.pledge-card',
        '.tier-card',
        '[data-test-tag="patron-button"]'
      ]
    },
    tebex: {
      selectors: [
        '.package-listing',
        '.package-price',
        '.subscription-package',
        '[data-package-type="subscription"]'
      ],
      keywords: [
        'server subscription',
        'recurring package',
        'monthly rank',
        'subscription package'
      ]
    },
    saas: {
      tiers: [
        'basic',
        'pro',
        'enterprise',
        'starter',
        'business',
        'premium'
      ],
      selectors: [
        '.pricing-table',
        '.pricing-plan',
        '.pricing-tier',
        '[data-plan-type]'
      ]
    },
    streaming: {
      keywords: [
        'stream',
        'watch',
        'video',
        'movies',
        'shows',
        'live'
      ],
      plans: [
        'basic',
        'standard',
        'premium',
        'family plan',
        'student plan'
      ]
    }
  }
};

// Helper function to extract price from text
export function extractPrice(text: string): number | null {
  for (const pattern of DETECTION_PATTERNS.pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract numeric value
      const price = match[0].replace(/[^\d.]/g, '');
      const numericPrice = parseFloat(price);
      if (!isNaN(numericPrice)) {
        return numericPrice;
      }
    }
  }
  return null;
}

// Helper function to detect platform type
export function detectPlatformType(url: string, content: string): string {
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('patreon.com')) {
    return 'patreon';
  }
  
  if (domain.includes('tebex.io') || content.toLowerCase().includes('tebex')) {
    return 'tebex';
  }
  
  // Check for streaming platforms
  const streamingDomains = [
    'netflix.com',
    'disneyplus.com',
    'hulu.com',
    'amazon.com/prime',
    'youtube.com/premium'
  ];
  
  if (streamingDomains.some(d => domain.includes(d))) {
    return 'streaming';
  }
  
  // Default to SaaS if pricing page is detected
  if (url.toLowerCase().includes('pricing') || 
      content.toLowerCase().includes('pricing') ||
      DETECTION_PATTERNS.platforms.saas.tiers.some(t => 
        content.toLowerCase().includes(t))) {
    return 'saas';
  }
  
  return 'other';
}

// Helper function to categorize subscription
export function categorizeSubscription(platform: string, content: string): string {
  const contentLower = content.toLowerCase();
  
  if (platform === 'streaming' || 
      DETECTION_PATTERNS.platforms.streaming.keywords.some(k => 
        contentLower.includes(k))) {
    return 'streaming';
  }
  
  if (contentLower.includes('music') || 
      contentLower.includes('audio') || 
      contentLower.includes('spotify') || 
      contentLower.includes('soundcloud')) {
    return 'music';
  }
  
  if (contentLower.includes('game') || 
      contentLower.includes('gaming') || 
      platform === 'tebex') {
    return 'gaming';
  }
  
  if (contentLower.includes('cloud') || 
      contentLower.includes('storage') || 
      contentLower.includes('backup')) {
    return 'cloud';
  }
  
  if (contentLower.includes('productivity') || 
      contentLower.includes('business') || 
      contentLower.includes('work')) {
    return 'productivity';
  }
  
  if (contentLower.includes('software') || 
      contentLower.includes('app') || 
      platform === 'saas') {
    return 'software';
  }
  
  return 'other';
}