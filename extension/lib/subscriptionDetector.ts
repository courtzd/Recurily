console.log("🟢 Subscription Detector Loaded");

interface DetectionResult {
  type: string;
  content: string;
  url: string;
}

class SubscriptionDetector {
  private document: Document;
  private url: string;

  constructor(document: Document, url: string) {
    this.document = document;
    this.url = url;
  }

  detect(): DetectionResult | null {
    console.log("🔍 Scanning for subscription elements...");

    const subscriptionKeywords: string[] = [
      "subscribe", "membership", "pricing", "plan", "billing",
      "free trial", "subscription", "payment", "sign up", "join now"
    ];

    const pricePatterns: RegExp[] = [
      /\$\d+(\.\d{2})?\s*(per\s*month|monthly|mo)/i,
      /\$\d+(\.\d{2})?\s*(per\s*year|annually|yr)/i,
      /€\d+(\.\d{2})?/i,
      /£\d+(\.\d{2})?/i
    ];

    let detected: DetectionResult | null = null;

    // ✅ Detect subscription keywords
    subscriptionKeywords.forEach(keyword => {
      const elements = this.document.querySelectorAll<HTMLElement>('a, button, div, span, p');
      elements.forEach(element => {
        if (element.textContent && element.textContent.toLowerCase().includes(keyword)) {
          console.log(`🔍 Subscription keyword detected: "${keyword}" in`, element);

          // 🔴 Highlight detected elements for testing
          element.style.border = "2px solid red";
          element.style.backgroundColor = "rgba(255, 0, 0, 0.1)";

          detected = {
            type: "keyword",
            content: element.textContent.trim(),
            url: this.url
          };
        }
      });
    });

    // ✅ Detect pricing information
    const bodyText = this.document.body.innerText;
    pricePatterns.forEach(pattern => {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log(`💸 Pricing detected: "${matches[0]}"`);
        detected = {
          type: "price",
          content: matches[0],
          url: this.url
        };
      }
    });

    return detected;
  }
}

// ✅ Expose globally
(window as unknown as { SubscriptionDetector: typeof SubscriptionDetector }).SubscriptionDetector = SubscriptionDetector;

