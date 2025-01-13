import { DETECTION_PATTERNS, extractPrice, detectPlatformType, categorizeSubscription } from './detectionPatterns';

interface DetectedSubscription {
  service_name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  category: string;
  url: string;
  is_trial: boolean;
  trial_duration?: number;
  trial_start_date?: string;
  trial_end_date?: string;
}

export class SubscriptionDetector {
  private document: Document;
  private url: string;
  private platform: string;

  constructor(document: Document, url: string) {
    this.document = document;
    this.url = url;
    this.platform = detectPlatformType(url, document.body.textContent || '');
  }

  public detect(): DetectedSubscription | null {
    const pageText = this.document.body.textContent || '';
    
    // Skip if no subscription indicators found
    if (!this.hasSubscriptionIndicators(pageText)) {
      return null;
    }

    // Extract subscription details
    const price = this.findPrice();
    if (!price) {
      return null;
    }

    const serviceName = this.findServiceName();
    const billingCycle = this.findBillingCycle();
    const category = categorizeSubscription(this.platform, pageText);
    const trialInfo = this.findTrialInfo();

    return {
      service_name: serviceName,
      price,
      billing_cycle: billingCycle,
      category,
      url: this.url,
      ...trialInfo
    };
  }

  private hasSubscriptionIndicators(text: string): boolean {
    const textLower = text.toLowerCase();
    
    // Check for subscription terms
    const hasSubscriptionTerm = DETECTION_PATTERNS.subscriptionTerms.some(term => 
      textLower.includes(term.toLowerCase())
    );

    // Check for payment terms
    const hasPaymentTerm = DETECTION_PATTERNS.paymentTerms.some(term => 
      textLower.includes(term.toLowerCase())
    );

    // Check for platform-specific indicators
    const hasPlatformIndicator = DETECTION_PATTERNS.platforms[this.platform as keyof typeof DETECTION_PATTERNS.platforms]?.selectors.some(selector => 
      this.document.querySelector(selector)
    );

    return hasSubscriptionTerm || hasPaymentTerm || hasPlatformIndicator;
  }

  private findPrice(): number | null {
    // Try platform-specific price elements first
    const platformSelectors = DETECTION_PATTERNS.platforms[this.platform as keyof typeof DETECTION_PATTERNS.platforms]?.selectors || [];
    
    for (const selector of platformSelectors) {
      const element = this.document.querySelector(selector);
      if (element) {
        const price = extractPrice(element.textContent || '');
        if (price) return price;
      }
    }

    // Try common price elements
    const priceElements = this.document.querySelectorAll(
      '[class*="price"], [id*="price"], [data-testid*="price"]'
    );

    for (const element of priceElements) {
      const price = extractPrice(element.textContent || '');
      if (price) return price;
    }

    // Try extracting from page text
    const pageText = this.document.body.textContent || '';
    return extractPrice(pageText);
  }

  private findServiceName(): string {
    // Try meta tags first
    const metaTitle = this.document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (metaTitle) {
      return this.cleanServiceName(metaTitle);
    }

    // Try document title
    if (this.document.title) {
      return this.cleanServiceName(this.document.title);
    }

    // Extract from domain
    const domain = new URL(this.url).hostname.replace('www.', '');
    return this.cleanServiceName(domain.split('.')[0]);
  }

  private cleanServiceName(name: string): string {
    return name
      .replace(/[^\w\s-]/g, '')
      .split(/[\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  private findBillingCycle(): 'monthly' | 'yearly' | 'quarterly' {
    const pageText = this.document.body.textContent?.toLowerCase() || '';
    
    if (pageText.includes('per year') || 
        pageText.includes('/year') || 
        pageText.includes('annually') ||
        pageText.includes('yearly')) {
      return 'yearly';
    }
    
    if (pageText.includes('quarterly') || 
        pageText.includes('every 3 months') || 
        pageText.includes('/quarter')) {
      return 'quarterly';
    }
    
    return 'monthly'; // Default to monthly
  }

  private findTrialInfo(): {
    is_trial: boolean;
    trial_duration?: number;
    trial_start_date?: string;
    trial_end_date?: string;
  } {
    const pageText = this.document.body.textContent || '';
    
    // Check for trial indicators
    const hasTrial = DETECTION_PATTERNS.trialTerms.some(term => 
      pageText.toLowerCase().includes(term.toLowerCase())
    );

    if (!hasTrial) {
      return { is_trial: false };
    }

    // Try to find trial duration
    const durationMatch = pageText.match(/(\d+)[-\s]?day(?:s)?\s+(?:free\s+)?trial/i);
    if (durationMatch) {
      const duration = parseInt(durationMatch[1]);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      return {
        is_trial: true,
        trial_duration: duration,
        trial_start_date: startDate.toISOString(),
        trial_end_date: endDate.toISOString()
      };
    }

    // Try to find explicit trial end date
    const endDateMatch = pageText.match(/trial\s+ends?\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
    if (endDateMatch) {
      const endDate = new Date(endDateMatch[1]);
      if (!isNaN(endDate.getTime())) {
        return {
          is_trial: true,
          trial_start_date: new Date().toISOString(),
          trial_end_date: endDate.toISOString()
        };
      }
    }

    return { is_trial: true };
  }
}