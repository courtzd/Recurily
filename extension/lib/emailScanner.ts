import { DETECTION_PATTERNS } from './detectionPatterns';

interface EmailSubscription {
  service_name: string;
  price: number | null;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  next_billing_date: string | null;
  category: string;
}

interface EmailMessage {
  id: string;
  payload: {
    headers: { name: string; value: string }[];
    body: { data: string };
    parts?: EmailPart[];
  };
}

interface EmailPart {
  body: { data: string };
  parts?: EmailPart[];
}

export class EmailScanner {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async scanEmails(): Promise<EmailSubscription[]> {
    try {
      const query = 'subject:(subscription OR invoice OR billing OR renewal)';
      const messages = await this.searchEmails(query);

      if (!messages?.length) {
        return [];
      }

      const subscriptions: EmailSubscription[] = [];

      for (const message of messages) {
        const email = await this.getEmail(message.id);
        if (!email) continue;

        const subscription = this.extractSubscriptionInfo(email);
        if (subscription) {
          subscriptions.push(subscription);
        }
      }

      return subscriptions;
    } catch (error) {
      console.error('Error scanning emails:', error);
      throw error;
    }
  }

  private async searchEmails(query: string) {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search emails: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  }

  private async getEmail(messageId: string): Promise<EmailMessage> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get email: ${response.statusText}`);
    }

    return response.json();
  }

  private extractSubscriptionInfo(email: EmailMessage): EmailSubscription | null {
    const subject = this.getHeader(email, 'subject');
    const body = this.decodeBody(email);

    if (!subject || !body) {
      return null;
    }

    const isSubscriptionEmail = DETECTION_PATTERNS.subscriptionTerms.some(term =>
      subject.toLowerCase().includes(term.toLowerCase()) ||
      body.toLowerCase().includes(term.toLowerCase())
    );

    if (!isSubscriptionEmail) {
      return null;
    }

    const serviceName = this.extractServiceName(email, subject, body);
    if (!serviceName) {
      return null;
    }

    const price = this.extractPrice(body);
    const billingCycle = this.extractBillingCycle(body);
    const nextBillingDate = this.extractNextBillingDate(body);
    const category = this.categorizeSubscription(serviceName, body);

    return {
      service_name: serviceName,
      price,
      billing_cycle: billingCycle,
      next_billing_date: nextBillingDate,
      category
    };
  }

  private getHeader(email: EmailMessage, name: string): string | null {
    const header = email.payload.headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    );
    return header ? header.value : null;
  }

  private decodeBody(email: EmailMessage): string {
    let body = '';

    const extractParts = (part: EmailPart) => {
      if (part.body.data) {
        body += Buffer.from(part.body.data, 'base64').toString();
      }
      if (part.parts) {
        part.parts.forEach(extractParts);
      }
    };

    if (email.payload.body.data) {
      body = Buffer.from(email.payload.body.data, 'base64').toString();
    }
    if (email.payload.parts) {
      email.payload.parts.forEach(extractParts);
    }

    return body;
  }

  private extractServiceName(email: EmailMessage, subject: string, body: string): string | null {
    const subjectPatterns = [
      /Your\s+(.+?)\s+subscription/i,
      /(.+?)\s+invoice/i,
      /(.+?)\s+receipt/i,
      /Payment\s+confirmation\s+from\s+(.+)/i
    ];

    for (const pattern of subjectPatterns) {
      const match = subject.match(pattern);
      if (match?.[1]) {
        return this.cleanServiceName(match[1]);
      }
    }

    const fromHeader = this.getHeader(email, 'from');
    if (fromHeader) {
      const domainMatch = fromHeader.match(/@(.+?)\./i);
      if (domainMatch?.[1]) {
        return this.cleanServiceName(domainMatch[1]);
      }
    }

    return null;
  }

  private cleanServiceName(name: string): string {
    return name.replace(/[^\w\s-]/g, '').split(/[\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ').trim();
  }

  private extractPrice(body: string): number | null {
    for (const pattern of DETECTION_PATTERNS.pricePatterns) {
      const match = body.match(pattern);
      if (match) {
        const price = match[0].replace(/[^\d.]/g, '');
        const numericPrice = parseFloat(price);
        if (!isNaN(numericPrice)) {
          return numericPrice;
        }
      }
    }
    return null;
  }

  private extractBillingCycle(body: string): 'monthly' | 'yearly' | 'quarterly' {
    const text = body.toLowerCase();
    if (text.includes('per year') || text.includes('/year') || text.includes('annually')) return 'yearly';
    if (text.includes('quarterly') || text.includes('every 3 months')) return 'quarterly';
    return 'monthly';
  }

  private extractNextBillingDate(body: string): string | null {
    const datePatterns = [
      /next\s+billing\s+date:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i
    ];
    for (const pattern of datePatterns) {
      const match = body.match(pattern);
      if (match?.[1]) return new Date(match[1]).toISOString();
    }
    return null;
  }

  private categorizeSubscription(serviceName: string, body: string): string {
    const text = `${serviceName} ${body}`.toLowerCase();
    if (text.includes('stream')) return 'streaming';
    if (text.includes('music')) return 'music';
    return 'other';
  }
}
